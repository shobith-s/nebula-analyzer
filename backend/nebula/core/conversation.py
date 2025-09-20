# In backend/nebula/core/conversation.py
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

class NeuralConversationEngine:
    """
    Manages dialogue and generates natural language insights.
    """
    def __init__(self):
        # CHANGED: Swapped to a lighter, faster, but still intelligent model
        model_name = "EleutherAI/gpt-neo-125M"
        
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(model_name)
        
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        
        print(f"NeuralConversationEngine initialized with efficient model: {model_name}.")

    def generate_response(self, query, features, memory_context=""):
        """
        Generates a text response based on a query and data features.
        """
        print("Generating response with Conversation Engine...")
        data_summary = f"Data analysis of {features.shape[0]} items resulted in a feature representation."

        prompt = (
            "You are NEBULA, an AI data analyst. Based on the user's query and a summary of the available data, provide a concise, expert-level insight. "
            "If prior conversation context is provided, use it to inform your response.\n\n"
            f"{memory_context}"
            f"Current Query: {query}\n"
            f"Current Data Summary: {data_summary}\n\n"
            "Generated Insight:"
        )

        inputs = self.tokenizer(prompt, return_tensors="pt")
        
        output_sequences = self.model.generate(
            input_ids=inputs['input_ids'],
            attention_mask=inputs['attention_mask'],
            max_new_tokens=60,
            pad_token_id=self.tokenizer.pad_token_id,
            num_return_sequences=1,
            no_repeat_ngram_size=2,
            temperature=0.7,
            top_k=50,
        )
        
        generated_text = self.tokenizer.decode(output_sequences[0], skip_special_tokens=True)
        
        insight = generated_text.split("Generated Insight:")[1].strip()
        
        return insight