import pandas 
import torch
import torch.nn as nn
import torch.nn.functional as F

class CatBreedANN(nn.Module):
    def __init__(self):
        super(CatBreedANN, self).__init__()
        self.fc1 = nn.Linear(4096, 200)
        self.fc2 = nn.Linear(200, 20)
        self.fc3 = nn.Linear(20, 8)

    def forward(self, x):
        x = F.leaky_relu(self.fc1(x))
        x = F.leaky_relu(self.fc2(x))
        x = self.fc3(x)
        return x
        
        
class CatAgeANN(nn.Module):
    def __init__(self):
        super(CatAgeANN, self).__init__()
        self.fc1 = nn.Linear(4096, 200)
        self.fc2 = nn.Linear(200, 20)

        self.fc3 = nn.Linear(20, 1)

    def forward(self, x):
        x = F.leaky_relu(self.fc1(x))
        x = F.leaky_relu(self.fc2(x))
        x = self.fc3(x)
        return x