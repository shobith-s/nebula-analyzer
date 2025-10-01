import torch
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
from sklearn.linear_model import LinearRegression

from nebula.core.architectures import NEBULABrain
from nebula.core.models import VAE

app = FastAPI(title="NEBULA Brain API (Structured Data)")

# --- CORS Configuration ---
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

# --- Pydantic Models ---
class ProfileRequest(BaseModel):
    tabular_data: List[List[Any]]

class CleaningChoices(BaseModel):
    removeDuplicates: bool
    fillMissing: bool

class AnalysisRequest(BaseModel):
    tabular_data: List[List[Any]]
    query: str
    model_choice: str = "gemini"
    cleaning_choices: CleaningChoices | None = None

class AnalysisResponse(BaseModel):
    insight: str
    feature_importances: List[Dict[str, Any]]
    anomalies: List[int]

class MemoryResponse(BaseModel):
    history: List[Dict[str, str]]

# --- Brain Initialization ---
brain = NEBULABrain(tabular_input_dim=1)
print("Startup complete. NEBULA is ready.")

# --- API Endpoints ---
@app.post("/profile-data")
def profile_data(request: ProfileRequest):
    # ... (This function is unchanged from the last step)
    if not request.tabular_data or len(request.tabular_data) < 2:
        raise HTTPException(status_code=400, detail="Received empty or incomplete data.")
    headers, data_rows = request.tabular_data[0], request.tabular_data[1:]
    df = pd.DataFrame(data_rows, columns=headers)
    report = {"general_stats": {}, "column_profiles": []}
    report["general_stats"]["total_rows"] = len(df)
    report["general_stats"]["duplicate_rows"] = int(df.duplicated().sum())
    for col in df.columns:
        col_profile = {"column_name": col}
        numeric_col = pd.to_numeric(df[col], errors='coerce')
        if numeric_col.notna().sum() > (len(df) / 2):
             col_profile["data_type"] = "numerical"
        else:
             col_profile["data_type"] = "categorical"
        missing_count = int(df[col].isnull().sum() | numeric_col.isnull().sum())
        col_profile["missing_values"] = missing_count
        col_profile["missing_percentage"] = (missing_count / len(df)) * 100 if len(df) > 0 else 0
        if col_profile["data_type"] == "numerical":
            q1, q3 = numeric_col.quantile(0.25), numeric_col.quantile(0.75)
            iqr = q3 - q1
            lower_bound, upper_bound = q1 - 1.5 * iqr, q3 + 1.5 * iqr
            outliers = numeric_col[(numeric_col < lower_bound) | (numeric_col > upper_bound)]
            col_profile["outlier_count"] = len(outliers)
        else:
            col_profile["outlier_count"] = 0
        report["column_profiles"].append(col_profile)
    return report


@app.post("/analyze", response_model=AnalysisResponse)
def analyze_data(request: AnalysisRequest):
    print("\n--- Starting Full Analysis Pipeline with Cleaning ---")
    if not request.tabular_data or len(request.tabular_data) < 2:
        raise HTTPException(status_code=400, detail="Received empty or incomplete data.")
    
    headers, data_rows = request.tabular_data[0], request.tabular_data[1:]
    df = pd.DataFrame(data_rows, columns=headers)

    if request.cleaning_choices:
        print("Applying user-selected cleaning plan...")
        if request.cleaning_choices.removeDuplicates:
            initial_rows = len(df)
            df.drop_duplicates(inplace=True, keep='first')
            print(f"Removed {initial_rows - len(df)} duplicate rows.")
    
    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    
    numeric_df = df.select_dtypes(include=np.number)
    if numeric_df.empty:
        raise HTTPException(status_code=400, detail="No usable numeric columns found after cleaning.")
    
    if request.cleaning_choices and request.cleaning_choices.fillMissing:
        print("Filling missing numerical values with median.")
        numeric_df = numeric_df.fillna(numeric_df.median())
    
    stats_summary = numeric_df.describe().to_string()
    
    trend_summary = ""
    valid_cols_for_trend = [col for col in numeric_df.columns if numeric_df[col].nunique() > 1]
    if len(valid_cols_for_trend) >= 2:
        col1, col2 = valid_cols_for_trend[0], valid_cols_for_trend[1]
        trend_df = numeric_df[[col1, col2]].dropna()
        if len(trend_df) > 1:
            X, y = trend_df[[col1]].values, trend_df[[col2]].values
            try:
                reg = LinearRegression().fit(X, y)
                slope, r_squared = reg.coef_[0][0], reg.score(X, y)
                trend_summary = f"A linear regression between '{col1}' and '{col2}' found a slope of {slope:.2f} (R-squared: {r_squared:.2f})."
            except Exception as e:
                print(f"Trend analysis failed: {e}")

    tabular_tensor = torch.tensor(numeric_df.values).float()
    num_features = tabular_tensor.shape[1]
    
    anomaly_summary, anomaly_indices = "", []
    
    brain.reconfigure_mlp(num_features)
    dummy_ytrain = torch.randn(tabular_tensor.shape[0], 16)
    brain.train(X_tabular=tabular_tensor, y_tabular=dummy_ytrain, epochs=2)
    
    importances = brain.get_feature_importances(tabular_data=tabular_tensor)
    numeric_headers = numeric_df.columns.tolist()
    formatted_importances = [{"name": h, "importance": float(imp)} for h, imp in zip(numeric_headers, importances)]
    
    xai_summary = "Feature importance analysis shows the top 3 most influential columns are: " + ", ".join([f"'{item['name']}'" for item in sorted(formatted_importances, key=lambda x: x['importance'], reverse=True)[:3]]) + "."

    insight = brain.think(
        tabular_data=tabular_tensor, query=request.query, model_choice=request.model_choice,
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