import os
import json
import torch
from dotenv import load_dotenv
load_dotenv()  # loads .env when run directly or as subprocess
from stable_baselines3 import PPO
from stable_baselines3.ppo import MlpPolicy
from pettingzoo.utils import parallel_to_aec
import supersuit as ss
from backend.rl_training.predator_prey_env import PredatorPreyEnv
from backend.rl_training.curriculum_director import CurriculumDirector

STATUS_FILE = "./backend/rl_training/rl_status.json"

def write_status(status_dict):
    os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
    with open(STATUS_FILE, "w") as f:
        json.dump(status_dict, f)

# Global training status for the API to read
training_status = {
    "is_training": False,
    "current_epoch": 0,
    "total_epochs": 5,
    "message": "Idle",
    "is_downloadable": False
}

def train_async():
    global training_status
    training_status["is_training"] = True
    training_status["is_downloadable"] = False
    training_status["message"] = "Initializing Co-Evolution Environment..."
    write_status(training_status)
    
    # Initialize our custom physics environment
    base_env = PredatorPreyEnv()
    
    # SB3 requires all agents to have the exact same observation and action space sizes
    # Since the Drone has more sensors (9) than the Prey (5), we pad the Prey with zeros
    env = ss.pad_observations_v0(base_env)
    env = ss.pad_action_space_v0(env)
    
    # Bundle the agents sequentially into a single stable PyTorch environment
    env = ss.pettingzoo_env_to_vec_env_v1(env)
    env = ss.concat_vec_envs_v1(env, 1, num_cpus=1, base_class='stable_baselines3') # 1 Env, 1 CPU = NO multiprocessing deadlocks
    
    model = PPO(
        MlpPolicy,
        env,
        verbose=0,
        learning_rate=1e-3,
        batch_size=256,
        tensorboard_log="./backend/rl_training/logs/",
        device="cuda" if torch.cuda.is_available() else "cpu"
    )
    
    director = CurriculumDirector()
    
    for epoch in range(1, training_status["total_epochs"] + 1):
        training_status["current_epoch"] = epoch
        training_status["message"] = f"Epoch {epoch}/{training_status['total_epochs']}: Simulating Combat Flights..."
        write_status(training_status)
        
        # Train for a chunk
        model.learn(total_timesteps=15000, reset_num_timesteps=False)
        
        # Call the LLM to get new scenarios
        training_status["message"] = f"Epoch {epoch}: LLM Curriculum Generating Next Scenario..."
        write_status(training_status)
        
        new_config = director.generate_next_scenario(current_epoch=epoch, drone_survival_rate=75.0)
        
        # Apply the LLM config to the base environment
        base_env.apply_curriculum(new_config)

    
    training_status["message"] = "Exporting Finalized Brain Cell Models..."
    write_status(training_status)
    os.makedirs("./backend/rl_training/models", exist_ok=True)
    model.save("./backend/rl_training/models/drone_brain_cell_v1")
    
    training_status["is_training"] = False
    training_status["is_downloadable"] = True
    training_status["message"] = "Training Complete. Ready for Deployment."
    write_status(training_status)

if __name__ == "__main__":
    train_async()
