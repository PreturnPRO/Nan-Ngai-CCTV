from ultralytics import YOLO
import numpy as np
import logging
import torch
import cv2
import os

class ModelTrainer:
    def __init__(self):
        model_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "model", "best.pt")
        logging.info(f"Loading YOLO model from {model_path}")
        # Use GPU when a CUDA-enabled torch is available, otherwise fall back to
        # CPU. NOTE: GPU needs BOTH torch and torchvision built for CUDA — a
        # torch(CUDA)+torchvision(CPU) mismatch raises a "torchvision::nms CUDA"
        # error. Override with DETECT_DEVICE=cpu to force CPU.
        forced = os.getenv("DETECT_DEVICE")
        if forced:
            self.device = torch.device(forced)
        else:
            self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        if self.device.type == 'cuda':
            logging.info(f"Using device: {self.device} ({torch.cuda.get_device_name(0)})")
        else:
            logging.info(f"Using device: {self.device}")
        self.model = YOLO(model_path).to(self.device)
        logging.info("Model loaded successfully")

    def detect_objects(self, frame):
        # Let Ultralytics handle resizing to 480 and scaling back bounding boxes
        results = self.model(frame, imgsz=320, verbose=False)[0]
        boxes = results.boxes.xyxy.cpu().numpy()  
        class_ids = results.boxes.cls.cpu().numpy()  
        confidences = results.boxes.conf.cpu().numpy()
        return boxes, class_ids, confidences