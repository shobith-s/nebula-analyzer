import torch
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict
from fastapi.middleware.cors import CORSMiddleware
from sklearn.linear_model import LinearRegression # New import

from nebula.core.architectures import NEBULABrain

app = FastAPI(title="NEBULA Brain API (Structured Data)") # Simplified

# ... (CORS middleware remains the same) ...
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class AnalysisRequest(BaseModel):
    tabular_data: List[List[float]]
    query: str

class AnalysisResponse(BaseModel):
    insight: str
    feature_importances: List[Dict[str, float | str]]

class MemoryResponse(BaseModel):
    history: List[Dict[str, str]]

brain = NEBULABrain(tabular_input_dim=1)
print("Startup complete. NEBULA is ready.")

@app.post("/analyze", response_model=AnalysisResponse)
def analyze_data(request: AnalysisRequest):
    df = pd.DataFrame(request.tabular_data)
    
    # --- MULTI-STEP REASONING ---
    # 1. Descriptive Statistics
    stats = df.describe()
    stats_summary = stats.to_string()
    
    # 2. Trend Analysis (Linear Regression)
    trend_summary = ""
    if df.shape[1] >= 2:
        X = df.iloc[:, 0].values.reshape(-1, 1) # First column
        y = df.iloc[:, 1].values.reshape(-1, 1) # Second column
        reg = LinearRegression().fit(X, y)
        slope = reg.coef_[0][0]
        r_squared = reg.score(X, y)
        trend_summary = (
            f"A linear regression between the first two columns was performed. "
            f"The trend shows a slope of {slope:.2f}, with an R-squared value of {r_squared:.2f}."
        )
    # ----------------------------

    tabular_tensor = torch.tensor(request.tabular_data).float()
    num_features = tabular_tensor.shape[1]
    brain.reconfigure_mlp(num_features)
    
    output_dim = 16
    dummy_ytrain = torch.randn(tabular_tensor.shape[0], output_dim)
    brain.train(X_tabular=tabular_tensor, y_tabular=dummy_ytrain, epochs=2)
    
    insight = brain.think(
        tabular_data=tabular_tensor, 
        query=request.query, 
        stats_summary=stats_summary,
        trend_summary=trend_summary # Pass the new summary
    )
    
    importances = brain.get_feature_importances(tabular_data=tabular_tensor)
    formatted_importances = [{"name": f"Column {i+1}", "importance": float(imp)} for i, imp in enumerate(importances)]
    
    return {"insight": insight, "feature_importances": formatted_importances}

@app.get("/memory", response_model=MemoryResponse)
def get_memory():
    history = [{"query": q, "insight": i} for q, i in brain.memory]
    return {"history": history}

@app.get("/")
def read_root():
    return {"message": "NEBULA Brain API for Structured Data is running."}