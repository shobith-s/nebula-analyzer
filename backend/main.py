# In backend/main.py

import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List
from fastapi.middleware.cors import CORSMiddleware

from nebula.core.architectures import NEBULABrain

app = FastAPI(
    title="NEBULA Brain API",
    description="An API to interact with the NEBULA multi-modal reasoning engine.",
    version="0.1.0"
)

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
    # Example is now smaller for easier testing with different shapes
    tabular_data: List[List[float]] = Field(..., example=[[1.0, 2.5, 3.0, 4.0], [5.0, 6.5, 7.0, 8.0]])
    text_data: List[str] = Field(..., example=["Sales are up.", "Customer feedback is positive."])
    query: str = Field(..., example="What is the overall business summary?")

class AnalysisResponse(BaseModel):
    insight: str

@app.post("/analyze", response_model=AnalysisResponse)
def analyze_data(request: AnalysisRequest):
    tabular_tensor = torch.tensor(request.tabular_data).float()
    
    if len(tabular_tensor.shape) != 2 or tabular_tensor.shape[0] == 0:
        raise HTTPException(status_code=400, detail="Tabular data must be a 2D array with at least one row.")
        
    # --- DYNAMIC MODEL CREATION ---
    # 1. Get the number of features from the uploaded data
    num_features = tabular_tensor.shape[1]
    
    # 2. Create a new brain instance tailored to this data's shape
    print(f"Creating a new brain for data with {num_features} features.")
    brain = NEBULABrain(tabular_input_dim=num_features)
    
    # 3. Perform a quick training session on the new data
    # (In a real app, this would be more complex, but it demonstrates the concept)
    num_rows = tabular_tensor.shape[0]
    output_dim = 16 # Must match TABULAR_OUTPUT_DIM in NEBULABrain
    dummy_ytrain = torch.randn(num_rows, output_dim)
    brain.train(X_tabular=tabular_tensor, y_tabular=dummy_ytrain, epochs=2)
    # -------------------------------

    data_payload = {
        'tabular_data': tabular_tensor,
        'text_data': request.text_data
    }
    
    insight = brain.think(data_inputs=data_payload, query=request.query)
    
    return {"insight": insight}

@app.get("/")
def read_root():
    return {"message": "NEBULA Brain API is running."}