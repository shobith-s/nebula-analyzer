from __future__ import annotations

import csv
import io
from collections import Counter
from statistics import mean, pstdev
from typing import List, Optional, Sequence

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field, ValidationError

router = APIRouter()


# -----------------------------
# Pydantic shapes we return
# -----------------------------
class ProfileColumn(BaseModel):
    name: str
    dtype: str                      # "numeric" | "categorical"
    missing: int = 0
    missing_pct: float = 0.0
    outliers: int = 0               # only for numeric; 0 for others


class ProfileSummary(BaseModel):
    filename: str
    n_rows: int
    n_cols: int
    columns: List[ProfileColumn] = Field(default_factory=list)
    duplicates: int = 0
    missing_total: int = 0
    quality_score: float = 0.0      # 0..100


# -----------------------------
# Shapes we accept from FE
# -----------------------------
class TabularData(BaseModel):
    headers: List[str]
    rows: List[List[str]]


class ProfileIn(BaseModel):
    filename: str
    tabular_data: TabularData


# -----------------------------
# Helpers
# -----------------------------
_MISSING_TOKENS = {"", "na", "n/a", "null", "none", "nan", "?", "-"}


def _is_missing(v: str) -> bool:
    return v.strip().lower() in _MISSING_TOKENS


def _to_float(v: str) -> Optional[float]:
    try:
        return float(v)
    except Exception:
        return None


def _infer_dtype(col_vals: Sequence[str]) -> str:
    """Very small heuristic: if ≥70% of non-missing values are numeric -> numeric."""
    non_missing = [v for v in col_vals if not _is_missing(v)]
    if not non_missing:
        return "categorical"
    numeric = [v for v in non_missing if _to_float(v) is not None]
    return "numeric" if (len(numeric) / len(non_missing)) >= 0.7 else "categorical"


def _zscore_outliers(nums: List[float], z: float = 3.0) -> int:
    """Count values with |z| > threshold. Uses population std; robust enough for preview."""
    if len(nums) < 3:
        return 0
    m = mean(nums)
    s = pstdev(nums)
    if s == 0:
        return 0
    return sum(1 for v in nums if abs((v - m) / s) > z)


def _compute_quality(n_rows: int, missing_total: int, outliers_total: int, duplicates: int) -> float:
    """Very simple quality score: 100 – weighted penalties."""
    if n_rows <= 0:
        return 0.0
    miss_rate = missing_total / (n_rows)  # per row approx; columns already rolled in
    out_rate = outliers_total / max(n_rows, 1)
    dup_rate = duplicates / max(n_rows, 1)

    # weights tuned for 'preview' purposes only
    score = 100.0
    score -= 35.0 * min(1.0, miss_rate)
    score -= 25.0 * min(1.0, out_rate)
    score -= 20.0 * min(1.0, dup_rate)
    return max(0.0, min(100.0, round(score, 1)))


def _profile(filename: str, headers: List[str], rows: List[List[str]]) -> ProfileSummary:
    n_rows = len(rows)
    n_cols = len(headers)
    cols: List[ProfileColumn] = []

    # Build columns as arrays for ease of stats
    by_col: List[List[str]] = [[] for _ in headers]
    for r in rows:
        # pad/trim row length defensively
        normalized = (r + [""] * n_cols)[:n_cols]
        for j, val in enumerate(normalized):
            by_col[j].append(val)

    outliers_total = 0
    missing_total = 0

    for name, values in zip(headers, by_col):
        dtype = _infer_dtype(values)
        miss = sum(1 for v in values if _is_missing(v))
        missing_total += miss

        out = 0
        if dtype == "numeric":
            nums = [_to_float(v) for v in values if not _is_missing(v)]
            nums = [v for v in nums if v is not None]
            out = _zscore_outliers(nums)
            outliers_total += out

        col = ProfileColumn(
            name=name,
            dtype=dtype,
            missing=miss,
            missing_pct=round((miss / n_rows) * 100.0, 2) if n_rows else 0.0,
            outliers=out,
        )
        cols.append(col)

    # duplicates (row-level)
    dup_count = 0
    if n_rows > 0:
        tuples = [tuple((r + [""] * n_cols)[:n_cols]) for r in rows]
        counts = Counter(tuples)
        dup_count = sum(c - 1 for c in counts.values() if c > 1)

    quality = _compute_quality(n_rows, missing_total, outliers_total, dup_count)

    return ProfileSummary(
        filename=filename,
        n_rows=n_rows,
        n_cols=n_cols,
        columns=cols,
        duplicates=dup_count,
        missing_total=missing_total,
        quality_score=quality,
    )


def _csv_to_tabular(content: bytes) -> TabularData:
    try:
        text = content.decode("utf-8", errors="replace")
        reader = csv.reader(io.StringIO(text))
        rows = list(reader)
        if not rows:
            raise ValueError("Empty CSV")
        headers = [h.strip() for h in rows[0]]
        data = [r for r in rows[1:]]
        return TabularData(headers=headers, rows=data)  # type: ignore[arg-type]
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"CSV parse error: {e}")


# -----------------------------
# Public endpoint
# -----------------------------
@router.post("/profile-data", response_model=ProfileSummary)
async def profile_data(
    request: Request,
    filename: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """
    Compatibility endpoint used by the FE:
    - **JSON (preferred)**:
        {
          "filename": "file.csv",
          "tabular_data": { "headers": [...], "rows": [[...], ...] }
        }
    - **Multipart fallback** with 'file' part (CSV).
    """
    # Try JSON first
    try:
        data = await request.json()
        body = ProfileIn(**data)  # raises ValidationError if shape wrong
        td = body.tabular_data

        if not td.headers:
            raise HTTPException(status_code=422, detail="tabular_data.headers is empty.")
        if any(not isinstance(r, list) for r in td.rows):
            raise HTTPException(status_code=422, detail="tabular_data.rows must be a list of lists.")
        print("[BE] /profile-data JSON ok:", {"filename": body.filename, "n_cols": len(td.headers), "n_rows": len(td.rows)})

        return _profile(body.filename, td.headers, td.rows)

    except ValidationError as ve:
        raise HTTPException(status_code=422, detail=ve.errors())
    except Exception:
        # fall through to multipart
        pass

    # Multipart CSV fallback
    if file is not None:
        content = await file.read()
        td = _csv_to_tabular(content)
        fname = filename or file.filename or "uploaded.csv"
        print("[BE] /profile-data CSV ok:", {"filename": fname, "n_cols": len(td.headers), "n_rows": len(td.rows)})
        return _profile(fname, td.headers, td.rows)

    raise HTTPException(status_code=422, detail="Provide JSON (filename+tabular_data) or a CSV file.")
