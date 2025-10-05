from typing import List, Dict, Any, Optional, Tuple
from fastapi import APIRouter, HTTPException
import numpy as np
import pandas as pd

from nebula.core.state import brain  # shared brain

from nebula.services.dataset_store import STORE
from nebula.services.profile import profile_payloads
from nebula.services.correlate import corr_payloads
from nebula.services.features import feature_importance_payloads
from nebula.services.aggregate import aggregate_payload
from nebula.services.groupops import group_query_payloads  # NEW
from nebula.services.groupops import parse_groupop_message  # for deterministic insight
from nebula.services.clean import sanitize_dataframe

router = APIRouter()

# ------------------------
# Helpers
# ------------------------
def _df_from_tabular(tabular_data: List[List[Any]]) -> pd.DataFrame:
    if not tabular_data or len(tabular_data) < 2:
        raise HTTPException(400, "Incomplete tabular_data (need headers + rows).")
    headers, rows = tabular_data[0], tabular_data[1:]
    return pd.DataFrame(rows, columns=headers)

def _basic_stats(df: pd.DataFrame) -> str:
    num = df.select_dtypes(include="number")
    return "No numeric columns available." if num.empty else num.describe().to_string()

def _top_abs_correlations(df: pd.DataFrame, k: int = 3) -> List[Tuple[str, str, float]]:
    num = df.select_dtypes(include="number")
    if num.empty or num.shape[1] < 2:
        return []
    corr = num.corr().abs()
    cols = corr.columns
    pairs: List[Tuple[str, str, float]] = []
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            pairs.append((cols[i], cols[j], float(corr.iat[i, j])))
    pairs.sort(key=lambda x: x[2], reverse=True)
    return pairs[:k]

def _xai_from_outputs(outputs: List[Dict[str, Any]]) -> str:
    for o in outputs:
        if o.get("type") == "table" and o.get("title") == "Importance Scores":
            rows = o.get("data", {}).get("rows", [])
            top3 = [r.get("feature") for r in rows[:3]]
            if top3:
                return "Top important features: " + ", ".join(f"'{t}'" for t in top3) + "."
    return ""

# ------------------------
# Intent parsing
# ------------------------
def _parse_intent(msg: str) -> str:
    t = (msg or "").lower()
    if any(w in t for w in ["summary", "describe", "overview", "profile", "desc"]):
        return "summary"
    if "correlation" in t or "corr" in t or "heatmap" in t:
        return "correlation"
    if "feature importance" in t or ("importance" in t and "feature" in t):
        return "feature_importance"
    if any(w in t for w in ["mean", "average", "avg", "median", "sum", "min", "max", "std", "standard deviation", "count"]):
        # might be aggregate OR group-by aggregate; we’ll disambiguate below
        if " by " in t or "group by" in t or " where " in t:
            return "groupops"
        return "aggregate"
    # group/filter/sort without explicit op
    if " group by " in t or "groupby" in t or " where " in t or " top " in t or " sort by " in t or " order by " in t:
        return "groupops"
    if ("train" in t) or ("fit" in t and "model" in t):
        return "train"
    return "unknown"

# ------------------------
# Deterministic narratives (now includes groupops)
# ------------------------
def _deterministic_insight(intent: str, df: pd.DataFrame, outputs: List[Dict[str, Any]], user_msg: str) -> str:
    if intent == "summary":
        rows, cols = len(df), len(df.columns)
        miss = df.isna().mean()
        nonzero = miss[miss > 0].sort_values(ascending=False)
        missing_part = (
            ", ".join(f"{c}: {round(float(v)*100, 1)}%" for c, v in nonzero.head(5).items())
            if not nonzero.empty else "No missing values."
        )
        num_cols = df.select_dtypes(include="number").columns.tolist()
        num_part = (
            f"{len(num_cols)} numeric column(s): " + ", ".join(num_cols[:6]) + ("…" if len(num_cols) > 6 else "")
            if num_cols else "No numeric columns."
        )
        return f"{rows} rows × {cols} columns. {missing_part} {num_part}"
    if intent == "correlation":
        pairs = _top_abs_correlations(df, k=3)
        if not pairs:
            return "Not enough numeric columns to compute correlations."
        pretty = ", ".join(f"{a}–{b}: r≈{v:.2f}" for a, b, v in pairs)
        return f"Strongest absolute correlations among numeric columns: {pretty}."

    if intent == "feature_importance":
        xai = _xai_from_outputs(outputs)
        return xai or "Computed feature importances for the target."

    if intent == "aggregate":
        for o in outputs:
            if o.get("type") == "metric" and "title" in o:
                title = o["title"]
                val = list(o["data"].values())[0]
                return f"{title}: **{val}**."
        return "Computed aggregate."

    if intent == "groupops":
        # Summarize using the parsed structure + outputs
        parsed = parse_groupop_message(user_msg, list(df.columns))
        # try to infer main table we just produced
        main_table = None
        for o in outputs:
            if o.get("type") == "table":
                main_table = o
                break
        brief = []
        if parsed.op:
            if parsed.op == "count" and not parsed.target_col:
                brief.append("Row counts" + (f" by {', '.join(parsed.group_cols)}" if parsed.group_cols else ""))
            else:
                brief.append(f"{parsed.op.title()} of {parsed.target_col}" + (f" by {', '.join(parsed.group_cols)}" if parsed.group_cols else ""))
        elif parsed.top_n and parsed.sort_col:
            brief.append(f"{'Top' if not parsed.sort_asc else 'Bottom'} {parsed.top_n} rows by {parsed.sort_col}")
        elif parsed.sort_col:
            brief.append(f"Sorted by {parsed.sort_col}")

        if parsed.where:
            brief.append("with filter")

        if main_table and main_table.get("data", {}).get("rows"):
            nrows = len(main_table["data"]["rows"])
            brief.append(f"returned {nrows} row(s)")

        return ". ".join(brief) + "."

    return ""

# ------------------------
# LLM helpers (unchanged)
# ------------------------
def _clean_text(text: str) -> str:
    if not text:
        return ""
    bad_starts = ("###", "Question:", "Answer:", "Note:")
    junk_phrases = ("Do not restate", "not to be taken", "the user should", "If the user asks")
    lines: List[str] = []
    for ln in text.splitlines():
        s = ln.strip()
        if not s:
            continue
        if s.startswith(bad_starts):
            continue
        if any(phrase.lower() in s.lower() for phrase in junk_phrases):
            continue
        lines.append(s)
        if len(lines) >= 12:
            break
    return "\n".join(lines)

def _extract_bullets(text: str, max_bullets: int = 2) -> List[str]:
    if not text:
        return []
    bullets: List[str] = []
    for ln in text.splitlines():
        s = ln.strip()
        if not s:
            continue
        if s.startswith(("- ", "• ", "* ")):
            s = s[2:].strip()
        bullets.append(s)
        if len(bullets) >= max_bullets:
            break
    return bullets

def _hybrid_narrative(
    intent: str,
    df: pd.DataFrame,
    outputs: List[Dict[str, Any]],
    user_msg: str,
    model_choice: str
) -> str:
    base = _deterministic_insight(intent, df, outputs, user_msg).strip()

    llm_bullets: List[str] = []
    stats = _basic_stats(df)
    xai = _xai_from_outputs(outputs)
    try:
        text = brain.think(
            query=user_msg,
            model_choice=model_choice,
            stats_summary=stats,
            trend_summary="Not performed.",
            anomaly_summary="Not performed.",
            xai_summary=xai or ""
        )
        text = _clean_text(text)
        llm_bullets = _extract_bullets(text, max_bullets=2)
    except Exception:
        llm_bullets = []

    if not base and not llm_bullets:
        return "Done."
    if base and not llm_bullets:
        return base
    if not base and llm_bullets:
        return " • " + "\n • ".join(llm_bullets)
    return f"{base}\n\n**AI notes:**\n- " + "\n- ".join(llm_bullets)

# ------------------------
# Router
# ------------------------
@router.post("/chat")
def chat(payload: Dict[str, Any]):
    """
    Accepts EITHER:
      - New flow: { dataset_id, message, model_choice?, narrative_mode? }
      - Legacy flow: { tabular_data, message, model_choice?, narrative_mode? }
    narrative_mode: "hybrid" (default) | "deterministic" | "llm"
    Returns: { intent, outputs: [ {type, title, data} ... ] }
    """
    message: str = payload.get("message", "")
    model_choice: str = payload.get("model_choice", "gemini")
    narrative_mode: str = payload.get("narrative_mode", "hybrid")

    # 1) Resolve DataFrame source
    df: Optional[pd.DataFrame] = None
    if payload.get("dataset_id"):
        try:
            df = STORE.get(payload["dataset_id"])
        except KeyError as e:
            raise HTTPException(404, str(e))
    elif payload.get("tabular_data"):
        df = _df_from_tabular(payload["tabular_data"])
    else:
        raise HTTPException(400, "Provide dataset_id (upload first) or include tabular_data in the request.")

    # Sanitize
    df = sanitize_dataframe(df)

    # 2) Intent & outputs
    intent = _parse_intent(message)
    outputs: List[Dict[str, Any]] = []

    if intent == "summary":
        outputs += profile_payloads(df)

    elif intent == "correlation":
        outputs += corr_payloads(df, message)

    elif intent == "feature_importance":
        # naive target parse: "feature importance for Salary"
        target = None
        m = message.lower()
        for key in ["target", "for"]:
            if key in m:
                tail = m.split(key, 1)[1].strip().split()
                target = tail[0] if tail else None
                break
        if not target or target not in df.columns:
            raise HTTPException(400, "Specify a valid target column, e.g. 'feature importance for Salary'.")
        outputs += feature_importance_payloads(df, target)

    elif intent == "aggregate":
        outputs += aggregate_payload(message, df)

    elif intent == "groupops":
        outputs += group_query_payloads(message, df)

    else:
        outputs.append({
            "type": "text",
            "title": "Help",
            "data": {"markdown": "Try: summary • correlation • feature importance for <target> • mean of Age • average Salary by Department • top 10 rows by Salary where Age > 40"}
        })

    # 3) Narrative: hybrid / deterministic / llm
    if narrative_mode == "deterministic":
        insight = _deterministic_insight(intent, df, outputs, message) or "Done."
    elif narrative_mode == "llm":
        stats = _basic_stats(df)
        llm_text = brain.think(
            query=message,
            model_choice=model_choice,
            stats_summary=stats,
            trend_summary="Not performed.",
            anomaly_summary="Not performed.",
            xai_summary=_xai_from_outputs(outputs),
        )
        insight = _clean_text(llm_text) or "Done."
    else:  # hybrid
        insight = _hybrid_narrative(intent, df, outputs, message, model_choice)

    outputs.insert(0, {"type": "text", "title": "Insight", "data": {"markdown": insight}})
    return {"intent": intent, "outputs": outputs}
