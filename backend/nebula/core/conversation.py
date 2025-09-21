import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

class NeuralConversationEngine:
    """
    Manages dialogue and generates natural language insights.
    """
    def __init__(self):
        model_name = "EleutherAI/gpt-neo-125M"
        
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(model_name)
        
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        
        print(f"NeuralConversationEngine initialized with efficient model: {model_name}.")

    # FIXED: Added the missing 'anomaly_summary' parameter
    def generate_response(self, query, features, memory_context="", stats_summary="", trend_summary="", anomaly_summary=""):
        """
        Generates a text response based on a query, data features, and analytical summaries.
        """
        print("Generating response with stats, trend, and anomaly context...")
        
        prompt = (
            f"Here is a statistical summary of a dataset:\n{stats_summary}\n\n"
            f"Here is a trend analysis of the first two columns:\n{trend_summary}\n\n"
            f"Here is an anomaly detection summary:\n{anomaly_summary}\n\n"
            f"Based on all this information, please answer the following user question: {query}"
        )

        inputs = self.tokenizer(prompt, return_tensors="pt")
        
        output_sequences = self.model.generate(
            input_ids=inputs['input_ids'],
            attention_mask=inputs['input_ids'].ne(self.tokenizer.pad_token_id),
            max_new_tokens=150,
            pad_token_id=self.tokenizer.pad_token_id,
            do_sample=True, 
            temperature=0.7,
            top_k=50,
        )
        
        generated_text = self.tokenizer.decode(output_sequences[0], skip_special_tokens=True)
        
        insight = generated_text[len(prompt):].strip()
            
        return insight