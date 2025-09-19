import torch
from nebula.core.architectures import NEBULABrain

def test_brain():
    print("--- Starting NEBULA Brain Test ---")
    
    # 1. Instantiate the brain
    brain = NEBULABrain()
    
    # 2. Create dummy data
    # Tabular data
    dummy_tabular_data = torch.randn(10, 20)
    print(f"Created dummy tabular data with shape: {dummy_tabular_data.shape}")
    
    # Text data (list of strings)
    dummy_text_data = [
        "The sales in the northern region have increased by 15% this quarter.",
        "Customer feedback indicates a high demand for our new product line.",
        "We need to address the supply chain issues in the western territory."
    ]
    print(f"Created dummy text data with {len(dummy_text_data)} sentences.")
    
    # 3. Define a query and run the think process
    # We now pass data as a dictionary
    data_payload = {
        'tabular_data': dummy_tabular_data,
        'text_data': dummy_text_data
    }
    
    query = "Analyze sales trends and customer feedback"
    brain.think(data_inputs=data_payload, query=query)
    
    print("\n--- Test Finished ---")

if __name__ == "__main__":
    test_brain()