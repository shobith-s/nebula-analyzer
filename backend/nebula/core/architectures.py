import torch.nn as nn
from collections import deque
from pytorch_tabnet.tab_model import TabNetRegressor
from nebula.core.conversation import NeuralConversationEngine

class NEBULABrain:
    def __init__(self):
        super().__init__()
        self.memory = deque(maxlen=5)
        self.tabular_encoder = TabNetRegressor(verbose=0, seed=42)
        self.conversation = NeuralConversationEngine()
        print("NEBULABrain Initialized with TabNet Encoder.")
    
    def train(self, X_tabular, y_tabular):
        print("\n--- Starting Brain Training with TabNet ---")
        self.tabular_encoder.fit(
            X_train=X_tabular,
            y_train=y_tabular,
            max_epochs=25,
            patience=10,
            batch_size=1024,
        )
        print("--- Brain Training Finished ---")
    
    def get_feature_importances(self):
        print("Extracting TabNet feature importances...")
        importances = self.tabular_encoder.feature_importances_
        return importances

    def _get_memory_context(self):
        if not self.memory: return ""
        context_str = "Prior Conversation History:\n"
        for q, i in self.memory:
            context_str += f"- The user asked: '{q}'\n- You answered: '{i}'\n"
        return context_str

    def think(self, query, model_choice="gemini", **kwargs):
        print(f"\n--- New Task ---")
        print(f"Received query: '{query}'")
        
        memory_context = self._get_memory_context()
        
        insight = self.conversation.generate_response(
            query=query, 
            features=None, 
            model_choice=model_choice,
            memory_context=memory_context, 
            **kwargs
        )
        
        self.memory.append((query, insight))
        print(f"Final Insight: {insight}")
        return insight