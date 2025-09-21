# In backend/main.py
import torch
import pandas as pd # Import pandas
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

# ... (CORS middleware remains the same) ...
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

# The brain is now a true singleton, initialized once.
brain = NEBULABrain(tabular_input_dim=1) # Start with a placeholder
print("Startup complete. NEBULA is ready.")

@app.post("/analyze", response_model=AnalysisResponse)
def analyze_data(request: AnalysisRequest):
    # --- STEP 1: DATA ANALYSIS WITH PANDAS ---
    # Convert the incoming data into a pandas DataFrame for powerful analysis
    df = pd.DataFrame(request.tabular_data)
    # Calculate descriptive statistics
    stats = df.describe()
    
    # Format the stats into a string for the AI's prompt
    stats_summary = stats.to_string()
    
    # --- STEP 2: DYNAMIC MODEL CONFIGURATION & TRAINING ---
    tabular_tensor = torch.tensor(request.tabular_data).float()
    num_features = tabular_tensor.shape[1]
    
    brain.reconfigure_mlp(num_features)
    
    num_rows = tabular_tensor.shape[0]
    output_dim = 16
    dummy_ytrain = torch.randn(num_rows, output_dim)
    brain.train(X_tabular=tabular_tensor, y_tabular=dummy_ytrain, epochs=2)
    
    # --- STEP 3: AI REASONING & RESPONSE ---
    # Pass both the raw tensor and the new stats summary to the brain
    insight = brain.think(
        tabular_data=tabular_tensor, 
        query=request.query, 
        stats_summary=stats_summary
    )
    
    importances = brain.get_feature_importances(tabular_data=tabular_tensor)
    formatted_importances = [{"name": f"Column {i+1}", "importance": float(imp)} for i, imp in enumerate(importances)]
    
    return {"insight": insight, "feature_importances": formatted_importances}

@app.get("/memory", response_model=MemoryResponse)
# ... (This endpoint remains the same)
def get_memory():
    history = [{"query": q, "insight": i} for q, i in brain.memory]
    return {"history": history}

@app.get("/")
# ... (This endpoint remains the same)
def read_root():
    return {"message": "NEBULA Brain API for Structured Data is running."}

# Define the MemoryResponse model if it's not defined
class MemoryResponse(BaseModel):
    history: List[Dict[str, str]]