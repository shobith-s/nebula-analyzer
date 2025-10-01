import torch
import torch.nn as nn
import numpy as np
from collections import deque
from pytorch_tabnet.tab_model import TabNetRegressor # Import TabNet
from nebula.core.conversation import NeuralConversationEngine

class NEBULABrain: # No longer needs to be an nn.Module
    def __init__(self):
        super().__init__()
        self.memory = deque(maxlen=5)
        
        # Initialize TabNetRegressor with some default parameters
        self.tabular_encoder = TabNetRegressor(
            verbose=1,
            seed=42
        )
        self.conversation = NeuralConversationEngine()
        print("NEBULABrain Initialized with TabNet Encoder.")
    
    # NOTE: Reconfigure is no longer needed as TabNet adapts internally
    
    def train(self, X_tabular, y_tabular, epochs=5):
        print("\n--- Starting Brain Training ---")
        print(f"Training TabNetRegressor for {epochs} epochs...")
        
        # Use TabNet's built-in fit method
        self.tabular_encoder.fit(
            X_train=X_tabular,
            y_train=y_tabular,
            max_epochs=epochs,
            patience=10,
            batch_size=1024,
            eval_set=[(X_tabular, y_tabular)],
            eval_name=['train'],
            eval_metric=['rmse']
        )
        print("--- Brain Training Finished ---")
    
    def get_feature_importances(self):
        print("Extracting TabNet feature importances...")
        # Use TabNet's built-in feature importance attribute
        importances = self.tabular_encoder.feature_importances_
        return importances

    def _get_memory_context(self):
        # ... (This method is unchanged)
        if not self.memory: return ""
        context_str = "Prior Conversation Context:\n"
        for q, i in self.memory:
            context_str += f"- The user asked: '{q}'\n- You answered: '{i}'\n"
        return context_str

    def think(self, tabular_data, query, model_choice="gemini", **kwargs):
        print(f"\n--- New Task ---")
        print(f"Received query: '{query}'")
        
        memory_context = self._get_memory_context()
        
        # NOTE: For TabNet, the primary "feature" is the model's understanding
        # We don't need to pass features to the conversation engine, just the analytical summaries
        
        insight = self.conversation.generate_response(
            query=query, 
            features=None, # Features are now implicit in the model's state
            model_choice=model_choice,
            memory_context=memory_context, 
            **kwargs
        )
        
        self.memory.append((query, insight))
        print(f"Final Insight: {insight}")
        return insight