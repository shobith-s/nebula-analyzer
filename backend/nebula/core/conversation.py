import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

class NeuralConversationEngine:
    def __init__(self):
        model_name = "EleutherAI/gpt-neo-125M"
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModelForCausalLM.from_pretrained(model_name)
        
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token
        
        print(f"NeuralConversationEngine initialized with efficient model: {model_name}.")

    def generate_response(self, query, features, memory_context="", stats_summary="", trend_summary="", anomaly_summary="", xai_summary=""):
        print("Generating response with stats, trend, anomaly, and XAI context...")
        
        prompt = (
            "You are NEBULA, a world-class AI data analyst. Your task is to provide a data-driven insight. "
            "You have been provided with a user's query and several pre-computed analyses of their data. "
            "Synthesize these pieces of information into a single, coherent, human-readable insight.\n\n"
            f"--- Statistical Summary ---\n{stats_summary}\n\n"
            f"--- Trend Analysis ---\n{trend_summary}\n\n"
            f"--- Feature Importance (XAI) Summary ---\n{xai_summary}\n\n"
            f"--- User Query ---\n{query}\n\n"
            "Generated Insight:"
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
        
        if "Generated Insight:" in generated_text:
            insight = generated_text.split("Generated Insight:")[1].strip()
        else:
            # Fallback if the model doesn't repeat the split string
            insight = generated_text[len(prompt):].strip()
            
        return insight