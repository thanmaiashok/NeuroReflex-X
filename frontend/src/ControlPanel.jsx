import React, { useState, useEffect } from 'react';

const API = 'http://localhost:8000';

/* ─── Shared button styles ─── */
const btn = (variant = 'default') => {
    const variants = {
        default: { bg: '#141414', color: '#888', border: '#222' },
        primary: { bg: '#1a1a1a', color: '#f2f2f2', border: '#333' },
        success: { bg: '#0e1f14', color: '#6fcf97', border: '#1a3324' },
        danger:  { bg: '#1f0e0e', color: '#eb5757', border: '#331a1a' },
        active:  { bg: '#f2f2f2', color: '#080808', border: '#f2f2f2' },
        amber:   { bg: '#1a1500', color: '#f2c94c', border: '#2a2000' },
        cyan:    { bg: '#001a1f', color: '#56ccf2', border: '#003040' },
        purple:  { bg: '#160e1f', color: '#bb86fc', border: '#281a33' },
    };
    const v = variants[variant] ?? variants.default;
    return {
        width: '100%', height: 34,
        background: v.bg, color: v.color,
        border: `1px solid ${v.border}`,
        fontSize: '10px', fontWeight: '600',
        fontFamily: 'monospace', letterSpacing: '0.05em',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6, textDecoration: 'none',
    };
};

const SectionLabel = ({ children }) => (
    <div style={{
        fontSize: '9px', color: '#2e2e2e', fontFamily: 'monospace',
        letterSpacing: '0.12em', fontWeight: '600',
        textTransform: 'uppercase', marginBottom: 8,
        paddingBottom: 6, borderBottom: '1px solid #141414',
    }}>
        {children}
    </div>
);

const Divider = () => (
    <div style={{ height: 1, background: '#141414', margin: '20px 0' }} />
);

function PairButtons({ options, active, onSelect }) {
    return (
        <div style={{ display: 'flex', gap: 1, background: '#111' }}>
            {options.map(({ id, label }) => (
                <button
                    key={id}
                    onClick={() => onSelect(id)}
                    style={{
                        ...btn(active === id ? 'active' : 'default'),
                        flex: 1, border: 'none',
                    }}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}

export default function ControlPanel({
    isRunning, onToggle,
    autoFollow, setAutoFollow,
    toolMode, setToolMode,
    targetModel, setTargetModel,
    scenario, onScenario,
}) {
    const [windEnabled, setWindEnabled] = useState(true);
    const [rainActive,  setRainActive]  = useState(false);
    const [sunnyActive, setSunnyActive] = useState(false);
    const [training, setTraining] = useState({
        is_training: false,
        message: 'Idle',
        is_downloadable: false,
        current_epoch: 0,
        total_epochs: 5,
    });

    useEffect(() => {
        const id = setInterval(async () => {
            try {
                const res = await fetch(`${API}/rl/train/status`);
                if (res.ok) setTraining(await res.json());
            } catch {}
        }, 2000);
        return () => clearInterval(id);
    }, []);

    const startTraining = async () => {
        if (training.is_training) return;
        setTraining(p => ({ ...p, is_training: true, message: 'Spinning up environment...' }));
        await fetch(`${API}/rl/train/start`, { method: 'POST' });
    };

    const toggleWind = async () => {
        const res = await fetch(`${API}/simulation/wind/toggle`, { method: 'POST' });
        if (res.ok) setWindEnabled((await res.json()).wind_enabled);
    };

    const toggleRain = async () => {
        const res = await fetch(`${API}/simulation/weather/rain/toggle`, { method: 'POST' });
        if (res.ok) setRainActive((await res.json()).rain_active);
    };

    const toggleSunny = async () => {
        const res = await fetch(`${API}/simulation/weather/sunny/toggle`, { method: 'POST' });
        if (res.ok) setSunnyActive((await res.json()).weather_sunny);
    };

    const exportTelemetry = async () => {
        const res = await fetch(`${API}/simulation/telemetry/export`);
        if (!res.ok) return;
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data.telemetry, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = Object.assign(document.createElement('a'), {
            href: url, download: `telemetry_${Date.now()}.json`,
        });
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const setScenario = (type) => {
        fetch(`${API}/simulation/scenario/${type}`, { method: 'POST' });
        onScenario?.(type);
    };
    const clearObs    = ()     => fetch(`${API}/simulation/obstacles/clear`, { method: 'POST' });

    const trainingPct = training.total_epochs > 0
        ? Math.round((training.current_epoch / training.total_epochs) * 100) : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

            {/* ── Session ── */}
            <SectionLabel>Session</SectionLabel>
            <button
                onClick={onToggle}
                style={btn(isRunning ? 'danger' : 'success')}
            >
                {isRunning ? '⏹ ABORT SESSION' : '▶ LAUNCH SESSION'}
            </button>

            <Divider />

            {/* ── Map Tool ── */}
            <SectionLabel>Map Tool</SectionLabel>
            <PairButtons
                options={[{ id: 'TARGET', label: 'TARGET' }, { id: 'OBSTACLE', label: 'OBSTACLE' }]}
                active={toolMode}
                onSelect={setToolMode}
            />

            <Divider />

            {/* ── Target Asset ── */}
            <SectionLabel>Target Asset</SectionLabel>
            <PairButtons
                options={[{ id: 'human', label: 'HUMAN' }, { id: 'truck', label: 'TRUCK' }]}
                active={targetModel}
                onSelect={setTargetModel}
            />

            <Divider />

            {/* ── Scenario ── */}
            <SectionLabel>Environment Preset</SectionLabel>
            <div style={{ display: 'flex', gap: 1, marginBottom: 1 }}>
                <button onClick={() => setScenario('forest')} style={{ ...btn(scenario === 'forest' ? 'success' : 'default'), flex: 1, border: 'none' }}>FOREST</button>
                <button onClick={() => setScenario('urban')}  style={{ ...btn(scenario === 'urban'  ? 'amber'   : 'default'), flex: 1, border: 'none' }}>URBAN</button>
            </div>
            <button onClick={() => setScenario('mixed')} style={{ ...btn(scenario === 'mixed' ? 'purple' : 'default'), width: '100%' }}>
                ◈ MIXED BATTLEGROUND
            </button>
            <Divider />

            {/* ── Weather ── */}
            <SectionLabel>Weather & Atmosphere</SectionLabel>
            <div style={{ display: 'flex', gap: 1, marginBottom: 1 }}>
                <button onClick={toggleWind} style={{ ...btn(windEnabled ? 'cyan' : 'default'), flex: 1, border: 'none' }}>
                    {windEnabled ? '〜 WIND ON' : '✕ WIND OFF'}
                </button>
                <button onClick={toggleRain} style={{ ...btn(rainActive ? 'primary' : 'default'), flex: 1, border: 'none' }}>
                    {rainActive ? '🌧 RAIN ON' : '○ RAIN OFF'}
                </button>
            </div>
            <button onClick={toggleSunny} style={btn(sunnyActive ? 'amber' : 'default')}>
                {sunnyActive ? '☀ CLEAR SKY' : '☁ OVERCAST'}
            </button>

            <Divider />

            {/* ── Camera ── */}
            <SectionLabel>Camera</SectionLabel>
            <button
                onClick={() => setAutoFollow(!autoFollow)}
                style={btn(autoFollow ? 'primary' : 'default')}
            >
                {autoFollow ? '◎ LOCKED ON TARGET' : '◈ FREE FLOAT'}
            </button>

            <Divider />

            {/* ── Telemetry ── */}
            <SectionLabel>Telemetry</SectionLabel>
            <button onClick={exportTelemetry} style={btn('cyan')}>
                ↓ EXPORT TELEMETRY LOG
            </button>

            <Divider />

            {/* ── RL Training ── */}
            <SectionLabel>Neural Network Training</SectionLabel>

            {/* Status terminal */}
            <div style={{
                background: '#0a0a0a', border: '1px solid #1a1a1a',
                padding: '8px 10px', marginBottom: 8,
            }}>
                <div style={{
                    fontFamily: 'monospace', fontSize: '9px',
                    color: training.is_training ? '#f2c94c' : '#333',
                    minHeight: 14,
                }}>
                    {'> '}{training.message}
                </div>
                {training.is_training && (
                    <div style={{ marginTop: 6 }}>
                        <div style={{
                            height: 2, background: '#1a1a1a',
                            position: 'relative', overflow: 'hidden',
                        }}>
                            <div style={{
                                position: 'absolute', top: 0, left: 0,
                                height: '100%', width: `${trainingPct}%`,
                                background: '#f2c94c',
                                transition: 'width 400ms ease',
                            }} />
                        </div>
                        <div style={{ marginTop: 4, fontFamily: 'monospace', fontSize: '9px', color: '#444' }}>
                            EPOCH {training.current_epoch}/{training.total_epochs} · {trainingPct}%
                        </div>
                    </div>
                )}
            </div>

            <button
                onClick={startTraining}
                disabled={training.is_training}
                style={btn(training.is_training ? 'default' : 'purple')}
            >
                {training.is_training ? '⟳ TRAINING IN PROGRESS' : '◈ INITIATE CO-EVOLUTION'}
            </button>

            <div style={{ marginTop: 4 }}>
                <a
                    href={`${API}/rl/model/download`}
                    style={{
                        ...btn(training.is_downloadable ? 'success' : 'default'),
                        pointerEvents: training.is_downloadable ? 'auto' : 'none',
                        opacity: training.is_downloadable ? 1 : 0.35,
                        lineHeight: 1,
                    }}
                >
                    ↓ DOWNLOAD BRAIN CELL
                </a>
            </div>

        </div>
    );
}
