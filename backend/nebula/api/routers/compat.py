from typing import List, Any, Dict
import pandas as pd
import numpy as np
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from nebula.core.state import brain  # shared NEBULA brain

router = APIRouter()

# ----- payload models (minimal, only what the FE expects) -----
class CleaningChoices(BaseModel):
    removeDuplicates: bool
    fillMissing: bool

class ProfileRequest(BaseModel):
    tabular_data: List[List[Any]]

class MemoryResponse(BaseModel):
    history: List[Dict[str, str]]

@router.post("/profile-data")
def profile_data(request: ProfileRequest):
    if not request.tabular_data or len(request.tabular_data) < 2:
        raise HTTPException(status_code=400, detail="Incomplete data.")
    headers, data_rows = request.tabular_data[0], request.tabular_data[1:]
    df = pd.DataFrame(data_rows, columns=headers)

    report = {
        "general_stats": {
            "total_rows": len(df),
            "duplicate_rows": int(df.duplicated().sum()),
        },
        "column_profiles": [],
    }

    for col in df.columns:
        col_profile = {"column_name": col}
        numeric_col = pd.to_numeric(df[col], errors="coerce")

        is_num = (
            pd.api.types.is_numeric_dtype(numeric_col)
            and numeric_col.notna().sum() > len(df) / 2
        )
        col_profile["data_type"] = "numerical" if is_num else "categorical"

        missing_count = int(df[col].isnull().sum() | numeric_col.isnull().sum())
        col_profile["missing_values"] = missing_count
        col_profile["missing_percentage"] = (
            (missing_count / len(df)) * 100 if len(df) > 0 else 0
        )

        outlier_count = 0
        if is_num:
            q1, q3 = numeric_col.quantile(0.25), numeric_col.quantile(0.75)
            iqr = q3 - q1
            lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
            outlier_count = int(((numeric_col < lower) | (numeric_col > upper)).sum())
        col_profile["outlier_count"] = outlier_count

        report["column_profiles"].append(col_profile)

    return report

@router.get("/memory", response_model=MemoryResponse)
def get_memory():
    history = [{"query": q, "insight": i} for q, i in brain.memory]
    return {"history": history}
