import numpy as np

class SelfLearningPredictor:
    """
    Adaptive filter (Least Mean Squares style) that learns to predict 
    the target's next position by dynamically updating its velocity weights.
    """
    def __init__(self, learning_rate=0.01):
        self.learning_rate = learning_rate
        self.reset()

    def reset(self):
        # Weights for [Velocity X, Velocity Y]
        self.weights = np.array([1.0, 1.0]) 
        self.prev_pos = None
        self.prev_prediction = None
        self.learning_gain = 0.0

    def update_and_predict(self, current_pos_noisy):
        """
        1. Learn from previous prediction error.
        2. Predict next position based on updated weights.
        """
        current_pos = np.array(current_pos_noisy)

        # 1. LEARNING PHASE (Adjust weights based on past error)
        if self.prev_prediction is not None and self.prev_pos is not None:
            # How wrong were we?
            error_vector = current_pos - self.prev_prediction
            
            # The "input feature" was the previous velocity
            prev_velocity = current_pos - self.prev_pos
            
            # Gradient Descent Update Rule: W_new = W_old + LR * Error * Input
            # We scale the error by the velocity intent to adjust the weight
            weight_update = self.learning_rate * error_vector * prev_velocity
            
            # Prevent exploding weights
            weight_update = np.clip(weight_update, -0.1, 0.1) 
            self.weights += weight_update
            
            # Track average learning gain for dashboard visualization
            self.learning_gain = float(np.linalg.norm(weight_update)) * 10.0 # Scale for viz

        # 2. PREDICTION PHASE
        if self.prev_pos is None:
            # First tick, just assume it stays still
            predicted_pos = current_pos.copy()
            self.prev_pos = current_pos.copy()
            self.prev_prediction = predicted_pos
            return predicted_pos.tolist(), self.learning_gain

        # Calculate current apparent velocity
        current_velocity = current_pos - self.prev_pos
        
        # Apply learned weights to predict future state
        predicted_pos = current_pos + (current_velocity * self.weights)
        
        # Store state for next tick's learning phase
        self.prev_pos = current_pos.copy()
        self.prev_prediction = predicted_pos.copy()

        return predicted_pos.tolist(), self.learning_gain
