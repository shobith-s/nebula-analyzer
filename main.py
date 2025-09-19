# In main.py
import torch
from fastapi import FastAPI
from pydantic import BaseModel, Field
from typing import List, Dict

# Import our brain
from nebula.core.architectures import NEBULABrain

# --- API Setup ---
app = FastAPI(
    title="NEBULA Brain API",
    description="An API to interact with the NEBULA multi-modal reasoning engine.",
    version="0.1.0"
)

# --- Data Models for Input/Output ---
# This tells the API what kind of JSON to expect
class AnalysisRequest(BaseModel):
    # CHANGED: The example now reflects the correct shape (2 rows, 20 features each)
    tabular_data: List[List[float]] = Field(
        ..., 
        example=[
            [1.0, 2.5, 3.0, 4.0, 5.5, 6.0, 7.0, 8.5, 9.0, 10.0, 11.0, 12.5, 13.0, 14.0, 15.5, 16.0, 17.0, 18.5, 19.0, 20.0],
            [20.0, 19.5, 18.0, 17.0, 16.5, 15.0, 14.0, 13.5, 12.0, 11.0, 10.0, 9.5, 8.0, 7.0, 6.5, 5.0, 4.0, 3.5, 2.0, 1.0]
        ]
    )
    text_data: List[str] = Field(..., example=["Sales are up.", "Customer feedback is positive."])
    query: str = Field(..., example="What is the overall business summary?")

class AnalysisResponse(BaseModel):
    insight: str

# --- Loading and Training the Brain ---
# We create a single, global instance of the brain
# In a real application, you would load saved model weights here.
# For now, we'll train it on dummy data at startup.
brain = NEBULABrain()

print("Performing one-time startup training for the brain...")
X_train = torch.randn(100, 20)
y_train = torch.randn(100, 16)
brain.train(X_tabular=X_train, y_tabular=y_train, epochs=2) # Short training for quick startup
print("Startup training complete. NEBULA is ready.")

# --- API Endpoint ---
@app.post("/analyze", response_model=AnalysisResponse)
def analyze_data(request: AnalysisRequest):
    """
    Receives tabular and text data, performs multi-modal analysis, 
    and returns a generated insight.
    """
    # Convert incoming data to PyTorch Tensors
    tabular_tensor = torch.tensor(request.tabular_data).float()
    
    # Package the data for the brain's 'think' method
    data_payload = {
        'tabular_data': tabular_tensor,
        'text_data': request.text_data
    }
    
    # Get the insight from the brain
    insight = brain.think(data_inputs=data_payload, query=request.query)
    
    return {"insight": insight}

@app.get("/")
def read_root():
    return {"message": "NEBULA Brain API is running."}