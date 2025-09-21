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
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalysisRequest(BaseModel):
    tabular_data: List[List[Any]] 
    query: str

class AnalysisResponse(BaseModel):
    insight: str
    feature_importances: List[Dict[str, float | str]]
    anomalies: List[int]

class MemoryResponse(BaseModel):
    history: List[Dict[str, str]]

brain = NEBULABrain(tabular_input_dim=1)
print("Startup complete. NEBULA is ready.")

@app.post("/analyze", response_model=AnalysisResponse)
def analyze_data(request: AnalysisRequest):
    print("\n--- Starting Data Ingestion & Preprocessing ---")
    
    if not request.tabular_data or len(request.tabular_data) < 2:
        raise HTTPException(status_code=400, detail="Received empty or incomplete data.")
        
    headers = request.tabular_data[0]
    data_rows = request.tabular_data[1:]
    df = pd.DataFrame(data_rows, columns=headers)

    for col in df.columns:
        df[col] = pd.to_numeric(df[col], errors='coerce')

    print("Detected Data Types and Info:")
    df.info(verbose=False, show_counts=True)
    
    numeric_df = df.select_dtypes(include=np.number)
    
    if numeric_df.empty:
        raise HTTPException(status_code=400, detail="No usable numeric columns were found.")
    
    print(f"Proceeding with {numeric_df.shape[1]} numeric columns for analysis.")
    
    trend_summary = ""
    valid_cols_for_trend = [col for col in numeric_df.columns if numeric_df[col].nunique() > 1]
    
    if len(valid_cols_for_trend) >= 2:
        col1, col2 = valid_cols_for_trend[0], valid_cols_for_trend[1]
        trend_df = numeric_df[[col1, col2]].dropna()
        if len(trend_df) > 1:
            X = trend_df[[col1]].values
            y = trend_df[[col2]].values
            try:
                reg = LinearRegression().fit(X, y)
                slope, r_squared = reg.coef_[0][0], reg.score(X, y)
                trend_summary = f"A linear regression between '{col1}' and '{col2}' found a slope of {slope:.2f} (R-squared: {r_squared:.2f})."
            except Exception as e:
                print(f"Trend analysis failed: {e}")
    
    numeric_df = numeric_df.fillna(numeric_df.median())
        
    tabular_tensor = torch.tensor(numeric_df.values).float()
    num_features = tabular_tensor.shape[1]

    anomaly_summary = ""
    anomaly_indices = []

    brain.reconfigure_mlp(num_features)
    output_dim = 16
    dummy_ytrain = torch.randn(tabular_tensor.shape[0], output_dim)
    brain.train(X_tabular=tabular_tensor, y_tabular=dummy_ytrain, epochs=2)
    
    # Create the XAI summary to feed into the prompt
    importances = brain.get_feature_importances(tabular_data=tabular_tensor)
    numeric_headers = numeric_df.columns.tolist()
    formatted_importances = [{"name": f"{h}", "importance": float(imp)} for h, imp in zip(numeric_headers, importances)]
    
    top_importances = sorted(formatted_importances, key=lambda x: x['importance'], reverse=True)[:3]
    xai_summary = "Feature importance analysis shows the top 3 most influential columns are: "
    xai_summary += ", ".join([f"'{item['name']}'" for item in top_importances]) + "."
    
    insight = brain.think(
        tabular_data=tabular_tensor, 
        query=request.query, 
        stats_summary=numeric_df.describe().to_string(), 
        trend_summary=trend_summary, 
        anomaly_summary=anomaly_summary,
        xai_summary=xai_summary
    )
    
    return {"insight": insight, "feature_importances": formatted_importances, "anomalies": anomaly_indices}


@app.get("/memory", response_model=MemoryResponse)
def get_memory():
    history = [{"query": q, "insight": i} for q, i in brain.memory]
    return {"history": history}

@app.get("/")
def read_root():
    return {"message": "NEBULA Brain API for Structured Data is running."}