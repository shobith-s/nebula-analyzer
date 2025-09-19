import torch
import torch.nn as nn
from pytorch_tabnet.tab_network import TabNet  # DEFINITIVE FIX: Import from the correct module
from transformers import AutoTokenizer, AutoModel
from nebula.core.conversation import NeuralConversationEngine


class MultiModalEngine(nn.Module):
    def __init__(self, tabular_input_dim, tabular_output_dim):
        super().__init__()
        # --- Tabular Encoder ---
        # We now instantiate the core TabNet nn.Module directly
        self.tabular_encoder = TabNet(
            input_dim=tabular_input_dim,
            output_dim=tabular_output_dim,
            n_d=8,
            n_a=8,
            n_steps=3,
            gamma=1.3,
            n_independent=2,
            n_shared=2,
            momentum=0.02,
        )
        print("MultiModalEngine initialized with core TabNet module.")
        
        model_name = "distilgpt2"
        self.text_tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.text_encoder = AutoModel.from_pretrained(model_name)
        
        if self.text_tokenizer.pad_token is None:
            self.text_tokenizer.pad_token = self.text_tokenizer.eos_token
            
        print(f"MultiModalEngine initialized with Text Encoder ({model_name}).")

    def forward(self, tabular_data=None, text_data=None):
        encoded_outputs = {}
        if tabular_data is not None:
            print("Extracting features with TabNet module...")
            # A clean, direct call to the nn.Module. It returns (features, m_loss)
            tabular_features, _ = self.tabular_encoder(tabular_data)
            encoded_outputs['tabular'] = tabular_features

        if text_data is not None:
            print("Processing data through Text Transformer encoder...")
            inputs = self.text_tokenizer(text_data, return_tensors="pt", padding=True, truncation=True)
            outputs = self.text_encoder(**inputs)
            text_features = outputs.last_hidden_state.mean(dim=1)
            encoded_outputs['text'] = text_features
        return encoded_outputs


class NeuralBrainCore(nn.Module):
    def __init__(self, text_embed_dim=768, tabular_embed_dim=16, fusion_dim=256, num_heads=8):
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
    def __init__(self):
        super().__init__()
        # Define dimensions explicitly
        TABULAR_INPUT_DIM = 20
        TABULAR_OUTPUT_DIM = 8 + 8 # n_d + n_a
        TEXT_DIM = 768 # distilgpt2 hidden size
        
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
        print(f"Training TabNet module for {epochs} epochs...")
        
        optimizer = torch.optim.Adam(self.perception.tabular_encoder.parameters())
        loss_fn = nn.MSELoss()

        for epoch in range(epochs):
            optimizer.zero_grad()
            features, m_loss = self.perception.tabular_encoder(X_tabular)
            loss = loss_fn(features, y_tabular) + m_loss
            loss.backward()
            optimizer.step()
            print(f"Epoch {epoch+1}/{epochs}, Loss: {loss.item():.4f}")
        
        print("--- Brain Training Finished ---")

    def think(self, data_inputs, query):
        print(f"\n--- New Task ---")
        print(f"Received query: '{query}'")
        perception_output = self.perception.forward(**data_inputs)
        reasoning_output = self.reasoning.forward(perception_output)
        insight = self.conversation.generate_response(query, reasoning_output)
        print(f"Final Insight: {insight}")
        return insight