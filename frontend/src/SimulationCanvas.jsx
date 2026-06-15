import React, { useRef, useEffect } from 'react';

export default function SimulationCanvas({ data }) {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        // Resize handling
        const parent = canvas.parentElement;
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Scale: Map simulation coordinates (-2 to 12) to canvas width
        const scaleX = width / 14;
        const scaleY = height / 4;
        const offsetX = 2 * scaleX;
        const offsetY = 2 * scaleY;

        // Clear
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        // Grid
        ctx.strokeStyle = '#1C1C1C';
        ctx.lineWidth = 1;
        for (let x = 0; x < width; x += scaleX) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
        }
        for (let y = 0; y < height; y += scaleY) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
        }

        if (!data) return;

        const toScreen = (x, y) => ({
            x: x * scaleX + offsetX,
            y: y * scaleY + offsetY
        });

        // Draw History (Ground Truth) — history_true is array of dicts {time, reflex, brain, confidence, ...}
        // Extract spatial positions from true_pos snapshots; skip if not available
        const trueHistory = Array.isArray(data.history_true) ? data.history_true : [];

        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.beginPath();
        let started = false;
        trueHistory.forEach((entry) => {
            // history_true entries are telemetry dicts, not [x,y] positions
            // Use error field as Y axis for signal visualization
            const x = entry.time ?? 0;
            const y = entry.error ?? 0;
            const p = toScreen(x * 0.1, y * 2);
            if (!started) { ctx.moveTo(p.x, p.y); started = true; }
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        // confidence signal
        ctx.strokeStyle = '#FF5252';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        started = false;
        trueHistory.forEach((entry) => {
            const x = entry.time ?? 0;
            const y = 1.0 - (entry.confidence ?? 1.0);
            const p = toScreen(x * 0.1, y * 2);
            if (!started) { ctx.moveTo(p.x, p.y); started = true; }
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw Current Targets
        const trueP = toScreen(data.true_pos[0], data.true_pos[1]);
        const predP = toScreen(data.predicted_pos[0], data.predicted_pos[1]);

        // Ground Truth Dot
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.arc(trueP.x, trueP.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Predicted Crosshair
        ctx.strokeStyle = '#FF5252';
        ctx.lineWidth = 2;
        const size = 8;
        ctx.beginPath();
        ctx.moveTo(predP.x - size, predP.y); ctx.lineTo(predP.x + size, predP.y);
        ctx.moveTo(predP.x, predP.y - size); ctx.lineTo(predP.x, predP.y + size);
        ctx.stroke();

    }, [data]);

    return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />;
}
