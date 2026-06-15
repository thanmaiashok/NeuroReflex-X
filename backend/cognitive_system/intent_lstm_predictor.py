import torch
import torch.nn as nn

class IntentLSTMPredictor(nn.Module):
    def __init__(self, input_size=4, hidden_size=32, output_size=2):
        super(IntentLSTMPredictor, self).__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, batch_first=True)
        self.fc = nn.Linear(hidden_size, output_size)

    def forward(self, x):
        out, _ = self.lstm(x)
        out = self.fc(out[:, -1, :])
        return out
