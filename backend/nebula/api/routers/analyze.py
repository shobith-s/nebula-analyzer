from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Optional, Any, Dict
import re, random
import math

# pandas & numpy for lightweight stats from preview
import pandas as pd
import numpy as np

from nebula.core.conversation import NeuralConversationEngine

router = APIRouter(prefix="", tags=["analyze"])
conv = NeuralConversationEngine()

# ---------- Schemas ----------
class MessagePayload(BaseModel):
    type: str
    title: Optional[str] = None
    data: Any

class Message(BaseModel):
    sender: str
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

class TabularPreview(BaseModel):
    headers: List[str]
    rows: List[List[Any]]

class AnalyzeContext(BaseModel):
    profile: Optional[ProfileSummary] = None
    tabular_preview: Optional[TabularPreview] = None   # NEW

class AnalyzeRequest(BaseModel):
    question: str
    context: Optional[AnalyzeContext] = None
    model_choice: Optional[str] = "local"              # NEW: 'gemini' | 'local'

class AnalyzeResponse(BaseModel):
    messages: List[Message]

# ---------- Plan (same as before) ----------
PLAN_STORE: Dict[str, Dict[str, Dict[str, Any]]] = {}
def build_recommended_plan(p: ProfileSummary) -> Dict[str, Dict[str, Any]]:
    plan: Dict[str, Dict[str, Any]] = {}
    n = max(1, p.n_rows or 1)
    for c in p.columns or []:
        miss = c.missing or 0
        miss_pct = (miss / n) * 100.0
        if c.dtype.lower() in ("int", "float", "numeric", "number"):
            if miss_pct == 0: strat = "none"
            elif miss_pct < 5: strat = "median" if (c.outliers or 0) > 0 else "mean"
            elif miss_pct < 25: strat = "knn"
            elif miss_pct < 50: strat = "median"
            else: strat = "drop"
        else:
            if miss_pct == 0: strat = "none"
            elif miss_pct < 40: strat = "mode"
            else: strat = "drop"
        plan[c.name] = {"dtype": c.dtype, "missing": miss, "missing_pct": round(miss_pct,1), "strategy": strat}
    return plan

def ensure_plan(filename: str, p: ProfileSummary):
    if filename not in PLAN_STORE:
        PLAN_STORE[filename] = build_recommended_plan(p)
    return PLAN_STORE[filename]

def plan_to_rows(plan: Dict[str, Dict[str, Any]]) -> List[dict]:
    rows = []
    for col, cfg in plan.items():
        rows.append({
            "column": col,
            "dtype": cfg.get("dtype","unknown"),
            "missing": cfg.get("missing",0),
            "missing_%": cfg.get("missing_pct",0.0),
            "strategy": cfg.get("strategy","none")
        })
    rows.sort(key=lambda r: (r["strategy"], -r["missing_%"]))
    return rows

# ---------- Helpers ----------
def to_df(preview: Optional[TabularPreview]) -> Optional[pd.DataFrame]:
    if not preview: return None
    df = pd.DataFrame(preview.rows, columns=preview.headers)
    # try numeric conversion
    for c in df.columns:
        df[c] = pd.to_numeric(df[c], errors="ignore")
    return df

def stats_block(p: ProfileSummary, plan: Dict[str, Dict[str, Any]]) -> str:
    lines = [f"- File: **{p.filename}**", f"- Rows: **{p.n_rows:,}**", f"- Columns: **{p.n_cols}**"]
    if p.quality_score is not None: lines.append(f"- Quality Score: **{round(p.quality_score,1)}**")
    if p.missing_total is not None: lines.append(f"- Missing (cells): **{p.missing_total:,}**")
    if p.duplicates_total is not None: lines.append(f"- Duplicates: **{p.duplicates_total:,}**")
    if plan:
        miss_sorted = sorted(plan.items(), key=lambda kv: kv[1].get("missing_pct",0), reverse=True)[:10]
        if miss_sorted:
            lines.append("- Highest missing% columns:")
            for name, cfg in miss_sorted:
                lines.append(f"  - {name}: {cfg.get('missing_pct',0)}% ({cfg.get('strategy')})")
    return "\n".join(lines)

def fake_heatmap(cols: List[str]) -> dict:
    size = min(8, len(cols) or 4)
    labels = cols[:size] if cols else [f"col{i+1}" for i in range(size)]
    z = []
    for i in range(size):
        row = []
        for j in range(size):
            row.append(1.0 if i == j else round(0.2 + 0.6 * random.random(), 2))
        z.append(row)
    return {"kind":"heatmap","x":labels,"y":labels,"z":z}

# Histogram from df[col]
def make_hist(df: pd.DataFrame, col: str, bins: int = 20):
    s = pd.to_numeric(df[col], errors="coerce").dropna()
    if len(s) == 0: return None
    counts, edges = np.histogram(s.to_numpy(), bins=bins)
    centers = ((edges[:-1] + edges[1:]) / 2).round(4).tolist()
    return {"kind":"hist","bins": centers, "counts": counts.tolist(), "label": col}

# Scatter from df[x], df[y]
def make_scatter(df: pd.DataFrame, x: str, y: str, max_points: int = 1000):
    sx = pd.to_numeric(df[x], errors="coerce")
    sy = pd.to_numeric(df[y], errors="coerce")
    mask = sx.notna() & sy.notna()
    pts = pd.DataFrame({"x": sx[mask], "y": sy[mask]}).sample(n=min(max_points, mask.sum()), random_state=42)
    return {"kind":"scatter","x": pts["x"].tolist(), "y": pts["y"].tolist(), "xLabel": x, "yLabel": y}

# Value counts (bar)
def make_value_counts(df: pd.DataFrame, col: str, top_k: int = 20):
    vc = df[col].astype(str).value_counts().head(top_k)
    return {"kind":"bar","x": vc.index.tolist(), "y": vc.values.tolist()}

# ---------- Intents ----------
RE_IMPUTE_COL        = re.compile(r"impute\s+(.+?)\s+with\s+(mean|median|mode|knn)", re.I)
RE_USE_FOR_NUMERIC   = re.compile(r"use\s+(mean|median|mode|knn)\s+for\s+numeric", re.I)
RE_DROP_COL          = re.compile(r"(?:drop|remove)\s+column\s+(.+)", re.I)
RE_SHOW_PLAN         = re.compile(r"(?:show|display)\s+(?:preprocessing|cleaning)\s+plan", re.I)
RE_RESET_PLAN        = re.compile(r"reset\s+(?:plan|preprocessing)", re.I)
RE_HIST              = re.compile(r"(?:histogram|hist)\s+(?:of\s+)?(.+)", re.I)
RE_SCATTER           = re.compile(r"(?:scatter)\s+(.+?)\s+(?:vs|against)\s+(.+)", re.I)
RE_VALUE_COUNTS      = re.compile(r"(?:value\s+counts|count\s+by|bar\s+count)\s+(?:of\s+)?(.+)", re.I)

@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(req: AnalyzeRequest):
    q = (req.question or "").strip()
    ctx = req.context or AnalyzeContext()
    p = ctx.profile
    if not p:
        return AnalyzeResponse(messages=[Message(sender="ai", payloads=[MessagePayload(type="text", title="Error", data={"markdown":"No profile provided."})])])

    df = to_df(ctx.tabular_preview)
    filename = p.filename
    plan = ensure_plan(filename, p)
    model_choice = (req.model_choice or "local").lower()

    messages: List[Message] = []

    # --- Plan intents (same behavior as earlier version) ---
    if RE_RESET_PLAN.search(q):
        PLAN_STORE[filename] = build_recommended_plan(p)
        plan = PLAN_STORE[filename]
        messages += [
            Message(sender="ai", payloads=[MessagePayload(type="text", title="Plan Reset", data={"markdown":"Preprocessing plan reset to defaults."})]),
            Message(sender="ai", payloads=[MessagePayload(type="table", title="Current Preprocessing Plan", data={"rows": plan_to_rows(plan)})])
        ]
        return AnalyzeResponse(messages=messages)

    if RE_SHOW_PLAN.search(q):
        explanation = conv.generate_response(
            query="Explain the current preprocessing plan and when to use each strategy.",
            stats_summary=stats_block(p, plan),
            model_choice=model_choice,   # <- SWITCHABLE
        )
        messages += [
            Message(sender="ai", payloads=[MessagePayload(type="text", title="Preprocessing Plan", data={"markdown": explanation})]),
            Message(sender="ai", payloads=[MessagePayload(type="table", title="Current Preprocessing Plan", data={"rows": plan_to_rows(plan)})])
        ]
        return AnalyzeResponse(messages=messages)

    m = RE_IMPUTE_COL.search(q)
    if m:
        col, method = m.group(1).strip().strip('`"'), m.group(2).lower()
        if col in plan:
            plan[col]["strategy"] = method
            PLAN_STORE[filename] = plan
            messages += [
                Message(sender="ai", payloads=[MessagePayload(type="text", title="Plan Updated", data={"markdown":f"Column **{col}** will be imputed using **{method}**."})]),
                Message(sender="ai", payloads=[MessagePayload(type="table", title="Current Preprocessing Plan", data={"rows": plan_to_rows(plan)})])
            ]
        else:
            messages.append(Message(sender="ai", payloads=[MessagePayload(type="text", title="Unknown Column", data={"markdown":f"Column **{col}** not found."})]))
        return AnalyzeResponse(messages=messages)

    m = RE_USE_FOR_NUMERIC.search(q)
    if m:
        method = m.group(1).lower()
        for col, cfg in plan.items():
            if cfg.get("dtype","").lower() in ("int","float","numeric","number") and cfg.get("strategy") != "drop":
                cfg["strategy"] = method
        PLAN_STORE[filename] = plan
        messages += [
            Message(sender="ai", payloads=[MessagePayload(type="text", title="Plan Updated", data={"markdown":f"All **numeric** columns will use **{method}** (unless dropped)."})]),
            Message(sender="ai", payloads=[MessagePayload(type="table", title="Current Preprocessing Plan", data={"rows": plan_to_rows(plan)})])
        ]
        return AnalyzeResponse(messages=messages)

    m = RE_DROP_COL.search(q)
    if m:
        col = m.group(1).strip().strip('`"')
        if col in plan:
            plan[col]["strategy"] = "drop"
            PLAN_STORE[filename] = plan
            messages += [
                Message(sender="ai", payloads=[MessagePayload(type="text", title="Plan Updated", data={"markdown":f"Column **{col}** will be **dropped**."})]),
                Message(sender="ai", payloads=[MessagePayload(type="table", title="Current Preprocessing Plan", data={"rows": plan_to_rows(plan)})])
            ]
        else:
            messages.append(Message(sender="ai", payloads=[MessagePayload(type="text", title="Unknown Column", data={"markdown":f"Column **{col}** not found."})]))
        return AnalyzeResponse(messages=messages)

    # --- Visual intents requiring data preview ---
    low = q.lower()
    if df is not None:
        m = RE_HIST.search(q)
        if m:
            col = m.group(1).strip().strip('`"')
            if col in df.columns and pd.api.types.is_numeric_dtype(pd.to_numeric(df[col], errors="coerce")):
                spec = make_hist(df, col)
                if spec:
                    explanation = conv.generate_response(
                        query=f"Explain a histogram for {col} and what to look for.",
                        stats_summary=stats_block(p, plan),
                        model_choice=model_choice,
                    )
                    messages += [
                        Message(sender="ai", payloads=[MessagePayload(type="text", title="Histogram", data={"markdown": explanation})]),
                        Message(sender="ai", payloads=[MessagePayload(type="chart", title=f"Histogram of {col}", data={"spec": spec})])
                    ]
                    return AnalyzeResponse(messages=messages)
            messages.append(Message(sender="ai", payloads=[MessagePayload(type="text", title="Histogram", data={"markdown": f"Column **{col}** is not numeric or not found."})]))
            return AnalyzeResponse(messages=messages)

        m = RE_SCATTER.search(q)
        if m:
            x, y = (m.group(1).strip().strip('`"'), m.group(2).strip().strip('`"'))
            if x in df.columns and y in df.columns:
                spec = make_scatter(df, x, y)
                explanation = conv.generate_response(
                    query=f"Explain a scatter plot of {x} vs {y} and how to interpret correlation.",
                    stats_summary=stats_block(p, plan),
                    model_choice=model_choice,
                )
                messages += [
                    Message(sender="ai", payloads=[MessagePayload(type="text", title="Scatter", data={"markdown": explanation})]),
                    Message(sender="ai", payloads=[MessagePayload(type="chart", title=f"Scatter: {x} vs {y}", data={"spec": spec})])
                ]
                return AnalyzeResponse(messages=messages)
            messages.append(Message(sender="ai", payloads=[MessagePayload(type="text", title="Scatter", data={"markdown": f"Columns **{x}**, **{y}** not found."})]))
            return AnalyzeResponse(messages=messages)

        m = RE_VALUE_COUNTS.search(q)
        if m:
            col = m.group(1).strip().strip('`"')
            if col in df.columns:
                spec = make_value_counts(df, col)
                explanation = conv.generate_response(
                    query=f"Explain a value-count bar chart for {col}.",
                    stats_summary=stats_block(p, plan),
                    model_choice=model_choice,
                )
                messages += [
                    Message(sender="ai", payloads=[MessagePayload(type="text", title="Value Counts", data={"markdown": explanation})]),
                    Message(sender="ai", payloads=[MessagePayload(type="chart", title=f"Value Counts: {col}", data={"spec": spec})])
                ]
                return AnalyzeResponse(messages=messages)
            messages.append(Message(sender="ai", payloads=[MessagePayload(type="text", title="Value Counts", data={"markdown": f"Column **{col}** not found."})]))
            return AnalyzeResponse(messages=messages)

    # --- Heatmap demo (no preview needed here; still random) ---
    if "heatmap" in low or "correlation" in low:
        cols = [c.name for c in (p.columns or [])]
        explanation = conv.generate_response(
            query="Explain a correlation heatmap and how to read it for this dataset.",
            stats_summary=stats_block(p, plan),
            model_choice=model_choice,
        )
        messages += [
            Message(sender="ai", payloads=[MessagePayload(type="text", title="Explanation", data={"markdown": explanation})]),
            Message(sender="ai", payloads=[MessagePayload(type="chart", title="Correlation Heatmap", data={"spec": fake_heatmap(cols)})])
        ]
        return AnalyzeResponse(messages=messages)

    if "top 5" in low or "top5" in low:
        rows = []
        for i, c in enumerate((p.columns or [])[:5]):
            rows.append({"rank": i+1, "column": c.name, "dtype": c.dtype, "missing": c.missing, "outliers": c.outliers})
        if not rows:
            rows = [{"rank": i+1, "column": f"col{i+1}", "dtype":"unknown", "missing":0, "outliers":0} for i in range(5)]
        explanation = conv.generate_response(
            query="Summarize the top columns and call out issues.",
            stats_summary=stats_block(p, plan),
            model_choice=model_choice,
        )
        messages += [
            Message(sender="ai", payloads=[MessagePayload(type="text", title="Summary", data={"markdown": explanation})]),
            Message(sender="ai", payloads=[MessagePayload(type="table", title="Top 5 Columns (demo)", data={"rows": rows})])
        ]
        return AnalyzeResponse(messages=messages)

    # --- Default: general Q&A with chosen model
    answer = conv.generate_response(
        query=q,
        stats_summary=stats_block(p, plan),
        model_choice=model_choice,
    )
    messages.append(Message(sender="ai", payloads=[MessagePayload(type="text", title="Answer", data={"markdown": answer})]))
    return AnalyzeResponse(messages=messages)
