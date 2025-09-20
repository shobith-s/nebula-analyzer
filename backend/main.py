import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List
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

# The request now only needs tabular data and a query
class AnalysisRequest(BaseModel):
    tabular_data: List[List[float]] = Field(..., example=[[1.0, 2.5, 3.0, 4.0], [5.0, 6.5, 7.0, 8.0]])
    query: str = Field(..., example="What are the key patterns in this data?")

class AnalysisResponse(BaseModel):
    insight: str

@app.post("/analyze", response_model=AnalysisResponse)
def analyze_data(request: AnalysisRequest):
    tabular_tensor = torch.tensor(request.tabular_data).float()
    
    if len(tabular_tensor.shape) != 2 or tabular_tensor.shape[0] == 0:
        raise HTTPException(status_code=400, detail="Tabular data must be a 2D array with at least one row.")
        
    num_features = tabular_tensor.shape[1]
    
    print(f"Creating a new brain for data with {num_features} features.")
    brain = NEBULABrain(tabular_input_dim=num_features)
    
    num_rows = tabular_tensor.shape[0]
    output_dim = 16
    dummy_ytrain = torch.randn(num_rows, output_dim)
    brain.train(X_tabular=tabular_tensor, y_tabular=dummy_ytrain, epochs=2)
    
    insight = brain.think(tabular_data=tabular_tensor, query=request.query)
    
    return {"insight": insight}

@app.get("/")
def read_root():
    return {"message": "NEBULA Brain API for Structured Data is running."}