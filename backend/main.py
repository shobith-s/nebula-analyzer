import torch
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
from sklearn.linear_model import LinearRegression

from nebula.core.architectures import NEBULABrain
from nebula.core.models import VAE

app = FastAPI(title="NEBULA Brain API (Structured Data)")

# --- CORS Configuration ---
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Models ---
class ProfileRequest(BaseModel):
    tabular_data: List[List[Any]]

class AnalysisRequest(BaseModel):
    tabular_data: List[List[Any]]
    query: str
    model_choice: str = "gemini"

class AnalysisResponse(BaseModel):
    insight: str
    feature_importances: List[Dict[str, float | str]]
    anomalies: List[int]

class MemoryResponse(BaseModel):
    history: List[Dict[str, str]]

# --- Brain Initialization ---
brain = NEBULABrain(tabular_input_dim=1)
print("Startup complete. NEBULA is ready.")

# --- NEW: Data Profiling Endpoint ---
@app.post("/profile-data")
def profile_data(request: ProfileRequest):
    print("\n--- Starting Data Profiling ---")
    if not request.tabular_data or len(request.tabular_data) < 2:
        raise HTTPException(status_code=400, detail="Received empty or incomplete data.")
    
    headers = request.tabular_data[0]
    data_rows = request.tabular_data[1:]
    df = pd.DataFrame(data_rows, columns=headers)

    # --- Build the Health Report ---
    report = {
        "column_profiles": [],
        "general_stats": {}
    }

    # General Stats
    report["general_stats"]["total_rows"] = len(df)
    report["general_stats"]["duplicate_rows"] = int(df.duplicated().sum())

    # Column-specific profiles
    for col in df.columns:
        col_profile = {"column_name": col}
        
        # Data Type
        # Convert to numeric, coercing errors, then infer dtype
        numeric_col = pd.to_numeric(df[col], errors='coerce')
        if numeric_col.notna().all(): # If all values are numbers
            col_profile["data_type"] = "numerical"
        else:
            col_profile["data_type"] = "categorical"


        # Missing Values
        missing_count = int(df[col].isnull().sum() | pd.to_numeric(df[col], errors='coerce').isnull().sum())
        col_profile["missing_values"] = missing_count
        col_profile["missing_percentage"] = (missing_count / len(df)) * 100 if len(df) > 0 else 0
        
        # Outlier Detection (for numeric columns only)
        if col_profile["data_type"] == "numerical":
            q1 = numeric_col.quantile(0.25)
            q3 = numeric_col.quantile(0.75)
            iqr = q3 - q1
            lower_bound = q1 - 1.5 * iqr
            upper_bound = q3 + 1.5 * iqr
            outliers = numeric_col[(numeric_col < lower_bound) | (numeric_col > upper_bound)]
            col_profile["outlier_count"] = len(outliers)
        else:
            col_profile["outlier_count"] = 0
        
        report["column_profiles"].append(col_profile)
        
    print("Data profiling complete.")
    return report

# --- Main Analysis Endpoint (Unchanged for now) ---
@app.post("/analyze", response_model=AnalysisResponse)
def analyze_data(request: AnalysisRequest):
    # This function's logic is temporarily simplified to prevent crashes.
    # We will fully restore it in the next phase.
    print("\n--- Received request for analysis (placeholder) ---")
    return {"insight": "Analysis placeholder", "feature_importances": [], "anomalies": []}


@app.get("/memory", response_model=MemoryResponse)
def get_memory():
    history = [{"query": q, "insight": i} for q, i in brain.memory]
    return {"history": history}

@app.get("/")
def read_root():
    return {"message": "NEBULA Brain API for Structured Data is running."}