import os
import google.generativeai as genai
from dotenv import load_dotenv
from transformers import AutoTokenizer, AutoModelForCausalLM

class NeuralConversationEngine:
    """
    Manages dialogue and can use either a local model or the Gemini API.
    """
    def __init__(self):
        # --- 1. Configure Gemini API ---
        self.gemini_model = None
        try:
            load_dotenv()
            api_key = os.getenv("GOOGLE_API_KEY")
            if api_key:
                genai.configure(api_key=api_key)
                self.gemini_model = genai.GenerativeModel('gemini-1.5-pro-latest')
                print("NeuralConversationEngine initialized with Google Gemini 1.5 Pro.")
            else:
                print("Gemini API key not found, Gemini model will be unavailable.")
        except Exception as e:
            print(f"Error initializing Gemini: {e}")

        # --- 2. Load Local Model ---
        local_model_name = "EleutherAI/gpt-neo-125M"
        self.local_tokenizer = AutoTokenizer.from_pretrained(local_model_name)
        self.local_model = AutoModelForCausalLM.from_pretrained(local_model_name)
        if self.local_tokenizer.pad_token is None:
            self.local_tokenizer.pad_token = self.local_tokenizer.eos_token
        print(f"NeuralConversationEngine also initialized with local model: {local_model_name}.")

    def generate_response(self, query, features, model_choice="gemini", **kwargs):
        prompt = (
            "You are NEBULA, a world-class AI data analyst. Your task is to provide a data-driven insight. "
            "You have been provided with a user's query and several pre-computed analyses of their data. "
            "Synthesize these pieces of information into a single, coherent, human-readable insight.\n\n"
            f"--- Statistical Summary ---\n{kwargs.get('stats_summary', 'Not available.')}\n\n"
            f"--- Trend Analysis ---\n{kwargs.get('trend_summary', 'Not available.')}\n\n"
            f"--- Feature Importance (XAI) Summary ---\n{kwargs.get('xai_summary', 'Not available.')}\n\n"
            f"--- User Query ---\n{query}\n\n"
            "Generated Insight:"
        )

        if model_choice == "gemini" and self.gemini_model:
            print("Generating response with Gemini Pro...")
            try:
                response = self.gemini_model.generate_content(prompt)
                return response.text.strip()
            except Exception as e:
                print(f"Error during Gemini API call: {e}")
                return f"Sorry, an error occurred with the Gemini API: {e}"
        else:
            print("Generating response with local GPT-Neo model...")
            inputs = self.local_tokenizer(prompt, return_tensors="pt")
            output_sequences = self.local_model.generate(
                input_ids=inputs['input_ids'],
                attention_mask=inputs['input_ids'].ne(self.local_tokenizer.pad_token_id),
                max_new_tokens=150,
                pad_token_id=self.local_tokenizer.pad_token_id,
                do_sample=True, temperature=0.7, top_k=50,
            )
            generated_text = self.local_tokenizer.decode(output_sequences[0], skip_special_tokens=True)
            insight = generated_text.split("Generated Insight:")[-1].strip()
            return insight