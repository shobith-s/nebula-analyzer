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
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

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

brain = NEBULABrain(tabular_input_dim=1)
print("Startup complete. NEBULA is ready.")

@app.post("/analyze", response_model=AnalysisResponse)
def analyze_data(request: AnalysisRequest):
    # ... (Data preprocessing logic is the same) ...
    if not request.tabular_data or len(request.tabular_data) < 2:
        raise HTTPException(status_code=400, detail="Received empty or incomplete data.")
    headers, data_rows = request.tabular_data[0], request.tabular_data[1:]
    df = pd.DataFrame(data_rows, columns=headers)
    for col in df.columns: df[col] = pd.to_numeric(df[col], errors='coerce')
    numeric_df = df.select_dtypes(include=np.number)
    if numeric_df.empty:
        raise HTTPException(status_code=400, detail="No usable numeric columns were found.")
    
    stats_summary = numeric_df.describe().to_string()
    trend_summary = ""
    # ... (Trend analysis logic is the same) ...

    numeric_df = numeric_df.fillna(numeric_df.median())
    tabular_tensor = torch.tensor(numeric_df.values).float()
    num_features = tabular_tensor.shape[1]
    
    # ... (MLP Training logic is the same) ...
    brain.reconfigure_mlp(num_features)
    dummy_ytrain = torch.randn(tabular_tensor.shape[0], 16)
    brain.train(X_tabular=tabular_tensor, y_tabular=dummy_ytrain, epochs=2)
    
    importances = brain.get_feature_importances(tabular_data=tabular_tensor)
    numeric_headers = numeric_df.columns.tolist()
    formatted_importances = [{"name": f"{h}", "importance": float(imp)} for h, imp in zip(numeric_headers, importances)]
    anomaly_summary, anomaly_indices = "", []

    # Get Insight, passing the model_choice
    insight = brain.think(
        tabular_data=tabular_tensor, 
        query=request.query, 
        model_choice=request.model_choice,
        stats_summary=stats_summary, 
        trend_summary=trend_summary, 
        anomaly_summary=anomaly_summary,
        xai_summary="Feature importance analysis shows the top 3 most influential columns are: " + ", ".join([f"'{item['name']}'" for item in sorted(formatted_importances, key=lambda x: x['importance'], reverse=True)[:3]]) + "."
    )
    
    return {"insight": insight, "feature_importances": formatted_importances, "anomalies": anomaly_indices}


@app.get("/memory", response_model=MemoryResponse)
def get_memory():
    history = [{"query": q, "insight": i} for q, i in brain.memory]
    return {"history": history}

@app.get("/")
def read_root():
    return {"message": "NEBULA Brain API for Structured Data is running."}