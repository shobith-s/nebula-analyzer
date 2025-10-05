import torch.nn as nn
from collections import deque
from pytorch_tabnet.pretraining import TabNetPretrainer  # Import the correct TabNet model
from nebula.core.conversation import NeuralConversationEngine

class NEBULABrain:
    def __init__(self):
        super().__init__()
        self.memory = deque(maxlen=5)
        # Initialize the TabNetPretrainer
        self.tabular_encoder = TabNetPretrainer(
            verbose=0,
            seed=42
        )
        self.conversation = NeuralConversationEngine()
        print("NEBULABrain Initialized with TabNet Pretrainer for exploratory analysis.")

    def train(self, X_tabular):
        print("\n--- Starting Self-Supervised Brain Training with TabNet ---")
        # Use the pre-trainer's fit method (no y_tabular needed)
        self.tabular_encoder.fit(
            X_train=X_tabular,
            max_epochs=50,  # Pre-training benefits from more epochs
            patience=10,
            batch_size=1024,
        )
        print("--- Brain Training Finished ---")

    def get_feature_importances(self):
        """
        Safely retrieve feature importances from the TabNet pretrainer.
        Some versions/configs may not expose `network.feature_importances_`.
        In that case, return an empty list (caller can handle gracefully).
        """
        print("Extracting TabNet feature importances...")
        try:
            net = getattr(self.tabular_encoder, "network", None)
            if net is not None and hasattr(net, "feature_importances_"):
                return net.feature_importances_
            print("[NEBULA] TabNet network has no `feature_importances_`; returning empty list.")
            return []
        except Exception as e:
            print(f"[NEBULA] Failed to get feature importances: {e}")
            return []

    def _get_memory_context(self):
        if not self.memory:
            return ""
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
