import torch
from nebula.core.architectures import NEBULABrain

def test_brain():
    print("--- Starting NEBULA Brain Test ---")
    
    # 1. Instantiate the brain
    brain = NEBULABrain()
    
    # 2. Create a dummy TRAINING dataset for the MLP
    print("\nCreating dummy training data...")
    X_train = torch.randn(100, 20)  # 100 samples, 20 features
    # The dummy target must match the MLP's output size (16)
    y_train = torch.randn(100, 16)   
    
    # 3. Train the brain
    brain.train(X_tabular=X_train, y_tabular=y_train, epochs=5)
    
    # 4. Create dummy INFERENCE data
    print("\nCreating dummy inference data...")
    dummy_tabular_data = torch.randn(3, 20)
    print(f"Created dummy tabular data with shape: {dummy_tabular_data.shape}")
    
    dummy_text_data = [
        "What are the key drivers of churn in our premium subscriber base?",
        "Summarize the performance of the latest marketing campaign.",
        "Identify anomalies in the transaction logs from the past 24 hours."
    ]
    print(f"Created dummy text data with {len(dummy_text_data)} sentences.")
    
    # 5. Define a query and run the think process
    data_payload = {
        'tabular_data': dummy_tabular_data,
        'text_data': dummy_text_data
    }
    
    query = "Find insights combining transactional data and user reports"
    brain.think(data_inputs=data_payload, query=query)
    
    print("\n--- Test Finished ---")

if __name__ == "__main__":
    test_brain()