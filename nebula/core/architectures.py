import torch
import torch.nn as nn
from pytorch_tabnet.tab_model import TabNetRegressor
from transformers import AutoTokenizer, AutoModel


class MultiModalEngine(nn.Module):
    """
    Unified understanding across different data types (tabular, text, etc.).
    This will house encoders like TabNet, BERT, and ViT.
    """
    def __init__(self):
        super().__init__()
        # --- Tabular Encoder ---
        self.tabular_encoder = TabNetRegressor(verbose=0)
        print("MultiModalEngine initialized with TabNetRegressor.")
        
        # --- Text Encoder ---
        model_name = "distilbert-base-uncased"
        self.text_tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.text_encoder = AutoModel.from_pretrained(model_name)
        print(f"MultiModalEngine initialized with Text Encoder ({model_name}).")

    def forward(self, tabular_data=None, text_data=None):
        """
        Processes different data modalities through their respective encoders.
        """
        encoded_outputs = {}
        
        if tabular_data is not None:
            # This is a placeholder for the actual TabNet forward pass after training
            print("Processing data through TabNetRegressor encoder...")
            output_dim = self.tabular_encoder.n_a + self.tabular_encoder.n_d
            simulated_features = torch.randn(tabular_data.shape[0], output_dim)
            encoded_outputs['tabular'] = simulated_features
        
        if text_data is not None:
            print("Processing data through Text Transformer encoder...")
            inputs = self.text_tokenizer(text_data, return_tensors="pt", padding=True, truncation=True)
            outputs = self.text_encoder(**inputs)
            text_features = outputs.last_hidden_state.mean(dim=1)
            encoded_outputs['text'] = text_features

        return encoded_outputs


class NeuralBrainCore(nn.Module):
    """
    Fuses multi-modal features and performs core reasoning.
    """
    def __init__(self, text_embed_dim=768, tabular_embed_dim=16, fusion_dim=256, num_heads=8):
        super().__init__()
        print("NeuralBrainCore Initialized with Fusion Layer.")
        
        # --- Fusion Layer Components ---
        # Linear layers to project both modalities to a common dimension
        self.text_projection = nn.Linear(text_embed_dim, fusion_dim)
        self.tabular_projection = nn.Linear(tabular_embed_dim, fusion_dim)
        
        # The cross-attention layer
        self.cross_attention = nn.MultiheadAttention(
            embed_dim=fusion_dim,
            num_heads=num_heads,
            batch_first=True  # Expects (batch, seq, feature) format
        )
        self.layer_norm = nn.LayerNorm(fusion_dim)

    def forward(self, encoded_data):
        print("Fusing features with NeuralBrainCore...")
        
        tabular_features = encoded_data.get('tabular')
        text_features = encoded_data.get('text')

        if tabular_features is None or text_features is None:
            raise ValueError("Cross-attention requires both tabular and text features.")

        # Project features to the common fusion dimension
        text_proj = self.text_projection(text_features)
        tabular_proj = self.tabular_projection(tabular_features)

        # Reshape for MultiheadAttention: (batch, seq_len, embed_dim)
        # We treat each modality's features as a "sequence" of length 1
        text_proj = text_proj.unsqueeze(1)
        tabular_proj = tabular_proj.unsqueeze(1)
        
        # Perform cross-attention: text is the query, tabular is the key/value
        # This asks the question: "Based on the text, what parts of the tabular data are important?"
        fused_output, _ = self.cross_attention(
            query=text_proj,
            key=tabular_proj,
            value=tabular_proj
        )
        
        # Normalize and remove the sequence dimension
        fused_output = self.layer_norm(fused_output).squeeze(1)
        
        print(f"  - Fused features created with shape: {fused_output.shape}")
        return fused_output


class NEBULABrain(nn.Module):
    """
    The main orchestrator of the deep learning brain.
    """
    def __init__(self):
        super().__init__()
        self.perception = MultiModalEngine()
        # Pass the feature dimensions from the perception engine to the core
        text_dim = self.perception.text_encoder.config.hidden_size
        tabular_dim = self.perception.tabular_encoder.n_a + self.perception.tabular_encoder.n_d
        self.reasoning = NeuralBrainCore(text_embed_dim=text_dim, tabular_embed_dim=tabular_dim)
        print("NEBULA Brain Initialized and all core components loaded.")

    def think(self, data_inputs, query):
        """Processes a dictionary of data inputs and a query to generate an insight."""
        print(f"\n--- New Task ---")
        print(f"Received query: '{query}'")
        
        perception_output = self.perception.forward(**data_inputs)
        
        reasoning_output = self.reasoning.forward(perception_output)
        
        insight = f"Generated Insight Placeholder (Fused Feature Shape: {reasoning_output.shape})"
        print(f"Final Insight: {insight}")
        return insight