import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from fastapi.middleware.cors import CORSMiddleware

from nebula.core.architectures import NEBULABrain
from nebula.core.models import VAE # This is no longer used but we can keep the file

app = FastAPI(title="NEBULABrain API (Structured Data)")

# --- CORS Configuration ---
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Pydantic Models ---
class CleaningChoices(BaseModel):
    removeDuplicates: bool; fillMissing: bool

class AnalysisRequest(BaseModel):
    tabular_data: List[List[Any]]; query: str; model_choice: str = "gemini"; cleaning_choices: CleaningChoices | None = None

class AnalysisResponse(BaseModel):
    insight: str; feature_importances: List[Dict[str, Any]]; anomalies: List[int]

class MemoryResponse(BaseModel):
    history: List[Dict[str, str]]

class ProfileRequest(BaseModel):
    tabular_data: List[List[Any]]

# --- Brain Initialization ---
brain = NEBULABrain()
print("Startup complete. NEBULA is ready.")

# --- API Endpoints ---
@app.post("/profile-data")
def profile_data(request: ProfileRequest):
    # ... (This function is unchanged)
    if not request.tabular_data or len(request.tabular_data) < 2: raise HTTPException(status_code=400, detail="Incomplete data.")
    headers, data_rows = request.tabular_data[0], request.tabular_data[1:]
    df = pd.DataFrame(data_rows, columns=headers)
    report = {"general_stats": {"total_rows": len(df), "duplicate_rows": int(df.duplicated().sum())}, "column_profiles": []}
    for col in df.columns:
        col_profile = {"column_name": col}
        numeric_col = pd.to_numeric(df[col], errors='coerce')
        col_profile["data_type"] = "numerical" if pd.api.types.is_numeric_dtype(numeric_col) and numeric_col.notna().sum() > len(df) / 2 else "categorical"
        missing_count = int(df[col].isnull().sum() | numeric_col.isnull().sum())
        col_profile["missing_values"], col_profile["missing_percentage"] = missing_count, (missing_count / len(df)) * 100 if len(df) > 0 else 0
        col_profile["outlier_count"] = 0
        if col_profile["data_type"] == "numerical":
            q1, q3 = numeric_col.quantile(0.25), numeric_col.quantile(0.75)
            iqr = q3 - q1
            lower_bound, upper_bound = q1 - 1.5 * iqr, q3 + 1.5 * iqr
            col_profile["outlier_count"] = len(numeric_col[(numeric_col < lower_bound) | (numeric_col > upper_bound)])
        report["column_profiles"].append(col_profile)
    return report

@app.post("/analyze", response_model=AnalysisResponse)
def analyze_data(request: AnalysisRequest):
    print("\n--- Starting Full Analysis Pipeline with TabNet ---")
    if not request.tabular_data or len(request.tabular_data) < 2: raise HTTPException(status_code=400, detail="Incomplete data.")
    headers, data_rows = request.tabular_data[0], request.tabular_data[1:]
    df = pd.DataFrame(data_rows, columns=headers)

    if request.cleaning_choices and request.cleaning_choices.removeDuplicates:
        df.drop_duplicates(inplace=True, keep='first')
    
    for col in df.columns: df[col] = pd.to_numeric(df[col], errors='coerce')
    numeric_df = df.select_dtypes(include=np.number)
    if numeric_df.empty: raise HTTPException(status_code=400, detail="No usable numeric columns found.")
    
    if request.cleaning_choices and request.cleaning_choices.fillMissing:
        numeric_df = numeric_df.fillna(numeric_df.median())
    
    stats_summary = numeric_df.describe().to_string()
    
    # --- TabNet Specific Training ---
    # TabNet needs to predict one column from the others. We'll pick the last column as the target.
    if numeric_df.shape[1] < 2: raise HTTPException(status_code=400, detail="TabNet requires at least 2 numeric columns.")
    
    X_train = numeric_df.iloc[:, :-1].values
    y_train = numeric_df.iloc[:, -1].values.reshape(-1, 1)
    
    brain.train(X_tabular=X_train, y_tabular=y_train, epochs=25)
    
    # --- XAI with TabNet's built-in attribute ---
    importances = brain.get_feature_importances()
    feature_headers = numeric_df.columns[:-1].tolist()
    formatted_importances = [{"name": h, "importance": float(imp)} for h, imp in zip(feature_headers, importances)]
    xai_summary = "Feature importance analysis shows the top 3 most influential columns are: " + ", ".join([f"'{item['name']}'" for item in sorted(formatted_importances, key=lambda x: x['importance'], reverse=True)[:3]]) + "."
    
    # Anomaly detection is not used in this version
    anomaly_summary, anomaly_indices = "Not performed in this analysis.", []
    
    # Trend analysis is also not the primary focus, but we can keep a simplified version
    trend_summary = "Trend analysis was not the primary focus."

    insight = brain.think(
        tabular_data=None, # We don't need to pass the raw data anymore
        query=request.query, model_choice=request.model_choice,
        stats_summary=stats_summary, trend_summary=trend_summary, 
        anomaly_summary=anomaly_summary, xai_summary=xai_summary
    )
    
    return {"insight": insight, "feature_importances": formatted_importances, "anomalies": anomaly_indices}

@app.get("/memory", response_model=MemoryResponse)
def get_memory():
    history = [{"query": q, "insight": i} for q, i in brain.memory]
    return {"history": history}

@app.get("/")
def read_root():
    return {"message": "NEBULA Brain API for Structured Data is running."}