import React, { useRef, useEffect } from 'react';

/**
 * CameraFeed Component
 * Simulates a 2D camera output from the drone's perspective,
 * demonstrating how the NeuroReflex-X framework stabilizes
 * raw, jittery object detection (simulated YOLO bounding boxes).
 */
export default function CameraFeed({ data, showDFAF = true }) {
    const canvasRef = useRef(null);
    const videoRef = useRef(null);

    // Initialize Webcam Feed
    useEffect(() => {
        const startVideo = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
            } catch (err) {
                console.error("Failed to access webcam:", err);
            }
        };
        startVideo();

        return () => {
            // Cleanup webcam stream on unmount
            if (videoRef.current && videoRef.current.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    useEffect(() => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        if (!canvas || !video) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        let animationFrameId;

        // Draw loop runs continuously to capture video frames even if data hasn't changed
        const renderFrame = () => {
            // 1. Draw live webcam frame if playing
            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                // Draw video stretched to fill
                ctx.drawImage(video, 0, 0, width, height);

                // Add a very subtle tactical night-vision or dark overlay
                ctx.fillStyle = 'rgba(0, 10, 5, 0.4)';
                ctx.fillRect(0, 0, width, height);
            } else {
                // Fallback / Loading Background
                ctx.fillStyle = '#111';
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = '#444';
                ctx.font = '10px monospace';
                ctx.fillText('AWAITING OPTICAL LINK...', 10, 20);
            }

            // Grid lines overlay
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let i = 0; i < width; i += 20) { ctx.moveTo(i, 0); ctx.lineTo(i, height); }
            for (let i = 0; i < height; i += 20) { ctx.moveTo(0, i); ctx.lineTo(width, i); }
            ctx.stroke();

            // ----------------------------------------------------
            // Only draw tracking HUD if we have valid simulation data
            // ----------------------------------------------------
            if (data && data.destination && data.true_pos && data.predicted_pos) {
                drawHUD(ctx, width, height);
            }

            animationFrameId = requestAnimationFrame(renderFrame);
        };

        renderFrame();

        return () => cancelAnimationFrame(animationFrameId);
    }, [data, showDFAF]); // Rebind draw loop if data props change fundamentally, though RAF handles the loop


    // Extracted the HUD drawing logic to keep the renderFrame loop clean
    const drawHUD = (ctx, width, height) => {

        if (!data || !data.destination || !data.true_pos || !data.predicted_pos) return;

        // --- TARGET-LOCKED POV PROJECTION (GIMBAL CAMERA) ---
        // Drone is at predicted_pos. The camera should always look directly at the destination (target).
        // This means the destination should be roughly centered, and other objects (like true pos, foveas)
        // are drawn relative to that centered view.

        const dronePos = data.drone_real_pos || data.predicted_pos;
        const droneX = dronePos[0];
        const droneZ = dronePos[1];

        const targetX = data.destination[0];
        const targetZ = data.destination[1];

        // 1. Calculate camera looking angle (from drone to target)
        // If drone is exactly on target, default to looking "up" (-1)
        const dx = targetX - droneX;
        const dz = targetZ - droneZ;
        const lookAngle = (Math.abs(dx) < 0.001 && Math.abs(dz) < 0.001) ? -Math.PI / 2 : Math.atan2(dz, dx);

        // Helper to project a world 2D point into the drone's gimbal camera space
        const projectToScreen = (worldX, worldZ) => {
            // A. Get position relative to drone
            const relX = worldX - droneX;
            const relZ = worldZ - droneZ;

            // B. Rotate point around drone by -lookAngle so that the target is straight ahead (+X axis in math, but let's map to screen)
            // It's easier to think: we want target to be at angle 0 (straight ahead).
            const angleFromDrone = Math.atan2(relZ, relX);
            const distFromDrone = Math.sqrt(relX * relX + relZ * relZ);

            // Angle relative to our camera's forward direction
            const cameraRelativeAngle = angleFromDrone - lookAngle;

            // C. Convert back to local camera coordinates
            // forwardDist is how far ahead it is. sideDist is how far left/right it is.
            const forwardDist = distFromDrone * Math.cos(cameraRelativeAngle);
            const sideDist = distFromDrone * Math.sin(cameraRelativeAngle);

            // D. Project to screen
            // If it's behind the camera, don't render it (or render it very weirdly, let's clamp)
            const depth = Math.max(0.1, forwardDist);

            const fovScale = 60; // Field of view affects how fast things move to the side

            // Screen X: center + side distance scaled by depth (perspective divide)
            // Positive sideDist is to the right.
            const screenX = (width / 2) + ((sideDist * fovScale) / depth);

            // Screen Y: keep mostly centered, maybe a slight bobbing.
            const screenY = (height / 2) - (10 / depth);

            // Scale factor for rendering box sizes based on depth
            const scale = Math.max(0.1, Math.min(2.0, 5.0 / depth));

            return { x: screenX, y: screenY, scale: scale, isBehind: forwardDist < 0 };
        };

        const trueProj = projectToScreen(data.true_pos[0], data.true_pos[1]);
        const predProj = projectToScreen(data.predicted_pos[0], data.predicted_pos[1]);

        // If the target is behind the camera (shouldn't happen with gimbal, but safety check)
        if (trueProj.isBehind) return;

        // 1. RAW YOLO DETECTION (Jittery Bounding Box)
        // Simulate detection noise: bounding box wiggles slightly off the true center
        const jitterX = (Math.random() - 0.5) * 5;
        const jitterY = (Math.random() - 0.5) * 5;

        // Base box size scales with distance (closer = bigger box)
        const baseBoxSize = 50 * trueProj.scale;
        const boxSize = Math.max(15, Math.min(120, baseBoxSize)); // Clamp size

        const boxX = trueProj.x + jitterX;
        const boxY = trueProj.y + jitterY;

        // Draw YOLO Box
        ctx.strokeStyle = '#FFEB3B'; // Yellow warning color often used for bounding boxes
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
        ctx.strokeRect(boxX - boxSize / 2, boxY - boxSize / 2, boxSize, boxSize);

        // Draw Detection Label
        ctx.fillStyle = '#FFEB3B';
        ctx.font = '9px monospace';
        const confidence = (data?.stability ?? 0.85).toFixed(2);
        ctx.fillText(`TARGET | ${confidence}`, boxX - boxSize / 2, boxY - boxSize / 2 - 4);

        if (showDFAF) {
            // 2. NEUROREFLEX-X TRACKER (Stabilized Crosshair)
            // This is where PREDICTED POS is overlaid
            const chSize = 8 * predProj.scale;
            ctx.strokeStyle = data.collapse_status ? '#FF5252' : '#2196F3'; // Red if collapsed, Blue if stable
            ctx.lineWidth = 2;

            // Horizontal Line
            ctx.beginPath();
            ctx.moveTo(predProj.x - chSize, predProj.y);
            ctx.lineTo(predProj.x + chSize, predProj.y);
            ctx.stroke();

            // Vertical Line
            ctx.beginPath();
            ctx.moveTo(predProj.x, predProj.y - chSize);
            ctx.lineTo(predProj.x, predProj.y + chSize);
            ctx.stroke();

            // Crosshair Label
            ctx.fillStyle = data.collapse_status ? '#FF5252' : '#2196F3';
            ctx.fillText('N-RFX LOCK', predProj.x + 12, predProj.y + 4);

            // 3. DFAF: Real Primary and Secondary Fovea from backend
            const pfProj = projectToScreen(data.primary_fovea[0], data.primary_fovea[1]);
            const sfProj = projectToScreen(data.secondary_fovea[0], data.secondary_fovea[1]);

            const pRadius = 14 * pfProj.scale;
            const sRadius = 10 * sfProj.scale;

            // Primary Fovea — tight precision lock ring (collapses to red on ACCE collapse)
            ctx.beginPath();
            ctx.arc(pfProj.x, pfProj.y, pRadius, 0, Math.PI * 2);
            ctx.strokeStyle = data.collapse_status ? 'rgba(255,82,82,0.9)' : 'rgba(33,150,243,0.9)';
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            ctx.stroke();

            // Primary label
            ctx.fillStyle = data.collapse_status ? '#FF5252' : '#2196F3';
            ctx.font = '8px monospace';
            ctx.fillText('PRIMARY', pfProj.x + pRadius + 2, pfProj.y - 4);
            ctx.fillText('FOVEA', pfProj.x + pRadius + 2, pfProj.y + 6);

            // Secondary Fovea — context awareness ring (displaced by velocity direction)
            ctx.beginPath();
            ctx.arc(sfProj.x, sfProj.y, sRadius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(171,71,188,0.7)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Secondary label
            ctx.fillStyle = 'rgba(171,71,188,0.8)';
            ctx.font = '8px monospace';
            ctx.fillText('SECONDARY', sfProj.x + sRadius + 2, sfProj.y - 4);
            ctx.fillText('CONTEXT', sfProj.x + sRadius + 2, sfProj.y + 6);

            // Line connecting primary → secondary (shows fovea separation)
            ctx.beginPath();
            ctx.moveTo(pfProj.x, pfProj.y);
            ctx.lineTo(sfProj.x, sfProj.y);
            ctx.strokeStyle = 'rgba(171,71,188,0.3)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Focus separation label
            ctx.fillStyle = 'rgba(171,71,188,0.6)';
            ctx.font = '8px monospace';
            const midX = (pfProj.x + sfProj.x) / 2;
            const midY = (pfProj.y + sfProj.y) / 2;
            ctx.fillText(`sep=${data.focus_separation.toFixed(2)}`, midX, midY - 4);
        }
    };

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', border: '1px solid #333' }}>
            {/* Hidden video element to capture the hardware stream */}
            <video
                ref={videoRef}
                style={{ display: 'none' }}
                playsInline
                muted
            />
            <canvas
                ref={canvasRef}
                width={280}
                height={210}
                style={{ width: '100%', height: '100%', display: 'block' }}
            />
            {/* Overlay Text */}
            <div style={{ position: 'absolute', top: 5, left: 5, color: '#fff', fontSize: '10px', fontFamily: 'monospace', textShadow: '1px 1px 0 #000' }}>
                REC <span style={{ color: '#FF5252', animation: 'blink 1s infinite' }}>●</span>
            </div>
            <div style={{ position: 'absolute', bottom: 5, right: 5, color: showDFAF ? '#FFEB3B' : '#888', fontSize: '9px', fontFamily: 'monospace', textShadow: '1px 1px 0 #000' }}>
                {showDFAF ? 'YOLOv8 + N-RFX OVERLAY' : 'RAW YOLOv8 DETECTIONS'}
            </div>
        </div>
    );
}
