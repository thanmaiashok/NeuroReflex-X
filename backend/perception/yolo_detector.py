import numpy as np
import io

try:
    from ultralytics import YOLO
    from PIL import Image
    _YOLO_AVAILABLE = True
except ImportError:
    _YOLO_AVAILABLE = False

# COCO classes that map to NeuroReflex-X target types
TARGET_CLASSES = {0: "person", 7: "truck"}


def _quat_rotate(v, q):
    """Rotate vector v by quaternion q = [x, y, z, w] (Three.js order)."""
    qx, qy, qz, qw = q
    t = 2.0 * np.cross(np.array([qx, qy, qz]), v)
    return v + qw * t + np.cross(np.array([qx, qy, qz]), t)


def pixel_to_world(px, py, img_w, img_h, cam_pos, cam_quat, fov_y, ground_y=0.0):
    """
    Unproject pixel (px, py) to world XZ coords via ray-ground plane intersection.
    cam_quat: [x, y, z, w] — Three.js quaternion order.
    Returns [world_x, world_z] or None if ray misses ground.
    """
    # Normalize pixel to NDC [-1, 1]
    ndc_x = (px / img_w) * 2.0 - 1.0
    ndc_y = 1.0 - (py / img_h) * 2.0

    # Ray in camera space (OpenGL convention: camera looks down -Z)
    aspect = img_w / img_h
    tan_half = np.tan(np.radians(fov_y / 2.0))
    ray_cam = np.array([ndc_x * aspect * tan_half, ndc_y * tan_half, -1.0])
    ray_cam /= np.linalg.norm(ray_cam)

    # Rotate ray to world space using camera quaternion
    ray_world = _quat_rotate(ray_cam, cam_quat)

    # Ray-plane intersection: find t where ray hits y = ground_y
    cam_pos = np.array(cam_pos, dtype=float)
    if abs(ray_world[1]) < 1e-6:
        return None  # ray parallel to ground
    t = (ground_y - cam_pos[1]) / ray_world[1]
    if t < 0:
        return None  # intersection behind camera

    hit = cam_pos + t * ray_world
    return [float(hit[0]), float(hit[2])]  # world X, Z → 2D sim coords


class YOLODetector:
    def __init__(self, model_name="yolov8n.pt"):
        if not _YOLO_AVAILABLE:
            raise RuntimeError(
                "ultralytics not installed. Run: pip install ultralytics pillow"
            )
        self.model = YOLO(model_name)  # auto-downloads on first run (~6MB)

    def detect(self, image_bytes, conf_threshold=0.25):
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        results = self.model(img, verbose=False, conf=conf_threshold)
        detections = []
        for r in results:
            for box in r.boxes:
                cls = int(box.cls[0])
                if cls not in TARGET_CLASSES:
                    continue
                x1, y1, x2, y2 = box.xyxy[0].tolist()
                detections.append({
                    "class": TARGET_CLASSES[cls],
                    "confidence": round(float(box.conf[0]), 3),
                    "bbox": [x1, y1, x2, y2],
                    "center_px": [(x1 + x2) / 2.0, (y1 + y2) / 2.0],
                })
        return detections
