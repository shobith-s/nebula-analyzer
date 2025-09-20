# In backend/nebula/core/architectures.py

import torch
import torch.nn as nn
from collections import deque
from transformers import AutoTokenizer, AutoModel
from nebula.core.conversation import NeuralConversationEngine

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


class MultiModalEngine(nn.Module):
    def __init__(self, tabular_input_dim, tabular_output_dim):
        super().__init__()
        self.tabular_encoder = MLP(
            input_dim=tabular_input_dim,
            output_dim=tabular_output_dim
        )
        print(f"MultiModalEngine initialized with MLP for tabular data ({tabular_input_dim} features).")
        
        model_name = "distilgpt2"
        self.text_tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.text_encoder = AutoModel.from_pretrained(model_name)
        
        if self.text_tokenizer.pad_token is None:
            self.text_tokenizer.pad_token = self.text_tokenizer.eos_token
            
        print(f"MultiModalEngine initialized with Text Encoder ({model_name}).")

    def forward(self, tabular_data=None, text_data=None):
        encoded_outputs = {}
        if tabular_data is not None:
            print("Extracting features with MLP...")
            tabular_features = self.tabular_encoder(tabular_data)
            encoded_outputs['tabular'] = tabular_features

        if text_data is not None:
            print("Processing data through Text Transformer encoder...")
            inputs = self.text_tokenizer(text_data, return_tensors="pt", padding=True, truncation=True)
            outputs = self.text_encoder(**inputs)
            text_features = outputs.last_hidden_state.mean(dim=1)
            encoded_outputs['text'] = text_features
        return encoded_outputs


class NeuralBrainCore(nn.Module):
    def __init__(self, text_embed_dim, tabular_embed_dim, fusion_dim=256, num_heads=8):
        super().__init__()
        print("NeuralBrainCore Initialized with Fusion Layer.")
        self.text_projection = nn.Linear(text_embed_dim, fusion_dim)
        self.tabular_projection = nn.Linear(tabular_embed_dim, fusion_dim)
        self.cross_attention = nn.MultiheadAttention(embed_dim=fusion_dim, num_heads=num_heads, batch_first=True)
        self.layer_norm = nn.LayerNorm(fusion_dim)

    def forward(self, encoded_data):
        print("Fusing features with NeuralBrainCore...")
        tabular_features = encoded_data.get('tabular')
        text_features = encoded_data.get('text')
        if tabular_features is None or text_features is None:
            raise ValueError("Cross-attention requires both tabular and text features.")
        text_proj = self.text_projection(text_features).unsqueeze(1)
        tabular_proj = self.tabular_projection(tabular_features).unsqueeze(1)
        fused_output, _ = self.cross_attention(query=text_proj, key=tabular_proj, value=tabular_proj)
        fused_output = self.layer_norm(fused_output).squeeze(1)
        print(f"  - Fused features created with shape: {fused_output.shape}")
        return fused_output


class NEBULABrain(nn.Module):
    # CHANGED: The __init__ method now accepts the tabular data shape
    def __init__(self, tabular_input_dim: int):
        super().__init__()
        self.memory = deque(maxlen=3)
        
        # Define dimensions dynamically
        TABULAR_INPUT_DIM = tabular_input_dim
        TABULAR_OUTPUT_DIM = 16 
        TEXT_DIM = 768 
        
        self.perception = MultiModalEngine(
            tabular_input_dim=TABULAR_INPUT_DIM,
            tabular_output_dim=TABULAR_OUTPUT_DIM
        )
        self.reasoning = NeuralBrainCore(
            text_embed_dim=TEXT_DIM,
            tabular_embed_dim=TABULAR_OUTPUT_DIM
        )
        self.conversation = NeuralConversationEngine()
        print("NEBULA Brain Initialized and all core components loaded.")

    def train(self, X_tabular, y_tabular, epochs=5):
        print("\n--- Starting Brain Training ---")
        print(f"Training MLP module for {epochs} epochs...")
        
        optimizer = torch.optim.Adam(self.perception.tabular_encoder.parameters())
        loss_fn = nn.MSELoss()

        for epoch in range(epochs):
            optimizer.zero_grad()
            features = self.perception.tabular_encoder(X_tabular)
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

    def think(self, data_inputs, query):
        print(f"\n--- New Task ---")
        print(f"Received query: '{query}'")
        memory_context = self._get_memory_context()
        perception_output = self.perception.forward(**data_inputs)
        reasoning_output = self.reasoning.forward(perception_output)
        insight = self.conversation.generate_response(query, reasoning_output, memory_context)
        self.memory.append((query, insight))
        print(f"Final Insight: {insight}")
        return insight