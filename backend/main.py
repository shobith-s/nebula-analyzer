import torch
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from typing import List
from fastapi.middleware.cors import CORSMiddleware

# Import our brain
from nebula.core.architectures import NEBULABrain

# --- API Setup ---
app = FastAPI(
    title="NEBULA Brain API",
    description="An API to interact with the NEBULA multi-modal reasoning engine.",
    version="0.1.0"
)

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
    tabular_data: List[List[float]] = Field(
        ..., 
        example=[[1.0]*20, [2.0]*20]
    )
    text_data: List[str] = Field(..., example=["Sales are up.", "Customer feedback is positive."])
    query: str = Field(..., example="What is the overall business summary?")

class AnalysisResponse(BaseModel):
    insight: str

# --- Loading and Training the Brain ---
brain = NEBULABrain()

print("Performing one-time startup training for the brain...")
X_train = torch.randn(100, 20)
y_train = torch.randn(100, 16)
brain.train(X_tabular=X_train, y_tabular=y_train, epochs=2)
print("Startup training complete. NEBULA is ready.")

# --- API Endpoint ---
@app.post("/analyze", response_model=AnalysisResponse)
def analyze_data(request: AnalysisRequest):
    """
    Receives tabular and text data, performs multi-modal analysis, 
    and returns a generated insight.
    """
    tabular_tensor = torch.tensor(request.tabular_data).float()
    
    # Backend validation check
    if len(tabular_tensor.shape) != 2 or tabular_tensor.shape[1] != 20:
        raise HTTPException(
            status_code=400, # Bad Request
            detail=f"Invalid data shape. Expected 2D data with 20 columns, but received shape {list(tabular_tensor.shape)}."
        )

    data_payload = {
        'tabular_data': tabular_tensor,
        'text_data': request.text_data
    }
    
    insight = brain.think(data_inputs=data_payload, query=request.query)
    
    return {"insight": insight}

@app.get("/")
def read_root():
    return {"message": "NEBULA Brain API is running."}