import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

class NeuralConversationEngine:
    """
    Manages dialogue and generates natural language insights.
    """
    def __init__(self):
        model_name = "distilgpt2"
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(model_name)
        
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        
        print(f"NeuralConversationEngine initialized with {model_name}.")

    def generate_response(self, query, fused_features, memory_context=""):
        """
        Generates a text response based on a query and fused data features.
        """
        print("Generating response with Conversation Engine...")
        data_summary = f"Data analysis of {fused_features.shape[0]} items resulted in a unified data representation."

        prompt = (
            "You are NEBULA, an AI data analyst. Based on the user's query and the data summary, provide a concise insight. "
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
            max_new_tokens=40,
            pad_token_id=self.tokenizer.pad_token_id,
            num_return_sequences=1,
            no_repeat_ngram_size=2
        )
        
        generated_text = self.tokenizer.decode(output_sequences[0], skip_special_tokens=True)
        
        insight = generated_text.split("Generated Insight:")[1].strip()
        
        return insight