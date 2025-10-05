import os
from typing import Optional

import google.generativeai as genai
from dotenv import load_dotenv

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM


class NeuralConversationEngine:
    """
    Generates the narrative "Insight" for NEBULA.
    - Prefers Gemini if GOOGLE_API_KEY is set.
    - Falls back to a small local model (GPT-Neo 125M) if Gemini is unavailable.
    """

    def __init__(self):
        # ---------- Configure Gemini ----------
        self.gemini_model = None
        try:
            load_dotenv()
            api_key = os.getenv("GOOGLE_API_KEY")
            if api_key:
                genai.configure(api_key=api_key)
                # You can change to a different Gemini family here if you like.
                self.gemini_model = genai.GenerativeModel("gemini-1.5-pro-latest")
                print("NeuralConversationEngine initialized with Google Gemini 1.5 Pro.")
            else:
                print("Gemini API key not found, Gemini model will be unavailable.")
        except Exception as e:
            print(f"Error initializing Gemini: {e}")

        # ---------- Load Local Model ----------
        self.local_model_name = "EleutherAI/gpt-neo-125M"
        try:
            self.local_tokenizer = AutoTokenizer.from_pretrained(self.local_model_name)
            self.local_model = AutoModelForCausalLM.from_pretrained(self.local_model_name)
            if self.local_tokenizer.pad_token is None:
                self.local_tokenizer.pad_token = self.local_tokenizer.eos_token
            self.device = "cuda" if torch.cuda.is_available() else "cpu"
            self.local_model.to(self.device).eval()
            print(f"NeuralConversationEngine also initialized with local model: {self.local_model_name}.")
        except Exception as e:
            # If this fails, we will rely entirely on Gemini.
            self.local_tokenizer = None
            self.local_model = None
            self.device = "cpu"
            print(f"Failed to load local model ({self.local_model_name}): {e}")

    # ---------- Prompt helpers ----------

    @staticmethod
    def _truncate(text: Optional[str], *, max_chars: int = 1500, max_lines: int = 60) -> str:
        if not text:
            return ""
        s = str(text)
        if len(s) > max_chars:
            s = s[:max_chars] + " …"
        lines = s.splitlines()
        if len(lines) > max_lines:
            s = "\n".join(lines[:max_lines]) + "\n…"
        return s

    def _build_prompt(
        self,
        query: str,
        *,
        memory_context: str = "",
        stats_summary: str = "",
        trend_summary: str = "",
        anomaly_summary: str = "",
        xai_summary: str = "",
    ) -> str:
        mem = self._truncate(memory_context, max_chars=800, max_lines=20)
        stats = self._truncate(stats_summary, max_chars=1800, max_lines=80)
        trends = self._truncate(trend_summary, max_chars=600, max_lines=20)
        anoms = self._truncate(anomaly_summary, max_chars=600, max_lines=20)
        xai = self._truncate(xai_summary, max_chars=600, max_lines=20)

        # Keep the instruction crisp so models focus on the numbers you pass.
        prompt = f"""You are NEBULA, a precise, data-grounded analytics assistant.
Answer the user's query using ONLY the numeric/summary information provided below. Avoid speculation.

### User Query
{query}

### Data Context
- Key Stats (may be partial): 
{stats}

- XAI summary (if any): {xai}
- Trends (if any): {trends}
- Anomalies (if any): {anoms}

### Conversation Hints (optional)
{mem or "None"}

### Output Guidelines
- Be concise (3–6 bullet points or a short paragraph).
- Cite concrete numbers you see in the stats when relevant.
- Do NOT restate the entire prompt; go straight to the answer.
- If the data is insufficient, say exactly what is missing.

### Response:
"""
        return prompt

    # ---------- Engines ----------

    def _gen_with_gemini(self, prompt: str) -> Optional[str]:
        if not self.gemini_model:
            return None
        try:
            response = self.gemini_model.generate_content(
                prompt,
                generation_config=dict(
                    temperature=0.4,
                    top_p=0.9,
                    top_k=40,
                    max_output_tokens=350,
                ),
            )
            text = getattr(response, "text", None)
            if text:
                return text.strip()
            # Some SDK versions return candidates
            if getattr(response, "candidates", None):
                for c in response.candidates:
                    if getattr(c, "content", None) and getattr(c.content, "parts", None):
                        parts = [p.text for p in c.content.parts if hasattr(p, "text")]
                        if parts:
                            return "\n".join(parts).strip()
        except Exception as e:
            print(f"Error during Gemini generation: {e}")
        return None

    def _gen_with_local(self, prompt: str) -> str:
        if not (self.local_model and self.local_tokenizer):
            return "(Insight unavailable) No local model."
        try:
            inputs = self.local_tokenizer(
                prompt, return_tensors="pt", truncation=True, max_length=2048
            )
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            output_ids = self.local_model.generate(
                **inputs,
                max_new_tokens=220,
                do_sample=True,
                temperature=0.6,
                top_p=0.9,
                pad_token_id=self.local_tokenizer.pad_token_id,
                eos_token_id=self.local_tokenizer.eos_token_id,
            )
            full = self.local_tokenizer.decode(output_ids[0], skip_special_tokens=True)
            # Heuristic: return everything after the last "### Response:" if present.
            if "### Response:" in full:
                return full.split("### Response:")[-1].strip()
            if "### Response" in full:
                return full.split("### Response")[-1].strip(":").strip()
            # Fallback: return tail after our "### Output Guidelines"
            if "### Response:" not in prompt:
                tail = full.split("### Output Guidelines")[-1]
                return tail.strip()
            return full.strip()
        except Exception as e:
            return f"(Insight unavailable) Local generation error: {e}"

    # ---------- Public API ----------

    def generate_response(self, query, features=None, model_choice: str = "gemini", **kwargs) -> str:
        """
        Returns the narrative insight text.
        kwargs may include: memory_context, stats_summary, trend_summary, anomaly_summary, xai_summary
        """
        prompt = self._build_prompt(
            query=query,
            memory_context=kwargs.get("memory_context", "") or "",
            stats_summary=kwargs.get("stats_summary", "") or "",
            trend_summary=kwargs.get("trend_summary", "") or "",
            anomaly_summary=kwargs.get("anomaly_summary", "") or "",
            xai_summary=kwargs.get("xai_summary", "") or "",
        )

        # Prefer Gemini when selected and available
        if model_choice == "gemini" and self.gemini_model:
            text = self._gen_with_gemini(prompt)
            if text:
                return text

        # Fallback to local model
        return self._gen_with_local(prompt)
