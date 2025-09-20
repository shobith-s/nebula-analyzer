# In backend/nebula/core/architectures.py
import torch
import torch.nn as nn
from collections import deque
from nebula.core.conversation import NeuralConversationEngine

# MLP class remains unchanged
class MLP(nn.Module):
    def __init__(self, input_dim, output_dim):
        super().__init__()
        self.layers = nn.Sequential(
            nn.Linear(input_dim, 64), nn.ReLU(),
            nn.Linear(64, 32), nn.ReLU(),
            nn.Linear(32, output_dim)
        )
    def forward(self, x): return self.layers(x)

class NEBULABrain(nn.Module):
    def __init__(self, tabular_input_dim: int):
        super().__init__()
        self.memory = deque(maxlen=5) # Increased memory size
        
        self.tabular_output_dim = 16
        self.tabular_encoder = MLP(
            input_dim=tabular_input_dim,
            output_dim=self.tabular_output_dim
        )
        self.conversation = NeuralConversationEngine()
        print(f"NEBULA Brain Initialized for Structured Data ({tabular_input_dim} features).")
    
    # NEW: Method to reconfigure the MLP for new data shapes
    def reconfigure_mlp(self, new_input_dim: int):
        # Check if reconfiguration is necessary
        current_input_dim = self.tabular_encoder.layers[0].in_features
        if new_input_dim != current_input_dim:
            print(f"Reconfiguring MLP from {current_input_dim} to {new_input_dim} features.")
            self.tabular_encoder = MLP(
                input_dim=new_input_dim,
                output_dim=self.tabular_output_dim
            )

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
        print("--- Brain Training Finished ---")
    
    def get_feature_importances(self, tabular_data: torch.Tensor):
        # ... (This method remains unchanged)
        print("Calculating feature importances...")
        self.tabular_encoder.eval()
        tabular_data.requires_grad = True
        features = self.tabular_encoder(tabular_data)
        features.sum().backward()
        importances = tabular_data.grad.abs().sum(dim=0)
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
        # ... (This method is simplified as fusion is no longer needed)
        print(f"\n--- New Task ---")
        print(f"Received query: '{query}'")
        memory_context = self._get_memory_context()
        tabular_features = self.tabular_encoder(tabular_data)
        insight = self.conversation.generate_response(query, tabular_features, memory_context)
        self.memory.append((query, insight))
        print(f"Final Insight: {insight}")
        return insight