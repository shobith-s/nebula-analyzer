# In nebula/core/conversation.py
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

class NeuralConversationEngine:
    """
    Manages dialogue and generates natural language insights.
    """
    def __init__(self):
        model_name = "gpt2"
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(model_name)
        # Add a padding token if it doesn't exist
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        print(f"NeuralConversationEngine initialized with {model_name}.")

    def generate_response(self, query, fused_features):
        """
        Generates a text response based on a query and fused data features.
        """
        print("Generating response with Conversation Engine...")
        # Create a descriptive context from the fused features
        context = f"Data analysis of {fused_features.shape[0]} items resulted in a unified data representation."

        # Create a prompt for the language model
        prompt = f"Query: {query}\nContext: {context}\nInsight:"

        inputs = self.tokenizer(prompt, return_tensors="pt")
        
        # Generate text using the model
        output_sequences = self.model.generate(
            input_ids=inputs['input_ids'],
            max_length=50,  # Limit the length of the generated response
            pad_token_id=self.tokenizer.pad_token_id,
            num_return_sequences=1,
            no_repeat_ngram_size=2,
            early_stopping=True
        )
        
        # Decode the generated sequence to a string
        generated_text = self.tokenizer.decode(output_sequences[0], skip_special_tokens=True)
        
        # Extract only the part after our prompt
        insight = generated_text.split("Insight:")[1].strip()
        
        return insight