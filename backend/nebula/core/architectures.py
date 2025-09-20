# In backend/nebula/core/architectures.py
import torch
import torch.nn as nn
from collections import deque
from nebula.core.conversation import NeuralConversationEngine

class MLP(nn.Module):
    # ... (This class remains unchanged)
    def __init__(self, input_dim, output_dim):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, output_dim)
        )
    def forward(self, x):
        return self.layers(x)

class NEBULABrain(nn.Module):
    def __init__(self, tabular_input_dim: int):
        super().__init__()
        self.memory = deque(maxlen=3)
        TABULAR_INPUT_DIM = tabular_input_dim
        TABULAR_OUTPUT_DIM = 16 
        self.tabular_encoder = MLP(
            input_dim=TABULAR_INPUT_DIM,
            output_dim=TABULAR_OUTPUT_DIM
        )
        self.conversation = NeuralConversationEngine()
        print(f"NEBULA Brain Initialized for Structured Data ({tabular_input_dim} features).")

    def train(self, X_tabular, y_tabular, epochs=5):
        # ... (This method remains unchanged)
        print("\n--- Starting Brain Training ---")
        print(f"Training MLP module for {epochs} epochs...")
        optimizer = torch.optim.Adam(self.tabular_encoder.parameters())
        loss_fn = nn.MSELoss()
        for epoch in range(epochs):
            optimizer.zero_grad()
            features = self.tabular_encoder(X_tabular)
            loss = loss_fn(features, y_tabular)
            loss.backward()
            optimizer.step()
            print(f"Epoch {epoch+1}/{epochs}, Loss: {loss.item():.4f}")
        print("--- Brain Training Finished ---")
    
    # --- NEW: XAI Method to get feature importances ---
    def get_feature_importances(self, tabular_data: torch.Tensor):
        print("Calculating feature importances...")
        # Ensure the model is in evaluation mode
        self.tabular_encoder.eval()
        
        # We need to compute gradients with respect to the input
        tabular_data.requires_grad = True
        
        # Get the model's output
        features = self.tabular_encoder(tabular_data)
        
        # Calculate the gradient of the output's sum with respect to the input
        features.sum().backward()
        
        # The importance is the absolute value of the gradient
        importances = tabular_data.grad.abs().sum(dim=0)
        
        # Normalize the importances to be between 0 and 1 for easier visualization
        normalized_importances = importances / importances.sum()
        
        return normalized_importances.detach().cpu().numpy()

    def _get_memory_context(self):
        # ... (This method remains unchanged)
        if not self.memory: return ""
        context_str = "Prior Conversation Context:\n"
        for q, i in self.memory:
            context_str += f"- User asked: '{q}'\n- NEBULA answered: '{i}'\n"
        return context_str

    def think(self, tabular_data, query):
        print(f"\n--- New Task ---")
        print(f"Received query: '{query}'")
        memory_context = self._get_memory_context()
        tabular_features = self.tabular_encoder(tabular_data)
        insight = self.conversation.generate_response(query, tabular_features, memory_context)
        self.memory.append((query, insight))
        print(f"Final Insight: {insight}")
        return insight