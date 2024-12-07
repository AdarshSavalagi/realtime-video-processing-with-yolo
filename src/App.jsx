import React, { useEffect, useRef, useState } from "react";

const App = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [boundingBoxes, setBoundingBoxes] = useState([]);

    useEffect(() => {
        const initCamera = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
            } catch (error) {
                console.error("Error accessing webcam:", error);
            }
        };

        initCamera();
    }, []);

    useEffect(() => {
        const drawBoundingBoxes = () => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            const ctx = canvas?.getContext("2d");

            if (!ctx || !video) return;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Clear only the bounding boxes area
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw video feed on canvas
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Draw bounding boxes dynamically
            ctx.strokeStyle = "red";
            ctx.lineWidth = 3;
            ctx.font = "16px Arial";

            boundingBoxes.forEach((box) => {
                const { x, y, width, height, name } = box;

                // Scale bounding box coordinates
                const scaleX = canvas.width / video.videoWidth || 1;
                const scaleY = canvas.height / video.videoHeight || 1;

                const scaledX = x * scaleX;
                const scaledY = y * scaleY;
                const scaledWidth = width * scaleX;
                const scaledHeight = height * scaleY;

                ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);
                ctx.fillText(name, scaledX, scaledY - 5);
            });

            requestAnimationFrame(drawBoundingBoxes);
        };

        drawBoundingBoxes();
    }, [boundingBoxes]);

    useEffect(() => {
        let pollingInterval = null;

        const fetchBoundingBoxes = async () => {
            try {
                const canvas = canvasRef.current;
                const video = videoRef.current;

                if (!canvas || !video) return;

                const frameData = canvas.toDataURL("image/jpeg");

                const response = await fetch("http://localhost:8000/process_frame", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ frame: frameData }),
                });

                const result = await response.json();
                if (result?.bounding_boxes) {
                    setBoundingBoxes(result.bounding_boxes); // Update bounding boxes
                }
            } catch (error) {
                console.error("Error fetching bounding boxes:", error);
            }
        };

        pollingInterval = setInterval(fetchBoundingBoxes, 200); // Poll every 200ms

        return () => {
            if (pollingInterval) clearInterval(pollingInterval);
        };
    }, []);

    return (
        <div style={{ position: "relative" }}>
            {/* Video Feed */}
            <video
                ref={videoRef}
                style={{
                    width: "640px",
                    height: "480px",
                    border: "1px solid black",
                }}
            />
            {/* Canvas Overlay for bounding boxes */}
            <canvas
                ref={canvasRef}
                style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    zIndex: 10,
                }}
            />
        </div>
    );
};

export default App;
