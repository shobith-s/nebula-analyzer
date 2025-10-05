from __future__ import annotations
from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple
import re
import numpy as np
import pandas as pd
from fastapi import HTTPException

# --- Aggregation aliases ---
AGG_ALIASES = {
    "mean": {"mean", "average", "avg"},
    "median": {"median"},
    "sum": {"sum", "total"},
    "min": {"min", "minimum", "lowest", "smallest"},
    "max": {"max", "maximum", "highest", "largest"},
    "std": {"std", "stdev", "standard deviation"},
    "count": {"count", "size"},
}
ALIAS_TO_OP = {alias: op for op, aliases in AGG_ALIASES.items() for alias in aliases}

def _norm(s: str) -> str:
    return "".join(ch for ch in (s or "").lower() if ch.isalnum())


@dataclass
class ParsedNL:
    op: Optional[str]                 # 'mean'|'median'|...|'count' or None
    target_col: Optional[str]         # e.g. 'Salary' (None allowed for count)
    group_cols: List[str]             # e.g. ['Department']
    where: Optional[str]              # raw where string
    sort_col: Optional[str]           # for "top/bottom/sort by"
    sort_asc: Optional[bool]          # True=asc, False=desc, None=unspecified
    top_n: Optional[int]              # N rows or N groups


# ------------------------
# Parsing helpers
# ------------------------
def _match_col_name(fragment: str, columns: List[str]) -> Optional[str]:
    if not fragment:
        return None
    norm_map = {_norm(c): c for c in columns}
    cand = _norm(fragment)
    if cand in norm_map:
        return norm_map[cand]
    for c in columns:
        if _norm(c) in cand:
            return c
    return None


def _find_op_and_target(msg: str, columns: List[str]) -> Tuple[Optional[str], Optional[str]]:
    """
    Find aggregation op and its target column.
    - Only capture a target when explicitly specified with "of/for/on",
      or when the token immediately after the op looks like a column *and*
      is not a control word ('by', 'where', 'group', 'top', 'sort', 'order').
    - 'count by Department' => ('count', None)  (no target)
    - 'count of Salary by Department' => ('count', 'Salary')
    - 'mean Salary by Department' => ('mean', 'Salary')
    """
    t = (msg or "").lower()

    # explicit phrase
    if "standard deviation" in t:
        op = "std"
        m = re.search(r"standard\s+deviation\s+(?:of|for|on)\s+([a-zA-Z0-9_ ]+)", t)
        if m:
            col = _match_col_name(m.group(1).strip(), columns)
            return op, col
        return op, None

    m = re.search(r"\b(mean|average|avg|median|sum|min|max|std|stdev|count|size)\b", t)
    if not m:
        return None, None

    alias = m.group(1)
    op = ALIAS_TO_OP.get(alias, alias)
    tail = t[m.end():].strip()

    # 1) Prefer "of/for/on <col>" and stop before control words
    m2 = re.match(
        r"^(?:of|for|on)\s+([a-zA-Z0-9_ ]+?)\b(?=(?:\s+(?:group|by|where|top|sort|order)\b|$))",
        tail
    )
    if m2:
        col = _match_col_name(m2.group(1).strip(), columns)
        return op, col

    # 2) Allow "mean Salary" (but not "count by ...")
    m3 = re.match(
        r"^([a-zA-Z0-9_ ]+?)\b(?=(?:\s+(?:group|by|where|top|sort|order)\b|$))",
        tail
    )
    if m3 and op != "count":
        col = _match_col_name(m3.group(1).strip(), columns)
        if col:
            return op, col

    # default: op only
    if op == "count":
        return "count", None
    return op, None


def _extract_groupby_cols(msg: str, columns: List[str]) -> List[str]:
    t = (msg or "").lower()
    m = re.search(r"group\s+by\s+([a-zA-Z0-9_,\s]+)", t)
    if m:
        raw = m.group(1)
        parts = [p.strip() for p in raw.split(",") if p.strip()]
        cols = []
        for p in parts:
            c = _match_col_name(p, columns)
            if c and c not in cols:
                cols.append(c)
        return cols

    m = re.search(r"\bby\s+([a-zA-Z0-9_,\s]+)", t)
    if m:
        raw = m.group(1)
        parts = [p.strip() for p in raw.split(",") if p.strip()]
        cols = []
        for p in parts:
            c = _match_col_name(p, columns)
            if c and c not in cols:
                cols.append(c)
        return cols
    return []


def _extract_top_or_sort(msg: str, columns: List[str]) -> Tuple[Optional[int], Optional[str], Optional[bool]]:
    t = (msg or "").lower()

    m = re.search(r"\b(top|largest|highest)\s+(\d+)", t)
    if m:
        n = int(m.group(2))
        m2 = re.search(r"\bby\s+([a-zA-Z0-9_ ]+)", t)
        col = _match_col_name(m2.group(1), columns) if m2 else None
        return n, col, False  # descending

    m = re.search(r"\b(bottom|smallest|lowest)\s+(\d+)", t)
    if m:
        n = int(m.group(2))
        m2 = re.search(r"\bby\s+([a-zA-Z0-9_ ]+)", t)
        col = _match_col_name(m2.group(1), columns) if m2 else None
        return n, col, True   # ascending

    m = re.search(r"\b(sort|order)\s+by\s+([a-zA-Z0-9_ ]+)\s*(asc|desc)?", t)
    if m:
        col = _match_col_name(m.group(2), columns)
        asc = None
        if m.group(3):
            asc = (m.group(3).lower() == "asc")
        return None, col, asc

    return None, None, None


def _split_conditions(where_text: str) -> List[Tuple[str, str, str, str]]:
    s = (where_text or "").strip()
    if not s:
        return []
    tokens = re.split(r"\s+(and|or)\s+", s, flags=re.IGNORECASE)
    chunks = []
    connector = "and"
    i = 0
    while i < len(tokens):
        part = tokens[i].strip()
        if part.lower() in ("and", "or"):
            connector = part.lower()
            i += 1
            continue
        chunks.append((connector, part))
        connector = "and"
        i += 1

    conds: List[Tuple[str, str, str, str]] = []
    for conn, expr in chunks:
        m = re.match(
            r"^\s*([a-zA-Z0-9_ ]+?)\s*(>=|<=|!=|==|=|>|<|contains|starts with|ends with|in)\s*(.+?)\s*$",
            expr,
            flags=re.IGNORECASE,
        )
        if not m:
            conds.append((conn, "", "", expr))
            continue
        col, op, val = m.group(1).strip(), m.group(2).strip().lower(), m.group(3).strip()
        conds.append((conn, col, op, val))
    return conds


def _as_value(val: str):
    if (val.startswith(("'", '"')) and val.endswith(("'", '"'))) and len(val) >= 2:
        return val[1:-1]
    try:
        f = float(val.replace(",", ""))
        return f
    except Exception:
        pass
    return val


def _apply_filters(df: pd.DataFrame, where_text: Optional[str]) -> pd.DataFrame:
    if not where_text:
        return df
    conds = _split_conditions(where_text)
    if not conds:
        return df

    norm_map = {_norm(c): c for c in df.columns}
    mask = pd.Series(True, index=df.index)
    matched_any = False

    def series_for(col_raw: str) -> Optional[pd.Series]:
        nonlocal matched_any
        c = norm_map.get(_norm(col_raw))
        if c is None:
            return None
        matched_any = True
        return df[c]

    def make_condition(s: pd.Series, op: str, val_raw: str) -> pd.Series:
        v = _as_value(val_raw)
        if op in (">=", "<=", ">", "<", "==", "!=","="):
            if op == "=":
                op = "=="
            if isinstance(v, (int, float)):
                a = pd.to_numeric(s, errors="coerce")
                b = float(v)
            else:
                a = s.astype(str)
                b = str(v)
            if op == ">=": return a >= b
            if op == "<=": return a <= b
            if op == ">":  return a > b
            if op == "<":  return a < b
            if op == "==": return a == b
            if op == "!=": return a != b
        elif op == "contains":
            return s.astype(str).str.contains(str(v), na=False, case=False)
        elif op == "starts with":
            return s.astype(str).str.startswith(str(v), na=False)
        elif op == "ends with":
            return s.astype(str).str.endswith(str(v), na=False)
        elif op == "in":
            vals = [x.strip().strip("'\"") for x in re.split(r"[(),]", str(v)) if x.strip()]
            return s.astype(str).isin(vals)
        return pd.Series(False, index=s.index)

    m = mask.copy()
    for conn, col_raw, op, val in conds:
        s = series_for(col_raw)
        if s is None or not op:
            part = pd.Series(False, index=df.index)
        else:
            part = make_condition(s, op, val)

        if conn == "and":
            m = m & part
        else:
            m = m | part

    if not matched_any:
        raise HTTPException(status_code=400, detail="Filter references unknown columns. Use column names as in the file.")

    return df[m]


# ------------------------
# Public API
# ------------------------
def parse_groupop_message(message: str, columns: List[str]) -> ParsedNL:
    t = message or ""
    where = None
    m_where = re.search(r"\bwhere\b(.+)$", t, flags=re.IGNORECASE)
    if m_where:
        where = m_where.group(1).strip()

    op, target = _find_op_and_target(t, columns)
    group_cols = _extract_groupby_cols(t, columns)
    top_n, sort_col, sort_asc = _extract_top_or_sort(t, columns)

    # Disambiguate: "top N by X" accidentally captured as group-by
    if not op and top_n and group_cols and sort_col and group_cols == [sort_col]:
        group_cols = []

    return ParsedNL(
        op=op,
        target_col=target,
        group_cols=group_cols,
        where=where,
        sort_col=sort_col,
        sort_asc=sort_asc,
        top_n=top_n,
    )


def group_query_payloads(message: str, df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Execute parsed group/filter/sort intent and return payloads:
    - table (always)
    - chart: bar (if single group key + numeric metric)
    """
    if df.empty:
        raise HTTPException(status_code=400, detail="No data available.")
    parsed = parse_groupop_message(message, list(df.columns))

    # Step 1: filter
    df2 = _apply_filters(df, parsed.where)

    outputs: List[Dict[str, Any]] = []

    # -------- A) Aggregation (with optional group-by and top/sort) --------
    if parsed.op or parsed.group_cols:
        op = parsed.op or "count"
        group_cols = parsed.group_cols or []

        # Special handling for COUNT:
        # - "count by Dept"       -> size()
        # - "count of Salary ..." -> count non-null Salary
        if op == "count" and (parsed.target_col is None or parsed.target_col in group_cols):
            if not group_cols:
                val = int(df2.shape[0])
                outputs.append({"type": "metric", "title": "Row Count", "data": {"count": val}})
                return outputs
            res = df2.groupby(group_cols).size().reset_index(name="count")
            metric_col = "count"

        elif op == "count" and parsed.target_col:
            target = parsed.target_col
            if target not in df2.columns:
                raise HTTPException(status_code=400, detail=f"Target '{target}' not found.")
            metric_col = f"count_{target}"
            if group_cols:
                # named aggregation avoids duplicate column names
                res = df2.groupby(group_cols).agg(**{metric_col: (target, "count")}).reset_index()
            else:
                res = pd.DataFrame({metric_col: [int(df2[target].count())]})

        else:
            # Numeric aggregations (mean/median/sum/min/max/std)
            target = parsed.target_col
            if not target or target not in df2.columns:
                raise HTTPException(status_code=400, detail="Specify a valid target column for the aggregation.")
            vals = pd.to_numeric(df2[target], errors="coerce")
            df2 = df2.copy()
            df2[target] = vals
            metric_col = f"{op}_{target}"
            if group_cols:
                res = df2.groupby(group_cols).agg(**{metric_col: (target, op)}).reset_index()
            else:
                agg_value = getattr(vals, op)()
                res = pd.DataFrame({metric_col: [agg_value]})

        # optional sort/top
        sort_col = parsed.sort_col or (metric_col if metric_col in res.columns else None)
        if sort_col and sort_col in res.columns:
            asc = True if parsed.sort_asc is True else False if parsed.sort_asc is False else False
            res = res.sort_values(by=sort_col, ascending=asc)
        if parsed.top_n:
            res = res.head(parsed.top_n)

        # table payload
        table_rows = res.to_dict("records")
        title_core = (
            f"{op.title()} of {parsed.target_col}" if (op != "count" or parsed.target_col)
            else "Count"
        )
        if group_cols:
            title_core += f" by {', '.join(group_cols)}"
        if parsed.where:
            title_core += " (filtered)"

        outputs.append({"type": "table", "title": title_core, "data": {"rows": table_rows}})

        # chart payload (single group key + numeric metric)
        if group_cols and len(group_cols) == 1 and metric_col in res.columns and res.shape[0] <= 50:
            key = group_cols[0]
            bar = {
                "kind": "bar",
                "x": res[key].astype(str).tolist(),
                "y": [float(v) if v is not None else None for v in res[metric_col].tolist()],
            }
            outputs.append({"type": "chart", "title": f"{title_core} (bar)", "data": bar})

        return outputs

    # -------- B) Row sort / top-N (no aggregation) --------
    if parsed.sort_col:
        if parsed.sort_col not in df2.columns:
            raise HTTPException(status_code=400, detail=f"Column '{parsed.sort_col}' not found for sorting.")
        col = parsed.sort_col
        s_num = pd.to_numeric(df2[col], errors="coerce")
        if s_num.notna().sum() > 0:
            df2 = df2.assign(_sort_col_=s_num)
            sort_key = "_sort_col_"
        else:
            sort_key = col
        asc = True if parsed.sort_asc is True else False if parsed.sort_asc is False else False
        df2 = df2.sort_values(by=sort_key, ascending=asc, na_position="last")
        if parsed.top_n:
            df2 = df2.head(parsed.top_n)
        res = df2.drop(columns=[c for c in ["_sort_col_"] if c in df2.columns]).head(50)
        outputs.append({
            "type": "table",
            "title": f"{'Top' if not asc else 'Bottom'} {parsed.top_n or res.shape[0]} rows by {col}" + (" (filtered)" if parsed.where else ""),
            "data": {"rows": res.to_dict("records")}
        })
        return outputs

    # Unresolved
    raise HTTPException(status_code=400, detail="Could not parse your request. Try e.g. 'average Salary by Department', 'top 10 rows by Salary', or 'median Salary by Department where Age > 40'.")
