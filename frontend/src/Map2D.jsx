import React, { useRef, useEffect, useCallback } from 'react';

const API_URL = 'http://localhost:8000';
const TRAIL_MAX = 80;

/* ─── Color tokens ─── */
const C = {
    bg:          '#080808',
    grid:        '#141414',
    axis:        '#222222',
    drone:       '#f2f2f2',
    droneTrail:  'rgba(242,242,242,0.18)',
    target:      '#eb5757',
    targetTrail: 'rgba(235,87,87,0.18)',
    predicted:   '#56ccf2',
    foveaPrimary:'rgba(86,204,242,0.18)',
    foveaSecond: 'rgba(86,204,242,0.06)',
    obstacle:    '#444444',
    obstacleStr: '#555555',
    sweep:       'rgba(242,242,242,0.04)',
    sweepLine:   'rgba(242,242,242,0.25)',
    scalebar:    '#333333',
    label:       '#2a2a2a',
    axisLabel:   '#1e1e1e',
    rangeRing:   'rgba(255,255,255,0.03)',
    rangeStroke: '#1a1a1a',
};

export default function Map2D({ data, toolMode }) {
    const canvasRef     = useRef(null);
    const containerRef  = useRef(null);
    const animFrameRef  = useRef(null);
    const sweepAngleRef = useRef(0);
    const droneTrail    = useRef([]);
    const targetTrail   = useRef([]);

    /* ── Coordinate transform (300×300 world → canvas px) ── */
    const getT = (width, height) => {
        const scale   = Math.min(width, height) / 340;
        const cx      = width  / 2;
        const cy      = height / 2;
        const toS  = (x, y) => ({ x: x * scale + cx, y: y * scale + cy });
        const fromS = (sx, sy) => ({ x: (sx - cx) / scale, y: (sy - cy) / scale });
        return { scale, cx, cy, toS, fromS };
    };

    /* ── Click → API ── */
    const handleClick = useCallback(async (e) => {
        const canvas = canvasRef.current;
        if (!canvas || canvas.clientWidth === 0) return;
        const rect = canvas.getBoundingClientRect();
        const { fromS } = getT(canvas.clientWidth, canvas.clientHeight);
        const p = fromS(e.clientX - rect.left, e.clientY - rect.top);
        const endpoint = toolMode === 'TARGET' ? 'target' : 'obstacles/add';
        try {
            await fetch(`${API_URL}/simulation/${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ x: p.x, y: p.y }),
            });
        } catch {}
    }, [toolMode]);

    /* ── Accumulate trails ── */
    useEffect(() => {
        if (!data) return;
        const dp = data.drone_real_pos ?? data.predicted_pos;
        const tp = data.true_pos;
        if (dp) {
            droneTrail.current.push({ x: dp[0], y: dp[1] });
            if (droneTrail.current.length > TRAIL_MAX) droneTrail.current.shift();
        }
        if (tp) {
            targetTrail.current.push({ x: tp[0], y: tp[1] });
            if (targetTrail.current.length > TRAIL_MAX) targetTrail.current.shift();
        }
    }, [data]);

    /* ── Draw ── */
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const width  = canvas.clientWidth;
        const height = canvas.clientHeight;
        if (width === 0 || height === 0) {
            animFrameRef.current = requestAnimationFrame(draw);
            return;
        }

        canvas.width  = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        const { scale, cx, cy, toS } = getT(width, height);

        /* 1 — Background */
        ctx.fillStyle = C.bg;
        ctx.fillRect(0, 0, width, height);

        /* 2 — Grid lines (fixed: own stroke call) */
        ctx.beginPath();
        ctx.strokeStyle = C.grid;
        ctx.lineWidth   = 0.5;
        for (let x = -150; x <= 150; x += 25) {
            const p = toS(x, 0);
            ctx.moveTo(p.x, 0); ctx.lineTo(p.x, height);
        }
        for (let y = -150; y <= 150; y += 25) {
            const p = toS(0, y);
            ctx.moveTo(0, p.y); ctx.lineTo(width, p.y);
        }
        ctx.stroke();

        /* 3 — Axes */
        ctx.beginPath();
        ctx.strokeStyle = C.axis;
        ctx.lineWidth   = 1;
        ctx.moveTo(0, cy); ctx.lineTo(width, cy);
        ctx.moveTo(cx, 0); ctx.lineTo(cx, height);
        ctx.stroke();

        /* 4 — Axis coordinate labels */
        ctx.fillStyle  = C.axisLabel;
        ctx.font       = '8px monospace';
        ctx.textAlign  = 'center';
        for (let x = -125; x <= 125; x += 50) {
            if (x === 0) continue;
            const p = toS(x, 0);
            ctx.fillText(x, p.x, cy + 10);
        }
        ctx.textAlign = 'right';
        for (let y = -125; y <= 125; y += 50) {
            if (y === 0) continue;
            const p = toS(0, y);
            ctx.fillText(y, cx - 4, p.y + 3);
        }

        /* 5 — Range rings (centered on drone) */
        const dronePos  = data?.drone_real_pos ?? data?.predicted_pos;
        const droneScreen = dronePos
            ? toS(dronePos[0], dronePos[1])
            : { x: cx, y: cy };

        [25, 50, 100].forEach(r => {
            ctx.beginPath();
            ctx.strokeStyle = C.rangeStroke;
            ctx.lineWidth   = 0.5;
            ctx.setLineDash([2, 4]);
            ctx.arc(droneScreen.x, droneScreen.y, r * scale, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            /* label */
            ctx.fillStyle = C.label;
            ctx.font      = '7px monospace';
            ctx.textAlign = 'left';
            ctx.fillText(`${r}m`, droneScreen.x + r * scale + 2, droneScreen.y - 2);
        });

        /* 6 — Radar sweep (simple canvas arc gradient) */
        sweepAngleRef.current = (sweepAngleRef.current + 0.025) % (Math.PI * 2);
        const sa = sweepAngleRef.current;
        const sweepR = Math.max(width, height) * 1.2;

        ctx.save();
        ctx.translate(droneScreen.x, droneScreen.y);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, sweepR, sa - 0.4, sa);
        ctx.closePath();
        ctx.fillStyle = C.sweep;
        ctx.fill();

        /* Sweep leading edge */
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(sa) * sweepR, Math.sin(sa) * sweepR);
        ctx.strokeStyle = C.sweepLine;
        ctx.lineWidth   = 1;
        ctx.stroke();
        ctx.restore();

        /* 7 — Obstacles */
        if (data?.obstacles) {
            data.obstacles.forEach(obs => {
                const p = toS(obs[0], obs[1]);
                const s = 4;
                ctx.fillStyle   = C.obstacle;
                ctx.strokeStyle = C.obstacleStr;
                ctx.lineWidth   = 0.5;
                ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
                ctx.strokeRect(p.x - s / 2, p.y - s / 2, s, s);
            });
        }

        /* 8 — Target trail */
        if (targetTrail.current.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = C.targetTrail;
            ctx.lineWidth   = 1.5;
            ctx.lineJoin    = 'round';
            targetTrail.current.forEach((pt, i) => {
                const p = toS(pt.x, pt.y);
                i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
        }

        /* 9 — Drone trail */
        if (droneTrail.current.length > 1) {
            ctx.beginPath();
            ctx.strokeStyle = C.droneTrail;
            ctx.lineWidth   = 1;
            ctx.lineJoin    = 'round';
            droneTrail.current.forEach((pt, i) => {
                const p = toS(pt.x, pt.y);
                i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
        }

        if (!data) {
            /* No data — draw "OFFLINE" text */
            ctx.fillStyle  = C.label;
            ctx.font       = '9px monospace';
            ctx.textAlign  = 'center';
            ctx.fillText('AWAITING SIGNAL', cx, cy + 20);
            return;
        }

        /* 10 — DFAF fovea rings */
        if (data.primary_fovea && data.secondary_fovea) {
            const pf = toS(data.primary_fovea[0], data.primary_fovea[1]);
            const sf = toS(data.secondary_fovea[0], data.secondary_fovea[1]);
            const cr = (data.context_radius ?? 1.5) * scale;

            /* Primary fovea — tight ring */
            ctx.beginPath();
            ctx.arc(pf.x, pf.y, cr, 0, Math.PI * 2);
            ctx.fillStyle   = C.foveaPrimary;
            ctx.fill();
            ctx.strokeStyle = 'rgba(86,204,242,0.35)';
            ctx.lineWidth   = 0.5;
            ctx.stroke();

            /* Secondary fovea — outer context ring */
            ctx.beginPath();
            ctx.arc(sf.x, sf.y, cr * 1.6, 0, Math.PI * 2);
            ctx.fillStyle   = C.foveaSecond;
            ctx.fill();
            ctx.strokeStyle = 'rgba(86,204,242,0.12)';
            ctx.lineWidth   = 0.5;
            ctx.setLineDash([2, 3]);
            ctx.stroke();
            ctx.setLineDash([]);

            /* Separation line */
            ctx.beginPath();
            ctx.moveTo(pf.x, pf.y);
            ctx.lineTo(sf.x, sf.y);
            ctx.strokeStyle = 'rgba(86,204,242,0.10)';
            ctx.lineWidth   = 0.5;
            ctx.stroke();
        }

        /* 11 — Prediction vector (true_pos → predicted_pos) */
        if (data.true_pos && data.predicted_pos) {
            const tp  = toS(data.true_pos[0], data.true_pos[1]);
            const pp  = toS(data.predicted_pos[0], data.predicted_pos[1]);
            const dx  = pp.x - tp.x;
            const dy  = pp.y - tp.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            if (len > 1) {
                ctx.beginPath();
                ctx.moveTo(tp.x, tp.y);
                ctx.lineTo(pp.x, pp.y);
                ctx.strokeStyle = 'rgba(86,204,242,0.3)';
                ctx.lineWidth   = 0.8;
                ctx.setLineDash([3, 3]);
                ctx.stroke();
                ctx.setLineDash([]);

                /* Arrowhead */
                const angle = Math.atan2(dy, dx);
                const al = 6;
                ctx.beginPath();
                ctx.moveTo(pp.x, pp.y);
                ctx.lineTo(pp.x - al * Math.cos(angle - 0.4), pp.y - al * Math.sin(angle - 0.4));
                ctx.lineTo(pp.x - al * Math.cos(angle + 0.4), pp.y - al * Math.sin(angle + 0.4));
                ctx.closePath();
                ctx.fillStyle = 'rgba(86,204,242,0.4)';
                ctx.fill();
            }
        }

        /* 12 — Target (true position) */
        if (data.true_pos) {
            const tp = toS(data.true_pos[0], data.true_pos[1]);
            const isDestroyed = data.status === 'DESTROYED';

            ctx.save();
            ctx.translate(tp.x, tp.y);

            /* Pulse ring */
            ctx.beginPath();
            ctx.arc(0, 0, 9, 0, Math.PI * 2);
            ctx.strokeStyle = isDestroyed ? 'rgba(235,87,87,0.2)' : 'rgba(235,87,87,0.35)';
            ctx.lineWidth   = 0.5;
            ctx.stroke();

            /* Core dot */
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fillStyle = isDestroyed ? '#444' : C.target;
            ctx.fill();

            /* Cross-hair lines */
            if (!isDestroyed) {
                ctx.strokeStyle = 'rgba(235,87,87,0.5)';
                ctx.lineWidth   = 0.5;
                ctx.beginPath();
                ctx.moveTo(-12, 0); ctx.lineTo(-5, 0);
                ctx.moveTo(5, 0);   ctx.lineTo(12, 0);
                ctx.moveTo(0, -12); ctx.lineTo(0, -5);
                ctx.moveTo(0, 5);   ctx.lineTo(0, 12);
                ctx.stroke();
            }

            ctx.restore();
        }

        /* 13 — Drone marker */
        if (dronePos) {
            ctx.save();
            ctx.translate(droneScreen.x, droneScreen.y);

            const isStriking = data.status === 'STRIKING';

            /* Outer ring */
            ctx.beginPath();
            ctx.arc(0, 0, 7, 0, Math.PI * 2);
            ctx.strokeStyle = isStriking
                ? 'rgba(242,201,74,0.6)'
                : 'rgba(242,242,242,0.25)';
            ctx.lineWidth   = 0.5;
            ctx.stroke();

            /* Diamond shape */
            ctx.beginPath();
            ctx.moveTo(0, -5);
            ctx.lineTo(4, 0);
            ctx.lineTo(0, 5);
            ctx.lineTo(-4, 0);
            ctx.closePath();
            ctx.fillStyle = isStriking ? '#f2c94c' : C.drone;
            ctx.fill();

            ctx.restore();
        }

        /* 14 — Status + tool mode overlay (bottom-left) */
        const status = data.status ?? 'OFFLINE';
        const statusColor = {
            TRACKING:  '#6fcf97',
            ENGAGING:  '#f2c94c',
            STRIKING:  '#f2994a',
            COLLAPSED: '#56ccf2',
            DESTROYED: '#eb5757',
        }[status] ?? '#444444';

        ctx.fillStyle = 'rgba(8,8,8,0.75)';
        ctx.fillRect(0, height - 22, width, 22);

        ctx.fillStyle  = statusColor;
        ctx.font       = '8px monospace';
        ctx.textAlign  = 'left';
        ctx.fillText(`● ${status}`, 8, height - 8);

        ctx.fillStyle = '#2a2a2a';
        ctx.textAlign = 'right';
        ctx.fillText(`TOOL: ${toolMode}`, width - 8, height - 8);

        /* 15 — Scale bar (bottom-right area, above status) */
        const barUnits = 50;
        const barPx    = barUnits * scale;
        const bx       = width - 12;
        const by       = height - 30;

        ctx.strokeStyle = C.scalebar;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.moveTo(bx - barPx, by); ctx.lineTo(bx, by);
        ctx.moveTo(bx - barPx, by - 3); ctx.lineTo(bx - barPx, by + 3);
        ctx.moveTo(bx, by - 3);         ctx.lineTo(bx, by + 3);
        ctx.stroke();

        ctx.fillStyle = C.scalebar;
        ctx.font      = '7px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${barUnits}m`, bx, by - 5);

        animFrameRef.current = requestAnimationFrame(draw);
    }, [data, toolMode]);

    /* ── Animation loop ── */
    useEffect(() => {
        animFrameRef.current = requestAnimationFrame(draw);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, [draw]);

    return (
        <div
            ref={containerRef}
            style={{ width: '100%', height: '100%', background: C.bg, overflow: 'hidden' }}
        >
            <canvas
                ref={canvasRef}
                onClick={handleClick}
                style={{ display: 'block', width: '100%', height: '100%', cursor: toolMode === 'TARGET' ? 'crosshair' : 'cell' }}
            />
        </div>
    );
}
