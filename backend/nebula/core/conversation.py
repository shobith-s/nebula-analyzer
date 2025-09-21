# In backend/nebula/core/conversation.py
# (Only the `generate_response` method changes)
# ... (imports and __init__ are the same)
class NeuralConversationEngine:
    # ... (__init__ is the same)
    
    def generate_response(self, query, features, memory_context="", stats_summary=""): # Add stats_summary
        print("Generating response with rich statistical context...")
        
        # The prompt is now much more detailed
        prompt = (
            "You are NEBULA, a world-class AI data analyst. Your goal is to synthesize a high-level insight. "
            "You have been provided with a user's query and a pre-computed statistical summary of their data. "
            "Use the statistical summary to form a specific, data-driven response.\n\n"
            "--- Statistical Summary ---\n"
            f"{stats_summary}\n"
            "---------------------------\n\n"
            f"{memory_context}"
            f"User Query: {query}\n\n"
            "Generated Insight:"
        )

        inputs = self.tokenizer(prompt, return_tensors="pt")
        
        output_sequences = self.model.generate(
            input_ids=inputs['input_ids'],
            attention_mask=inputs['attention_mask'],
            max_new_tokens=100, # Increase token limit for more detailed answers
            pad_token_id=self.tokenizer.pad_token_id
        )
        
        generated_text = self.tokenizer.decode(output_sequences[0], skip_special_tokens=True)
        insight = generated_text.split("Generated Insight:")[1].strip()
        return insight