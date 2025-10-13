# backend/nebula/api/routers/analyze.py
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Any
import math
import random

router = APIRouter(prefix="", tags=["analyze"])

# ---------- Schemas that match frontend/types.ts ----------
class MessagePayload(BaseModel):
    type: str                      # 'text' | 'table' | 'chart' | 'metric'
    title: Optional[str] = None
    data: Any

class Message(BaseModel):
    sender: str                    # 'user' | 'ai'
    text: Optional[str] = None
    payloads: Optional[List[MessagePayload]] = None

class ColumnProfile(BaseModel):
    name: str
    dtype: str = "unknown"
    missing: int = 0
    outliers: int = 0

class ProfileSummary(BaseModel):
    filename: str
    n_rows: int
    n_cols: int
    columns: Optional[List[ColumnProfile]] = []
    quality_score: Optional[float] = None
    missing_total: Optional[int] = None
    duplicates_total: Optional[int] = None
    suggestions: Optional[List[str]] = None
    anomalies: Optional[dict] = None

class AnalyzeContext(BaseModel):
    profile: Optional[ProfileSummary] = None

class AnalyzeRequest(BaseModel):
    question: str
    context: Optional[AnalyzeContext] = None

class AnalyzeResponse(BaseModel):
    messages: List[Message]

# ---------- Helpers ----------
def fake_heatmap(cols: List[str]) -> dict:
    # Small symmetric matrix just for demo
    size = min(8, len(cols) or 4)
    labels = cols[:size] if cols else [f"col{i+1}" for i in range(size)]
    z = []
    for i in range(size):
        row = []
        for j in range(size):
            if i == j:
                val = 1.0
            else:
                val = round(0.2 + 0.6 * random.random(), 2)
            row.append(val)
        z.append(row)
    return {
        "kind": "heatmap",
        "x": labels,
        "y": labels,
        "z": z,
    }

def top5_table(profile: ProfileSummary) -> List[dict]:
    # Demo table using columns list only (no real data sorting in MVP)
    rows = []
    for i, c in enumerate((profile.columns or [])[:5]):
        rows.append({
            "rank": i + 1,
            "column": c.name,
            "dtype": c.dtype,
            "missing": c.missing,
            "outliers": c.outliers
        })
    if not rows:
        rows = [{"rank": i+1, "column": f"col{i+1}", "dtype": "unknown", "missing": 0, "outliers": 0} for i in range(5)]
    return rows

# ---------- Route ----------
@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    q = (req.question or "").lower()
    profile = req.context.profile if req.context and req.context.profile else None
    filename = profile.filename if profile else "dataset.csv"
    columns = [c.name for c in (profile.columns or [])]

    messages: List[Message] = []

    # Basic branching
    if "heatmap" in q or "correlation" in q:
        messages.append(Message(
            sender="ai",
            payloads=[
                MessagePayload(
                    type="chart",
                    title="Correlation Heatmap",
                    data={"spec": fake_heatmap(columns)}
                )
            ]
        ))
    elif "top 5" in q or "top5" in q or "top five" in q:
        messages.append(Message(
            sender="ai",
            payloads=[
                MessagePayload(
                    type="table",
                    title="Top 5 columns (demo)",
                    data={"rows": top5_table(profile or ProfileSummary(filename=filename, n_rows=0, n_cols=0))}
                )
            ]
        ))
    else:
        # default summary
        stats_lines = [
            f"**File:** {filename}",
            f"**Rows:** {profile.n_rows if profile else '—'}",
            f"**Columns:** {profile.n_cols if profile else '—'}",
        ]
        if profile and profile.quality_score is not None:
            stats_lines.append(f"**Quality Score:** {round(profile.quality_score, 1)}")
        md = " \n".join(stats_lines)
        messages.append(Message(
            sender="ai",
            payloads=[
                MessagePayload(type="text", title="Summary", data={"markdown": md})
            ]
        ))

    return AnalyzeResponse(messages=messages)
