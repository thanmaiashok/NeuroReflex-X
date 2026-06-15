import os
import json
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

class CurriculumDirector:
    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY", "")
        if not api_key:
            raise EnvironmentError(
                "GROQ_API_KEY not set. Add it to .env file in project root."
            )
        self.client = Groq(api_key=api_key)
        self.current_difficulty = 1 # Scales up as training progresses

    def generate_next_scenario(self, current_epoch: int, drone_survival_rate: float):
        """
        Calls the Llama 3 model via Groq to dynamically invent a new RL training scenario.
        Provides a JSON config dict containing new wind and obstacle parameters.
        """
        print(f"[CURRICULUM DIRECTOR] Asking AI to generate Scenario {current_epoch}...")
        
        prompt = f"""
        You are the 'Dungeon Master' for a drone reinforcement learning simulation.
        The drone has currently survived {drone_survival_rate}% of the time in Epoch {current_epoch}.
        Your goal is to increase the difficulty to force the neural network to learn new evasion and tracking tactics.

        Provide a raw JSON response (NO markdown, NO extra text) with exactly these parameters:
        {{
            "wind_speed_multiplier": <float between 1.0 and 5.0>,
            "wind_turbulence_freq": <float between 0.1 and 2.0>,
            "obstacle_density": <int between 20 and 100>,
            "prey_aggressiveness": <float between 1.0 and 3.0>
        }}
        """

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {
                        "role": "system",
                        "content": "You output only exact JSON configurations."
                    },
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model="llama-3.3-70b-versatile",
                temperature=0.7,
                max_completion_tokens=200,
            )
            
            response_text = chat_completion.choices[0].message.content.strip()
            
            # Clean up potential markdown blocks if the LLM ignores instructions
            if response_text.startswith("```json"):
                response_text = response_text[7:-3]
            elif response_text.startswith("```"):
                response_text = response_text[3:-3]
                
            config = json.loads(response_text)
            print(f"[CURRICULUM DIRECTOR] New Scenario Generated: {config}")
            return config
            
        except Exception as e:
            print(f"[CURRICULUM DIRECTOR] Groq API Failed or JSON decode error: {e}")
            # Fallback to a difficult default if the API drops
            return {
                "wind_speed_multiplier": 2.0,
                "wind_turbulence_freq": 1.0,
                "obstacle_density": 50,
                "prey_aggressiveness": 1.5
            }
