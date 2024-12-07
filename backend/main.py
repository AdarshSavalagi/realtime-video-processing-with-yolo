from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import io
import cv2
import base64
import numpy as np
from ultralytics import YOLO
import os
import datetime


app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load YOLO model
model = YOLO("yolov8n.pt")  # Ensure you have YOLO's model in the current directory

# Directory to save the processed frames
SAVE_DIR = "saved_frames"
os.makedirs(SAVE_DIR, exist_ok=True)  # Ensure the directory exists


@app.get("/")
def root():
    return {"message": "FastAPI YOLO Backend Running"}


# Helper function to process YOLO inference and extract bounding boxes
def process_frame(frame):
    """
    Process the received frame with YOLO and extract bounding boxes.
    Args:
        frame: The video frame (OpenCV image) to process.
    Returns:
        List of bounding boxes with coordinates and class names.
    """
    results = model.predict(frame)  # YOLO model prediction
    boxes = []
    for result in results:
        for bbox, cls in zip(result.boxes.xyxy, result.boxes.cls):
            x_min, y_min, x_max, y_max = map(int, bbox[:4])
            class_name = model.names[int(cls)]  # Map index to class name
            boxes.append({
                "x": x_min,
                "y": y_min,
                "width": x_max - x_min,
                "height": y_max - y_min,
                "name": class_name
            })
    return boxes


@app.post("/process_frame")
async def handle_frame(data: dict):
    """
    HTTP POST endpoint to handle image processing for bounding boxes.
    Args:
        data: Dictionary with base64-encoded frame data sent by the frontend.
    Returns:
        JSON response with the bounding boxes.
    """
    try:
        # Decode the base64 string into image data
        image_data = base64.b64decode(data["frame"].split(",")[1])
        image = Image.open(io.BytesIO(image_data))
        frame = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

        # Process the frame with YOLO
        bounding_boxes = process_frame(frame)

        # Optionally save processed frames if needed
        # asyncio.create_task(save_frame_with_bounding_boxes(frame, bounding_boxes))

        # Return the bounding box data to the frontend
        return {"bounding_boxes": bounding_boxes}
    except Exception as e:
        print(f"Error processing frame: {e}")
        raise HTTPException(status_code=500, detail=str(e))
