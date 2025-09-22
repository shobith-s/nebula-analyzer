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
        self.model_url = "https://api-inference.huggingface.co/models/gpt2"
        
        # --- NEW: Verification Logging ---
        if not self.api_token:
            print("🔴 CRITICAL: HUGGINGFACE_API_TOKEN not found in .env file.")
        else:
            # Print the first few characters of the token to confirm it's loaded
            print(f"✅ HUGGINGFACE_API_TOKEN loaded successfully, starting with: {self.api_token[:4]}...")
        # --------------------------------

        print(f"NeuralConversationEngine initialized with DIAGNOSTIC model: gpt2")

    def generate_response(self, query, features, **kwargs):
        if not self.api_token:
            return "Error: Hugging Face API token is not configured."

        print("Generating response with Hugging Face Inference API...")
        
        prompt = (
            "You are NEBULA, a world-class AI data analyst..." # Prompt is the same
            # ... (rest of the prompt)
        )

        headers = {"Authorization": f"Bearer {self.api_token}"}
        payload = { "inputs": prompt, "parameters": { "max_new_tokens": 150 } }

        try:
            response = requests.post(self.model_url, headers=headers, json=payload, timeout=60)
            response.raise_for_status() 
            result = response.json()
            insight = result[0].get('generated_text', '').strip()
            return insight
        except requests.exceptions.RequestException as e:
            # --- NEW: Detailed Error Logging ---
            print("\n" + "="*20 + " API ERROR " + "="*20)
            print(f"Full error details: {e}")
            if e.response:
                print(f"Response Status Code: {e.response.status_code}")
                print(f"Response Body: {e.response.text}")
            print("="*51 + "\n")
            # -----------------------------------
            
            # Return a more informative error to the frontend
            if e.response and e.response.status_code == 401:
                return "Sorry, an error occurred: 401 Unauthorized. Please check if your Hugging Face API token is correct in the .env file."
            else:
                 return "Sorry, a network error occurred while talking to the Hugging Face API. Check the backend log for details."