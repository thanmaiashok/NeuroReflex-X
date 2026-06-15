import numpy as np

# Heights encode obstacle type — frontend maps height → visual component
_FOREST_HEIGHTS = [7.0, 5.0, 1.5, 0.5]   # PineTree, DeadTree, Rock, FallenLog
_URBAN_HEIGHTS  = [2.5, 0.8, 1.8, 4.5]   # RuinedWall, CraterRim, Bunker, Watchtower

class MotionGenerator:
    def __init__(self, dt=0.1, max_speed=3.0):
        self.dt = dt
        self.obstacles = []
        self.max_speed = 2.5    # Relaxed tactical base
        self.max_force = 6.0    # Snappy Panic Steering
        self.panic_timer = 0.0  # Sustained momentum timer
        self.wander_angle = 0.0 # For smooth wandering
        self.is_active = True
        self.is_stationary = False
        self.reset()
        self.generate_forest(15) 

    def reset(self):
        self.position = np.array([0.0, 0.0])
        self.velocity = np.array([0.0, 0.0])
        self.acceleration = np.array([0.0, 0.0])
        self.destination = None
        self.is_active = True
        self.mass = 70.0
        self.wander_angle = np.random.uniform(0, 2*np.pi)

    def generate_forest(self, count):
        self.obstacles = []
        for i in range(count):
            xy = np.random.uniform(-148, 148, 2)
            h = _FOREST_HEIGHTS[i % len(_FOREST_HEIGHTS)]
            self.obstacles.append(np.array([xy[0], xy[1], h]))

    def generate_urban(self, count):
        self.obstacles = []
        for i in range(count):
            x = float(np.random.randint(-148, 148))
            y = float(np.random.randint(-148, 148))
            h = _URBAN_HEIGHTS[i % len(_URBAN_HEIGHTS)]
            self.obstacles.append(np.array([x, y, h]))

    def generate_mixed(self, count=60):
        """60% dense forest + 40% battleground ruins."""
        self.obstacles = []
        forest_count = int(count * 0.6)
        urban_count  = count - forest_count
        for i in range(forest_count):
            xy = np.random.uniform(-148, 148, 2)
            h = _FOREST_HEIGHTS[i % len(_FOREST_HEIGHTS)]
            self.obstacles.append(np.array([xy[0], xy[1], h]))
        for i in range(urban_count):
            xy = np.random.uniform(-148, 148, 2)
            h = _URBAN_HEIGHTS[i % len(_URBAN_HEIGHTS)]
            self.obstacles.append(np.array([xy[0], xy[1], h]))

    def add_obstacle(self, x, y, h=1.8):
        self.obstacles.append(np.array([x, y, h]))

    def clear_obstacles(self):
        self.obstacles = []

    def set_destination(self, x, y):
        # Massive Map Clamp (Phase 13)
        x = np.clip(x, -149.0, 149.0)
        y = np.clip(y, -149.0, 149.0)
        self.destination = np.array([x, y])

    def get_height(self, x, y):
        """
        Deterministic Terrain Height Mapping.
        Combines sine waves of different frequencies for smooth rolling hills.
        """
        sc = 0.15 # scale
        h = np.sin(x * sc) * 2.5 + np.cos(y * sc * 1.2) * 1.5
        h += np.sin((x+y) * sc * 2.0) * 0.5 # Add secondary detail
        return float(h)

    def cast_rays(self, num_rays=12, range_limit=8.0):
        rays = []
        for i in range(num_rays):
            angle = (i / num_rays) * 2 * np.pi
            direction = np.array([np.cos(angle), np.sin(angle)])
            min_dist = range_limit

            for obs in self.obstacles:
                oc = obs[:2] - self.position
                proj = np.dot(oc, direction)
                
                if proj > 0: 
                    dist_sq = np.dot(oc, oc)
                    radius_sq = 0.8**2 # Slightly larger collision radius for human
                    if dist_sq - proj**2 < radius_sq:
                        hit_dist = proj - np.sqrt(radius_sq - (dist_sq - proj**2))
                        if hit_dist < min_dist:
                            min_dist = hit_dist
            
            rays.append((angle, min_dist))
        return rays

    def teleport(self, x, y):
        """Teleport the target to a specific location and reset physics."""
        self.position = np.array([float(x), float(y)])
        self.velocity = np.array([0.0, 0.0])
        self.acceleration = np.array([0.0, 0.0])
        self.destination = None # Clear any previous goal

    def update(self, drone_pos=None):
        sonar_active = False
        repulsion = np.array([0.0, 0.0])
        reflex_activation = 0.0
        levy_action_log = 0.0
        
        # Initialize all forces to zero
        wander_force = np.array([0.0, 0.0])
        evasion_force = np.array([0.0, 0.0])
        obstacle_force = np.array([0.0, 0.0])
        wall_force = np.array([0.0, 0.0])
        dest_force = np.array([0.0, 0.0])

        current_max_speed = self.max_speed

        if self.is_active:
            repulsion = np.array([0.0, 0.0])
            sonar_active = False

            if self.is_stationary:
                # Fully frozen for the truck
                self.velocity = np.array([0.0, 0.0])
                self.acceleration = np.array([0.0, 0.0])
                return self.position.copy(), self.velocity.copy(), False, 0.0, 0.0

            # 1. Base Wander Force (Smooth unpredictable roaming)
            self.wander_angle += np.random.uniform(-0.8, 0.8)
            wander_force = np.array([np.cos(self.wander_angle), np.sin(self.wander_angle)]) * 500.0
            
            # 2. Drone Evasion & Dynamic Speed (THREAT DETECTION)
            if drone_pos is not None:
                dist_to_drone = np.linalg.norm(self.position - drone_pos)
                if dist_to_drone < 25.0:
                    # Panic Phase: Early Detection & Tactical Sprint
                    self.panic_timer = 3.0 # Sustain panic for 3 seconds
                    threat_intensity = 1.0 - (dist_to_drone / 25.0)
                    current_max_speed = min(4.0, self.max_speed * (1.1 + threat_intensity * 1.5)) 
                    diff = (self.position - drone_pos)
                    norm_diff = np.linalg.norm(diff)
                    evade_dir = diff / (norm_diff + 1e-6)
                    evasion_force = evade_dir * (4000.0 / (dist_to_drone + 0.5))
                elif self.panic_timer > 0:
                    # Sustained panic momentum
                    self.panic_timer -= self.dt
                    current_max_speed = 3.8 # Keep running at high speed even if drone lost
                    evasion_force = (self.velocity / (np.linalg.norm(self.velocity) + 0.1)) * 40.0 # Maintain direction
                else:
                    evasion_force = np.array([0.0, 0.0])
            # 3. Obstacle Avoidance (Refined for the human model)
            rays = self.cast_rays()
            for angle, dist in rays:
                if dist < 4.0: 
                    sonar_active = True
                    force_mag = 1.0 / (dist**2 + 0.1)
                    force_dir = -np.array([np.cos(angle), np.sin(angle)])
                    repulsion += force_dir * force_mag * 0.25 
            obstacle_force = repulsion * 20.0
            
            # 4. Map Boundary Repulsion (Massive 300x300, Phase 13)
            boundary = 149.0
            if self.position[0] > boundary: wall_force[0] -= 10.0
            if self.position[0] < -boundary: wall_force[0] += 10.0
            if self.position[1] > boundary: wall_force[1] -= 10.0
            if self.position[1] < -boundary: wall_force[1] += 10.0
            
            # 5. Manual Destination attraction
            if self.destination is not None:
                dist_to_dest = np.linalg.norm(self.destination - self.position)
                if dist_to_dest > 0.5:
                    dest_force = ((self.destination - self.position) / dist_to_dest) * 4.0
                else:
                    self.destination = None # Reached goal

            # Combine all forces
            total_force = wander_force + evasion_force + obstacle_force + wall_force + dest_force
            
            # Apply physics
            self.acceleration = total_force / self.mass
            self.velocity += self.acceleration * self.dt
            
            # Drag/Friction (Kinetic refinement)
            self.velocity *= 0.99
            
            # Dynamic speed limit
            speed = np.linalg.norm(self.velocity)
            if speed > current_max_speed:
                self.velocity = (self.velocity / speed) * current_max_speed
                
            # Update Position
            self.position += self.velocity * self.dt
            self.position = np.clip(self.position, -149.8, 149.8)
            levy_action_log = float(np.linalg.norm(self.velocity))
            
        return self.position.copy(), self.velocity.copy(), sonar_active, float(reflex_activation), levy_action_log
