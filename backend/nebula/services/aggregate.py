from typing import List, Dict, Any, Optional
import re
import numpy as np
import pandas as pd
from fastapi import HTTPException

# --- Ops & aliases ---
AGG_ALIASES = {
    "mean": {"mean", "average", "avg"},
    "median": {"median"},
    "sum": {"sum", "total"},
    "min": {"min", "minimum", "lowest", "smallest"},
    "max": {"max", "maximum", "highest", "largest"},
    "std": {"std", "stdev"},  # plus multiword: "standard deviation"
    "count": {"count", "length", "len"},
}
ALIAS_TO_OP = {alias: op for op, aliases in AGG_ALIASES.items() for alias in aliases}


def _tokenize_words(text: str):
    return re.findall(r"[a-zA-Z0-9_]+", (text or "").lower())


def _norm(s: str) -> str:
    """normalize: lowercase + drop non-alphanumerics (so 'Performance Score' == 'PerformanceScore')."""
    return "".join(ch for ch in (s or "").lower() if ch.isalnum())


def _normalize_op_from_text(text: str) -> Optional[str]:
    t = (text or "").lower()
    if re.search(r"\bstandard\s+deviation\b", t):
        return "std"
    tokens = set(_tokenize_words(text))
    for alias in ALIAS_TO_OP:
        if alias in tokens:
            return ALIAS_TO_OP[alias]
    return None


def _find_column_from_text(text: str, columns: List[str]) -> Optional[str]:
    """
    Make column detection robust to spaces/underscores/camelCase.
    - Try after 'of/for/on/column'
    - Then try quoted names
    - Then try any 1-3 token window anywhere in the text
    """
    if not text:
        return None

    norm_map = {_norm(c): c for c in columns}         # "performancescore" -> "PerformanceScore"
    t = (text or "").lower()

    # 1) After keywords
    for kw in [" of ", " for ", " on ", " column "]:
        if kw in t:
            tail = t.split(kw, 1)[1]
            # try quoted first
            m = re.match(r"\s*['\"]([^'\"]+)['\"]", tail)
            if m:
                cand = _norm(m.group(1))
                if cand in norm_map:
                    return norm_map[cand]
            # else, try up to 3 tokens joined
            toks = _tokenize_words(tail)
            for n in range(min(3, len(toks)), 0, -1):
                cand = _norm(" ".join(toks[:n]))
                if cand in norm_map:
                    return norm_map[cand]

    # 2) Anywhere quoted
    for m in re.finditer(r"['\"]([^'\"]+)['\"]", t):
        cand = _norm(m.group(1))
        if cand in norm_map:
            return norm_map[cand]

    # 3) Any 1-3 token window anywhere
    toks = _tokenize_words(t)
    for i in range(len(toks)):
        for n in (3, 2, 1):
            if i + n <= len(toks):
                cand = _norm(" ".join(toks[i:i+n]))
                if cand in norm_map:
                    return norm_map[cand]

    return None


def _compute_aggregate(op: str, s: pd.Series) -> float | int:
    valid = pd.to_numeric(s, errors="coerce").dropna()
    if op != "count" and valid.empty:
        raise HTTPException(status_code=400, detail="Selected column has no numeric values to aggregate.")
    if op == "mean":
        return float(valid.mean())
    if op == "median":
        return float(valid.median())
    if op == "sum":
        return float(valid.sum())
    if op == "min":
        return float(valid.min())
    if op == "max":
        return float(valid.max())
    if op == "std":
        return float(valid.std(ddof=1))
    if op == "count":
        return int(s.count())
    raise HTTPException(status_code=400, detail=f"Unsupported aggregation '{op}'.")


def aggregate_payload(message: str, df: pd.DataFrame) -> List[Dict[str, Any]]:
    if df.empty:
        raise HTTPException(status_code=400, detail="No data available.")

    op = _normalize_op_from_text(message)
    if not op:
        raise HTTPException(status_code=400, detail="Specify an aggregation (mean/median/sum/min/max/std/count).")

    col = _find_column_from_text(message, list(df.columns))
    if not col:
        raise HTTPException(status_code=400, detail="Specify a column, e.g., 'mean of Age'.")

    if col not in df.columns:
        raise HTTPException(status_code=400, detail=f"Column '{col}' not found.")

    val = _compute_aggregate(op, df[col])
    title = f"{op.title()} of {col}"
    metric_data = {op: round(val, 3) if isinstance(val, float) and not np.isnan(val) else val}

    if op == "count":
        details = f"Non-null **count** of **{col}** is **{val}**."
    else:
        n = int(pd.to_numeric(df[col], errors='coerce').dropna().shape[0])
        details = f"Computed **{op}** over **{col}** on {n} rows (numeric-only conversion)."

    return [
        {"type": "metric", "title": title, "data": metric_data},
        {"type": "text", "title": "How computed", "data": {"markdown": details}},
    ]
