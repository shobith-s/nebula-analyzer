import torch
import torch.nn as nn
from collections import deque
from nebula.core.conversation import NeuralConversationEngine

# A simple MLP for tabular data
class MLP(nn.Module):
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
        
        # Define dimensions dynamically
        TABULAR_INPUT_DIM = tabular_input_dim
        TABULAR_OUTPUT_DIM = 16 
        
        # The brain now only has a tabular encoder and a conversation engine
        self.tabular_encoder = MLP(
            input_dim=TABULAR_INPUT_DIM,
            output_dim=TABULAR_OUTPUT_DIM
        )
        self.conversation = NeuralConversationEngine()
        print(f"NEBULA Brain Initialized for Structured Data ({tabular_input_dim} features).")

    def train(self, X_tabular, y_tabular, epochs=5):
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
    
    def _get_memory_context(self):
        if not self.memory:
            return ""
        context_str = "Prior Conversation Context:\n"
        for q, i in self.memory:
            context_str += f"- User asked: '{q}'\n- NEBULA answered: '{i}'\n"
        return context_str

    def think(self, tabular_data, query):
        print(f"\n--- New Task ---")
        print(f"Received query: '{query}'")
        
        memory_context = self._get_memory_context()
        
        # The data path is now much simpler
        tabular_features = self.tabular_encoder(tabular_data)
        
        insight = self.conversation.generate_response(query, tabular_features, memory_context)
        
        self.memory.append((query, insight))
        
        print(f"Final Insight: {insight}")
        return insight