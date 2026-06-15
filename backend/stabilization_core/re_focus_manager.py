class ReFocusManager:
    def __init__(self):
        self.reset_flag = False

    def trigger(self):
        self.reset_flag = True

    def clear(self):
        self.reset_flag = False
