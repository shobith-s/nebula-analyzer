import torch
from nebula.core.architectures import NEBULABrain

def test_brain():
    print("--- Starting NEBULA Brain Test ---")
    brain = NEBULABrain()

    print("\nCreating dummy training data...")
    X_train = torch.randn(100, 20)
    y_train = torch.randn(100, 16)   
    brain.train(X_tabular=X_train, y_tabular=y_train, epochs=5)
    
    # --- Conversation Turn 1 ---
    print("\nCreating dummy inference data for Turn 1...")
    data_payload_1 = {
        'tabular_data': torch.randn(3, 20),
        'text_data': ["Sales are up in the North.", "Marketing spend was high.", "Customer satisfaction is dropping."]
    }
    query_1 = "What is the overall summary of the current business state?"
    brain.think(data_inputs=data_payload_1, query=query_1)
    
    # --- Conversation Turn 2 ---
    print("\nCreating dummy inference data for Turn 2...")
    data_payload_2 = {
        'tabular_data': torch.randn(3, 20),
        'text_data': ["The new product launch is delayed.", "Competitor X just lowered their prices.", "Logistics costs are increasing."]
    }
    query_2 = "Based on my last question, what are the biggest risks now?"
    brain.think(data_inputs=data_payload_2, query=query_2)
    
    print("\n--- Test Finished ---")

if __name__ == "__main__":
    test_brain()