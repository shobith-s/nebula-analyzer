from __future__ import annotations
from typing import List, Dict, Any, Optional, Tuple
import re
import numpy as np
import pandas as pd
from fastapi import HTTPException
from scipy.stats import chi2_contingency, pearsonr, pointbiserialr


# ----------------------------
# Type helpers
# ----------------------------
def _is_numeric(s: pd.Series) -> bool:
    return pd.api.types.is_numeric_dtype(s)

def _series_type(s: pd.Series) -> str:
    return "num" if _is_numeric(s) else "cat"

def _safe_name(x) -> str:
    try:
        return str(x)
    except Exception:
        return repr(x)


# ----------------------------
# Association measures
# ----------------------------
def _pearson_num_num(a: pd.Series, b: pd.Series) -> float:
    x = pd.to_numeric(a, errors="coerce")
    y = pd.to_numeric(b, errors="coerce")
    m = x.notna() & y.notna()
    if m.sum() < 2:
        return np.nan
    r, _ = pearsonr(x[m], y[m])  # returns nan if constant
    return float(r)

def _point_biserial(bin_s: pd.Series, num_s: pd.Series) -> float:
    # bin_s should be 0/1; if not, we try to binarize if there are 2 unique values.
    s = bin_s.copy()
    uniq = pd.unique(s.dropna())
    if len(uniq) != 2:
        return np.nan
    # map to 0/1 deterministically
    mapping = {uniq[0]: 0, uniq[1]: 1}
    s = s.map(mapping)
    x = pd.to_numeric(num_s, errors="coerce")
    m = s.notna() & x.notna()
    if m.sum() < 2:
        return np.nan
    r, _ = pointbiserialr(s[m], x[m])
    return float(r)

def _cramers_v(cat_a: pd.Series, cat_b: pd.Series) -> float:
    # contingency
    try:
        table = pd.crosstab(cat_a, cat_b)
        if table.size == 0:
            return np.nan
        chi2, _, _, _ = chi2_contingency(table, correction=False)
        n = table.to_numpy().sum()
        if n == 0:
            return np.nan
        r, k = table.shape
        denom = n * (min(r, k) - 1)
        if denom <= 0:
            return np.nan
        v = np.sqrt(chi2 / denom)
        return float(v)
    except Exception:
        return np.nan

def _correlation_ratio(categories: pd.Series, measurements: pd.Series) -> float:
    # η = sqrt( between_group_ss / total_ss )
    x = pd.to_numeric(measurements, errors="coerce")
    y = categories
    m = x.notna() & y.notna()
    x = x[m]; y = y[m]
    if x.shape[0] < 2:
        return np.nan
    groups = [x[y == k].values for k in pd.unique(y)]
    if any(len(g) == 0 for g in groups):
        return np.nan
    grand_mean = x.mean()
    ss_between = sum(len(g) * (g.mean() - grand_mean) ** 2 for g in groups)
    ss_total = ((x - grand_mean) ** 2).sum()
    if ss_total <= 0:
        return np.nan
    eta = np.sqrt(ss_between / ss_total)
    return float(eta)


# ----------------------------
# Dispatcher
# ----------------------------
def _association(a: pd.Series, b: pd.Series) -> Tuple[str, float]:
    ta, tb = _series_type(a), _series_type(b)

    # num-num → Pearson r
    if ta == "num" and tb == "num":
        return "pearson_r", _pearson_num_num(a, b)

    # cat-cat → Cramér's V
    if ta == "cat" and tb == "cat":
        return "cramers_v", _cramers_v(a, b)

    # cat-num or num-cat
    if ta == "cat" and tb == "num":
        # if cat is actually binary, point-biserial tends to be nicer
        if pd.unique(a.dropna()).size == 2:
            return "point_biserial", _point_biserial(a, b)
        return "eta", _correlation_ratio(a, b)
    if ta == "num" and tb == "cat":
        if pd.unique(b.dropna()).size == 2:
            return "point_biserial", _point_biserial(b, a)
        return "eta", _correlation_ratio(b, a)

    return "unknown", np.nan


# ----------------------------
# Parsing helpers (optional column-pair queries)
# ----------------------------
def _norm(s: str) -> str:
    return "".join(ch for ch in (s or "").lower() if ch.isalnum())

def _match_col(fragment: str, columns: List[str]) -> Optional[str]:
    if not fragment:
        return None
    norm_map = {_norm(c): c for c in columns}
    cand = _norm(fragment)
    if cand in norm_map:
        return norm_map[cand]
    # substring fallback
    for c in columns:
        if _norm(c) in cand:
            return c
    return None

def _parse_pair_query(message: str, columns: List[str]) -> Tuple[Optional[str], Optional[str]]:
    """
    Try to extract a single pair: "correlation between A and B", "A vs B", "A with B" etc.
    Returns (col1, col2) or (None, None) if not found.
    """
    t = (message or "").lower()

    # common patterns
    pats = [
        r"between\s+([a-zA-Z0-9_ ]+)\s+and\s+([a-zA-Z0-9_ ]+)",
        r"of\s+([a-zA-Z0-9_ ]+)\s+and\s+([a-zA-Z0-9_ ]+)",
        r"([a-zA-Z0-9_ ]+)\s+vs\.?\s+([a-zA-Z0-9_ ]+)",
        r"([a-zA-Z0-9_ ]+)\s+with\s+([a-zA-Z0-9_ ]+)",
    ]
    for p in pats:
        m = re.search(p, t)
        if m:
            a = _match_col(m.group(1), columns)
            b = _match_col(m.group(2), columns)
            if a and b and a != b:
                return a, b
    return None, None


# ----------------------------
# Public API
# ----------------------------
def corr_payloads(df: pd.DataFrame, message: str = "") -> List[Dict[str, Any]]:
    """
    Returns payloads:
      - If a pair is specified -> a concise text + small table for that pair
      - Else -> top associations table + heatmap (mixed-type)
    """
    if df.empty:
        raise HTTPException(status_code=400, detail="No data available.")

    cols = list(df.columns)
    # Pair mode?
    c1, c2 = _parse_pair_query(message, cols)

    if c1 and c2:
        meth, score = _association(df[c1], df[c2])
        title = f"Association between {c1} and {c2}"
        explain = {
            "pearson_r": "Pearson r (−1..1, sign shows direction).",
            "cramers_v": "Cramér’s V (0..1, strength only).",
            "eta": "Correlation ratio η (0..1, strength only; categorical → numeric).",
            "point_biserial": "Point-biserial r (−1..1) for binary↔numeric.",
        }.get(meth, "Association score.")
        rows = [{"A": c1, "B": c2, "method": meth, "score": None if np.isnan(score) else round(float(score), 4)}]
        return [
            {"type": "text", "title": "Pairwise Correlation", "data": {"markdown": f"{title}: **{meth} = {round(float(score), 4) if not np.isnan(score) else 'n/a'}**.\n_{explain}_"}},
            {"type": "table", "title": "Pair Result", "data": {"rows": rows}},
        ]

    # Matrix mode
    # Limit to reasonable number of columns to keep it snappy
    MAX_COLS = 25
    use_cols = cols[:MAX_COLS]

    n = len(use_cols)
    mat = np.full((n, n), np.nan, dtype=float)
    methods = [["" for _ in range(n)] for __ in range(n)]

    for i in range(n):
        mat[i, i] = 1.0
        methods[i][i] = "self"
        for j in range(i + 1, n):
            mname, s = _association(df[use_cols[i]], df[use_cols[j]])
            mat[i, j] = mat[j, i] = s
            methods[i][j] = methods[j][i] = mname

    # Build top pairs table
    top_rows: List[Dict[str, Any]] = []
    for i in range(n):
        for j in range(i + 1, n):
            s = mat[i, j]
            if np.isnan(s):
                continue
            top_rows.append({
                "A": use_cols[i],
                "B": use_cols[j],
                "method": methods[i][j],
                "abs_score": round(abs(float(s)), 4),
                "score": round(float(s), 4),
            })
    top_rows.sort(key=lambda r: r["abs_score"], reverse=True)
    top_rows = top_rows[:30]

    # Heatmap payload (values as-is; sign matters for Pearson/point-biserial, others are [0..1])
    heatmap = {
        "kind": "heatmap",
        "x": use_cols,
        "y": use_cols,
        "z": [[(None if np.isnan(v) else float(v)) for v in row] for row in mat],
        "note": "Pearson r (num↔num), Cramér’s V (cat↔cat), η (cat→num), point-biserial (binary↔num).",
    }

    return [
        {"type": "text", "title": "Correlation (Mixed Types)", "data": {"markdown": "Computed mixed-type association matrix:\n- **num↔num**: Pearson r\n- **cat↔cat**: Cramér’s V\n- **cat→num**: correlation ratio η\n- **binary↔num**: point-biserial"}},
        {"type": "table", "title": "Top Associations", "data": {"rows": top_rows}},
        {"type": "chart", "title": "Association Heatmap", "data": heatmap},
    ]
