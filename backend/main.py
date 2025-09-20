# In backend/main.py
import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List, Dict
from fastapi.middleware.cors import CORSMiddleware

from nebula.core.architectures import NEBULABrain

app = FastAPI(
    title="NEBULA Brain API (Structured Data)",
    description="An API to interact with the NEBULA reasoning engine for tabular data.",
    version="0.2.0"
)

# CORS Configuration
origins = ["http://localhost:5173", "http://127.0.0.1:5173"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AnalysisRequest(BaseModel):
    tabular_data: List[List[float]]
    query: str

class AnalysisResponse(BaseModel):
    insight: str
    feature_importances: List[Dict[str, float | str]]

class MemoryResponse(BaseModel):
    history: List[Dict[str, str]]

# --- SINGLETON BRAIN INSTANCE ---
# We create one brain when the server starts. We'll reconfigure it for each request.
# We start with a placeholder input dimension of 1.
brain = NEBULABrain(tabular_input_dim=1)
print("Startup complete. NEBULA is ready and waiting for data.")

@app.post("/analyze", response_model=AnalysisResponse)
def analyze_data(request: AnalysisRequest):
    tabular_tensor = torch.tensor(request.tabular_data).float()
    
    if len(tabular_tensor.shape) != 2 or tabular_tensor.shape[0] == 0:
        raise HTTPException(status_code=400, detail="Tabular data must be a 2D array with at least one row.")
        
    num_features = tabular_tensor.shape[1]
    
    # Reconfigure the existing brain's MLP for the new data shape
    # This is more efficient than creating a new brain every time.
    brain.reconfigure_mlp(num_features)
    
    num_rows = tabular_tensor.shape[0]
    output_dim = 16
    dummy_ytrain = torch.randn(num_rows, output_dim)
    brain.train(X_tabular=tabular_tensor, y_tabular=dummy_ytrain, epochs=2)
    
    insight = brain.think(tabular_data=tabular_tensor, query=request.query)
    importances = brain.get_feature_importances(tabular_data=tabular_tensor)
    formatted_importances = [{"name": f"Column {i+1}", "importance": float(imp)} for i, imp in enumerate(importances)]
    
    return {"insight": insight, "feature_importances": formatted_importances}

# --- NEW: Endpoint to get the brain's memory ---
@app.get("/memory", response_model=MemoryResponse)
def get_memory():
    # Convert the deque to a list of dicts for JSON compatibility
    history = [{"query": q, "insight": i} for q, i in brain.memory]
    return {"history": history}

@app.get("/")
def read_root():
    return {"message": "NEBULA Brain API for Structured Data is running."}