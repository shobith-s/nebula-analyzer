# In nebula/core/conversation.py
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

class NeuralConversationEngine:
    """
    Manages dialogue and generates natural language insights.
    """
    def __init__(self):
        # CHANGED: Upgraded to a more instruction-aware model
        model_name = "distilgpt2"
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(model_name)
        
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        
        print(f"NeuralConversationEngine initialized with {model_name}.")

    def generate_response(self, query, fused_features):
        """
        Generates a text response based on a query and fused data features.
        """
        print("Generating response with Conversation Engine...")
        context = f"Data analysis of {fused_features.shape[0]} items resulted in a unified data representation."

        # CHANGED: Improved prompt structure for better instructions
        prompt = (
            "Based on the following query and data summary, provide a concise insight.\n\n"
            f"Query: {query}\n"
            f"Data Summary: {context}\n\n"
            "Generated Insight:"
        )

        inputs = self.tokenizer(prompt, return_tensors="pt")
        
        output_sequences = self.model.generate(
            input_ids=inputs['input_ids'],
            # CHANGED: Added the attention_mask to resolve the warning
            attention_mask=inputs['attention_mask'],
            max_new_tokens=30,  # A better way to control length
            pad_token_id=self.tokenizer.pad_token_id,
            num_return_sequences=1,
            no_repeat_ngram_size=2
            # CHANGED: Removed the invalid 'early_stopping' flag
        )
        
        generated_text = self.tokenizer.decode(output_sequences[0], skip_special_tokens=True)
        
        # Extract only the part after our prompt's instruction
        insight = generated_text.split("Generated Insight:")[1].strip()
        
        return insight