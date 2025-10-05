import re
from typing import Iterable
import numpy as np
import pandas as pd

NA_TOKENS = {
    "", "na", "n/a", "null", "none", "-", "--", "nan", "n.a.", "n.a", "n\\a", "?", "missing"
}

_currency = re.compile(r"^[\s₹$€£¥]+|[\s₹$€£¥]+$")
_thousands = re.compile(r"(?<=\d)[,_](?=\d)")     # 1,234 or 1_234
_percent = re.compile(r"\s*%$")
_spaces = re.compile(r"\s+")

def _maybe_numeric(s: str) -> float | None:
    """Try to coerce common numeric-ish strings to float."""
    if s is None:
        return None
    if not isinstance(s, str):
        try:
            return float(s)  # already numeric
        except Exception:
            return None

    t = s.strip()
    if not t:
        return None
    tl = t.lower()
    if tl in NA_TOKENS:
        return None

    # strip currency symbols at ends
    t = _currency.sub("", t)

    # percentage
    perc = False
    if _percent.search(t):
        perc = True
        t = _percent.sub("", t)

    # normalize thousands separators
    t = _thousands.sub("", t)

    # collapse spaces
    t = _spaces.sub("", t)

    # allow leading +/-
    if re.fullmatch(r"[+\-]?\d+(\.\d+)?", t):
        try:
            val = float(t)
            return val / 100.0 if perc else val
        except Exception:
            return None
    return None

def sanitize_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Trim headers/cells, drop blank rows, and coerce numeric-like strings where majority matches."""
    if df.empty:
        return df

    # Clean column names
    new_cols = []
    for c in df.columns:
        c = "" if c is None else str(c)
        c = c.replace("\ufeff", "")   # BOM
        c = re.sub(r"\s+", " ", c).strip()
        new_cols.append(c)
    df = df.copy()
    df.columns = new_cols

    # Trim strings and normalize NA tokens
    for col in df.columns:
        if df[col].dtype == object or pd.api.types.is_string_dtype(df[col]):
            df[col] = df[col].astype(str).str.replace("\u00A0", " ", regex=False).str.strip()
            df[col] = df[col].replace(to_replace=list(NA_TOKENS), value=np.nan)

    # Drop fully empty rows
    df = df.dropna(how="all")

    # Numeric coercion where a majority of non-null cells are numeric-ish
    for col in df.columns:
        series = df[col]
        if series.isna().all():
            continue
        # Detect numeric-ish
        numish_mask = series.dropna().astype(str).apply(lambda x: _maybe_numeric(x) is not None)
        if numish_mask.sum() >= max(1, int(0.5 * numish_mask.shape[0])):  # majority rule
            coerced = series.astype(object).apply(_maybe_numeric)
            df[col] = pd.to_numeric(coerced, errors="coerce")

    return df
