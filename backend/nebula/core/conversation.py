import os
import requests
from dotenv import load_dotenv
import json

class NeuralConversationEngine:
    """
    Manages dialogue and generates insights using the Hugging Face Inference API.
    """
    def __init__(self):
        load_dotenv()
        self.api_token = os.getenv("HUGGINGFACE_API_TOKEN")
        # We'll use a powerful, instruction-tuned model from Mistral AI
        self.model_url = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2"
        
        if not self.api_token:
            print("HUGGINGFACE_API_TOKEN not found, the AI will not work.")
        else:
            print(f"NeuralConversationEngine initialized with Hugging Face model: mistralai/Mistral-7B-Instruct-v0.2")

    def generate_response(self, query, features, **kwargs):
        if not self.api_token:
            return "Error: Hugging Face API token is not configured."

        print("Generating response with Hugging Face Inference API...")
        
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

        headers = {"Authorization": f"Bearer {self.api_token}"}
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 150,
                "temperature": 0.7,
                "top_p": 0.95,
                "do_sample": True,
                "return_full_text": False
            }
        }

        try:
            response = requests.post(self.model_url, headers=headers, json=payload, timeout=60)
            response.raise_for_status() # Will raise an exception for HTTP error codes
            
            result = response.json()
            insight = result[0].get('generated_text', '').strip()
            return insight
        except requests.exceptions.RequestException as e:
            print(f"Error during Hugging Face API call: {e}")
            # Try to parse a more specific error from the response if possible
            try:
                error_details = e.response.json()
                return f"Sorry, an error occurred with the Hugging Face API: {error_details.get('error', str(e))}"
            except:
                 return f"Sorry, a network error occurred while talking to the Hugging Face API."