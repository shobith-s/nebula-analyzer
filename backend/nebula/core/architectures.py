import torch
import torch.nn as nn
import numpy as np
from collections import deque
from nebula.core.conversation import NeuralConversationEngine

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
        self.memory = deque(maxlen=3)
        self.tabular_output_dim = 16
        self.tabular_encoder = MLP(
            input_dim=tabular_input_dim,
            output_dim=self.tabular_output_dim
        )
        self.conversation = NeuralConversationEngine()
        print(f"NEBULABrain Initialized for Structured Data ({tabular_input_dim} features).")
    
    def reconfigure_mlp(self, new_input_dim: int):
        current_input_dim = self.tabular_encoder.layers[0].in_features
        if new_input_dim != current_input_dim:
            self.tabular_encoder = MLP(
                input_dim=new_input_dim,
                output_dim=self.tabular_output_dim
            )

    def train(self, X_tabular, y_tabular, epochs=5):
        # ... (This method is unchanged)
        print("\n--- Starting Brain Training ---")
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
        # ... (This method is unchanged)
        self.tabular_encoder.eval()
        if tabular_data.grad is not None:
            tabular_data.grad.zero_()
        tabular_data.requires_grad = True
        features = self.tabular_encoder(tabular_data)
        features.sum().backward()
        importances = tabular_data.grad.abs().sum(dim=0)
        if torch.isnan(importances).any() or torch.isinf(importances).any() or importances.sum() == 0:
            return np.zeros(tabular_data.shape[1])
        normalized_importances = importances / importances.sum()
        final_importances = normalized_importances.detach().cpu().numpy()
        np.nan_to_num(final_importances, nan=0.0, posinf=0.0, neginf=0.0, copy=False)
        return final_importances

    def _get_memory_context(self):
        # ... (This method is unchanged)
        if not self.memory: return ""
        context_str = "Prior Conversation History:\n"
        for q, i in self.memory:
            context_str += f"- The user asked: '{q}'\n- You answered: '{i}'\n"
        return context_str

    def think(self, tabular_data, query, model_choice="gemini", **kwargs):
        print(f"\n--- New Task ---")
        memory_context = self._get_memory_context()
        tabular_features = self.tabular_encoder(tabular_data)
        insight = self.conversation.generate_response(
            query=query, 
            features=tabular_features, 
            model_choice=model_choice,
            memory_context=memory_context, 
            **kwargs
        )
        self.memory.append((query, insight))
        print(f"Final Insight: {insight}")
        return insight