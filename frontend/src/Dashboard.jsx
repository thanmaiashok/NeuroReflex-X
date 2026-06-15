import { useState, useEffect, useRef } from 'react';
import Scene3D from './Scene3D';
import Map2D from './Map2D';
import ControlPanel from './ControlPanel';
import DeepAnalyticsPanel from './DeepAnalyticsPanel';
import DroneConditionPanel from './DroneConditionPanel';
import HUD from './HUD';
import AlgoStatusPanel from './AlgoStatusPanel';
import OpticSensor from './OpticSensor';
import TerminalFeed from './TerminalFeed';

const API_URL = 'http://localhost:8000';

const NAV = [
    { id: 'mission',   label: 'MISSION OPS',      icon: '⬡' },
    { id: 'analytics', label: 'ANALYTICS',         icon: '◈' },
    { id: 'map',       label: 'SATELLITE MAP',     icon: '◎' },
    { id: 'camera',    label: 'OPTIC SENSOR',      icon: '◉' },
    { id: 'drone',     label: 'DRONE CONDITION',   icon: '⬤' },
    { id: 'terminal',  label: 'TERMINAL',          icon: '›_' },
];

const STATUS_COLOR = {
    TRACKING:  '#6fcf97',
    ENGAGING:  '#f2c94c',
    STRIKING:  '#f2994a',
    COLLAPSED: '#56ccf2',
    DESTROYED: '#eb5757',
    SEARCHING: '#555555',
    OFFLINE:   '#333333',
};

const S = {
    /* Layout */
    root: {
        display: 'flex', flexDirection: 'column',
        height: '100vh', overflow: 'hidden',
        background: '#080808', color: '#f2f2f2',
        fontFamily: "'Inter', -apple-system, sans-serif",
    },
    header: {
        height: '48px', padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid #1a1a1a',
        background: '#0a0a0a', flexShrink: 0,
    },
    body: { display: 'flex', flex: 1, overflow: 'hidden' },
    content: { flex: 1, display: 'flex', overflow: 'hidden' },

    /* Sidebar */
    nav: (expanded) => ({
        width: expanded ? '192px' : '52px',
        minWidth: expanded ? '192px' : '52px',
        background: '#0a0a0a',
        borderRight: '1px solid #1a1a1a',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0, overflow: 'hidden',
        transition: 'width 160ms ease, min-width 160ms ease',
        zIndex: 200,
    }),
    navLogo: {
        width: '52px', minWidth: '52px', height: '48px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#f2f2f2', fontSize: '13px', fontWeight: '800',
        fontFamily: 'monospace', letterSpacing: '2px',
        borderBottom: '1px solid #1a1a1a', flexShrink: 0,
    },
    navItem: (active) => ({
        width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
        padding: '10px 14px',
        background: active ? 'rgba(255,255,255,0.05)' : 'transparent',
        borderLeft: `2px solid ${active ? '#ffffff' : 'transparent'}`,
        color: active ? '#f2f2f2' : '#444444',
        cursor: 'pointer', fontSize: '10px',
        fontFamily: "'Inter', monospace", fontWeight: active ? '600' : '400',
        letterSpacing: '0.08em', textAlign: 'left',
        whiteSpace: 'nowrap', flexShrink: 0,
        transition: 'color 120ms, background 120ms, border-color 120ms',
    }),
    navIcon: {
        fontSize: '15px', minWidth: '24px',
        textAlign: 'center', flexShrink: 0,
        fontFamily: 'monospace',
    },

    /* Panel wrapper */
    panel: (p = {}) => ({
        flex: 1, display: 'flex', flexDirection: 'column',
        overflow: 'hidden', padding: '8px', gap: '8px', ...p,
    }),
    panelHeader: (accent = '#444') => ({
        padding: '7px 14px',
        background: '#0a0a0a',
        border: '1px solid #1a1a1a',
        fontFamily: 'monospace', fontSize: '9px',
        color: accent, flexShrink: 0, letterSpacing: '0.1em',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }),
    panelBody: {
        flex: 1, border: '1px solid #1a1a1a',
        background: '#0a0a0a', overflow: 'hidden',
    },
};

function LiveDot({ color }) {
    return (
        <span style={{
            display: 'inline-block', width: 6, height: 6,
            borderRadius: '50%', background: color,
            marginRight: 6,
            animation: 'pulse-dot 1.8s ease-in-out infinite',
        }} />
    );
}

function StatusPill({ status }) {
    const color = STATUS_COLOR[status] || STATUS_COLOR.OFFLINE;
    return (
        <div style={{
            display: 'flex', alignItems: 'center',
            padding: '3px 10px',
            border: `1px solid ${color}22`,
            background: `${color}11`,
            fontFamily: 'monospace', fontSize: '10px',
            letterSpacing: '0.1em', color,
        }}>
            <LiveDot color={color} />
            {status}
        </div>
    );
}

export default function Dashboard() {
    const [activePage, setActivePage]   = useState('mission');
    const [isRunning, setIsRunning]     = useState(false);
    const [autoFollow, setAutoFollow]   = useState(true);
    const [toolMode, setToolMode]       = useState('TARGET');
    const [targetModel, setTargetModel] = useState('human');
    const [scenario, setScenario]       = useState('forest');
    const [data, setData]               = useState(null);
    const [navExpanded, setNavExpanded] = useState(false);
    const [physDt, setPhysDt]           = useState(0);
    const [dataLoss, setDataLoss]       = useState(0);
    const [clock, setClock]             = useState('');
    const [latencyMs, setLatencyMs]     = useState(0);
    const [yoloDetections, setYoloDetections] = useState([]);

    const requestRef      = useRef();
    const lastStepTime    = useRef(null);
    const totalAttempts   = useRef(0);
    const failedAttempts  = useRef(0);

    /* Live clock */
    useEffect(() => {
        const tick = () => setClock(new Date().toISOString().slice(11, 19) + ' UTC');
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    const stepSimulation = async () => {
        const now = performance.now();
        totalAttempts.current += 1;
        try {
            const t0     = performance.now();
            const res    = await fetch(`${API_URL}/simulation/step`, { method: 'POST' });
            const result = await res.json();
            setLatencyMs(performance.now() - t0);
            const elapsed = lastStepTime.current !== null ? (now - lastStepTime.current) / 1000 : 0;
            lastStepTime.current = now;
            setPhysDt(elapsed);
            setDataLoss((failedAttempts.current / totalAttempts.current) * 100);
            setData(result);
        } catch {
            failedAttempts.current += 1;
            setDataLoss((failedAttempts.current / totalAttempts.current) * 100);
        }
    };

    const handleSetTargetModel = async (mode) => {
        try {
            await fetch(`${API_URL}/simulation/target/mode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode }),
            });
            setTargetModel(mode);
        } catch {}
    };

    const loop = async () => {
        if (isRunning) {
            await stepSimulation();
            requestRef.current = setTimeout(loop, 50);
        }
    };

    useEffect(() => {
        if (isRunning) requestRef.current = setTimeout(loop, 50);
        return () => clearTimeout(requestRef.current);
    }, [isRunning]);

    const status = data?.status ?? 'OFFLINE';
    const statusColor = STATUS_COLOR[status] ?? STATUS_COLOR.OFFLINE;

    /* ─── Sidebar ─── */
    const Sidebar = (
        <nav
            style={S.nav(navExpanded)}
            onMouseEnter={() => setNavExpanded(true)}
            onMouseLeave={() => setNavExpanded(false)}
        >
            <div style={S.navLogo}>NX</div>

            <div style={{ marginTop: 8, flex: 1 }}>
                {NAV.map(item => {
                    const active = activePage === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActivePage(item.id)}
                            title={item.label}
                            style={S.navItem(active)}
                        >
                            <span style={S.navIcon}>{item.icon}</span>
                            <span style={{
                                opacity: navExpanded ? 1 : 0,
                                transition: 'opacity 120ms',
                                pointerEvents: 'none',
                                fontSize: '10px',
                                letterSpacing: '0.08em',
                            }}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* Bottom version tag */}
            <div style={{
                padding: '10px 14px', borderTop: '1px solid #1a1a1a',
                fontFamily: 'monospace', fontSize: '9px', color: '#2a2a2a',
                whiteSpace: 'nowrap',
            }}>
                {navExpanded ? 'N-RFX v2.4.0' : 'v2'}
            </div>
        </nav>
    );

    /* ─── Page views ─── */
    const renderPage = () => {
        const key = activePage; // triggers remount → CSS fadeIn

        if (activePage === 'analytics') return (
            <div key={key} className="page-enter" style={S.panel()}>
                <div style={S.panelHeader()}>
                    <span>DEEP_ANALYTICS — FLIGHT_RECORDER</span>
                    <span style={{ color: '#333' }}>REPLAY · EXPORT</span>
                </div>
                <div style={S.panelBody}>
                    <DeepAnalyticsPanel data={data} physDt={physDt} dataLoss={dataLoss} />
                </div>
            </div>
        );

        if (activePage === 'map') return (
            <div key={key} className="page-enter" style={S.panel()}>
                <div style={S.panelHeader(statusColor)}>
                    <span>SATELLITE_DOWNLINK</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LiveDot color={statusColor} />
                        LIVE · {status}
                    </span>
                </div>
                <div style={S.panelBody}>
                    <Map2D data={data} toolMode={toolMode} />
                </div>
            </div>
        );

        if (activePage === 'camera') return (
            <div key={key} className="page-enter" style={S.panel()}>
                <div style={S.panelHeader('#f2c94c')}>
                    <span>OPTICAL_SENSOR_01 — DUAL FEED COMPARISON</span>
                    <span style={{ color: '#444' }}>3D POV TRACKING</span>
                </div>
                <div style={{ flex: 1, display: 'flex', gap: 8, overflow: 'hidden' }}>
                    <div style={{ ...S.panelBody, flex: 1, position: 'relative' }}>
                        <OpticSensor data={data} showDFAF={false} yoloDetections={yoloDetections} />
                        <div style={{ position: 'absolute', bottom: 8, right: 10, color: '#6fcf97', fontSize: '9px', fontFamily: 'monospace' }}>
                            YOLO_PERCEPTION_FEED
                        </div>
                    </div>
                    <div style={{ ...S.panelBody, flex: 1, position: 'relative' }}>
                        <OpticSensor data={data} showDFAF={true} yoloDetections={yoloDetections} />
                        <div style={{ position: 'absolute', bottom: 8, right: 10, color: '#f2c94c', fontSize: '9px', fontFamily: 'monospace' }}>
                            YOLO + DFAF_OVERLAY
                        </div>
                    </div>
                </div>
            </div>
        );

        if (activePage === 'terminal') return (
            <div key={key} className="page-enter" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <TerminalFeed data={data} />
            </div>
        );

        if (activePage === 'drone') return (
            <div key={key} className="page-enter" style={S.panel()}>
                <div style={S.panelHeader('#56ccf2')}>
                    <span>DRONE_CONDITION — HARDWARE MONITOR</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <LiveDot color={data ? '#6fcf97' : '#333'} />
                        {data ? 'TELEMETRY ACTIVE' : 'AWAITING SIGNAL'}
                    </span>
                </div>
                <div style={S.panelBody}>
                    <DroneConditionPanel data={data} />
                </div>
            </div>
        );

        /* MISSION OPS */
        return (
            <div key={key} className="page-enter" style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: 8, gap: 8 }}>

                {/* Control sidebar */}
                <aside style={{
                    width: 292, flexShrink: 0,
                    background: '#0a0a0a',
                    border: '1px solid #1a1a1a',
                    display: 'flex', flexDirection: 'column',
                    overflow: 'hidden',
                }}>
                    {/* Aside header */}
                    <div style={{
                        padding: '8px 16px',
                        borderBottom: '1px solid #1a1a1a',
                        fontFamily: 'monospace', fontSize: '9px',
                        color: '#333', letterSpacing: '0.1em', flexShrink: 0,
                    }}>
                        MISSION_CONTROL
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px' }}>
                        <ControlPanel
                            isRunning={isRunning}
                            onToggle={() => setIsRunning(!isRunning)}
                            autoFollow={autoFollow}
                            setAutoFollow={setAutoFollow}
                            toolMode={toolMode}
                            setToolMode={setToolMode}
                            targetModel={targetModel}
                            setTargetModel={handleSetTargetModel}
                            scenario={scenario}
                            onScenario={setScenario}
                        />
                    </div>
                </aside>

                {/* 3D theater + overlays */}
                <main style={{
                    flex: 1, position: 'relative',
                    background: '#000',
                    border: '1px solid #1a1a1a',
                    overflow: 'hidden', display: 'flex', flexDirection: 'column',
                }}>
                    <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                        <Scene3D data={data} autoFollow={autoFollow} targetModel={targetModel} scenario={scenario} onYoloDetect={setYoloDetections} />

                        {/* Floating satellite map */}
                        <div style={{
                            position: 'absolute', top: 14, left: 14,
                            width: 260, height: 260,
                            background: 'rgba(8,8,8,0.96)',
                            border: '1px solid #1e1e1e',
                            display: 'flex', flexDirection: 'column',
                            boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
                            zIndex: 50,
                        }}>
                            <div style={{
                                padding: '6px 10px', background: '#0f0f0f',
                                borderBottom: '1px solid #1a1a1a',
                                fontFamily: 'monospace', fontSize: '9px',
                                color: '#444', letterSpacing: '0.1em',
                                display: 'flex', justifyContent: 'space-between',
                            }}>
                                <span>SAT_DOWNLINK</span>
                                <span style={{ color: statusColor }}>● {status}</span>
                            </div>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <Map2D data={data} toolMode={toolMode} />
                            </div>
                        </div>

                        {/* Floating optic sensor */}
                        <div style={{
                            position: 'absolute', top: 14, right: 14,
                            width: 260, height: 200,
                            background: 'rgba(8,8,8,0.96)',
                            border: '1px solid #1e1e1e',
                            display: 'flex', flexDirection: 'column',
                            boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
                            overflow: 'hidden', zIndex: 50,
                        }}>
                            <div style={{
                                padding: '6px 10px', background: '#0f0f0f',
                                borderBottom: '1px solid #1a1a1a',
                                fontFamily: 'monospace', fontSize: '9px',
                                color: '#f2c94c', letterSpacing: '0.08em',
                            }}>
                                OPTICAL_SENSOR_01
                            </div>
                            <div style={{ flex: 1, position: 'relative' }}>
                                <OpticSensor data={data} />
                            </div>
                        </div>

                        {isRunning && <HUD data={data} />}

                        {status === 'DESTROYED' && (
                            <div style={{
                                position: 'absolute', top: '50%', left: '50%',
                                transform: 'translate(-50%,-50%)',
                                display: 'flex', flexDirection: 'column',
                                alignItems: 'center', gap: 6,
                                zIndex: 100, animation: 'fadeIn 200ms ease both',
                                pointerEvents: 'none',
                            }}>
                                <div style={{
                                    color: '#eb5757', fontSize: '13px', fontWeight: '700',
                                    border: '1px solid #eb575744',
                                    padding: '8px 20px',
                                    background: 'rgba(0,0,0,0.88)',
                                    letterSpacing: '4px',
                                    fontFamily: 'monospace',
                                    whiteSpace: 'nowrap',
                                }}>
                                    TARGET_ELIMINATED
                                </div>
                                <div style={{
                                    color: '#444', fontSize: '9px',
                                    fontFamily: 'monospace', letterSpacing: '0.1em',
                                }}>
                                    RESPAWNING IN 5s
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Analytics strip */}
                    <div style={{
                        height: 192, flexShrink: 0,
                        borderTop: '1px solid #1a1a1a',
                        background: '#0a0a0a', overflow: 'hidden',
                    }}>
                        <DeepAnalyticsPanel data={data} physDt={physDt} dataLoss={dataLoss} />
                    </div>
                </main>
            </div>
        );
    };

    return (
        <div style={S.root}>
            {/* ─── Header ─── */}
            <header style={S.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{
                            fontSize: '15px', fontWeight: '700',
                            letterSpacing: '-0.03em', color: '#f2f2f2',
                        }}>
                            NeuroReflex-X
                        </span>
                        <span style={{
                            fontFamily: 'monospace', fontSize: '9px',
                            color: '#333', letterSpacing: '0.05em',
                        }}>
                            HYBRID REFLEX–COGNITIVE
                        </span>
                    </div>
                    <StatusPill status={status} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    {data && (
                        <div style={{
                            fontFamily: 'monospace', fontSize: '10px', color: '#333',
                            display: 'flex', gap: 20,
                        }}>
                            <span>PREC <span style={{ color: '#888' }}>{(data.precision * 100).toFixed(1)}%</span></span>
                            <span>CONF <span style={{ color: '#888' }}>{(data.stability * 100).toFixed(0)}%</span></span>
                            <span>LOSS <span style={{ color: '#888' }}>{dataLoss.toFixed(1)}%</span></span>
                            <span>YOLO <span style={{ color: yoloDetections.length > 0 ? '#6fcf97' : '#555' }}>{yoloDetections.length} DET</span></span>
                        </div>
                    )}
                    <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#2a2a2a' }}>
                        {clock}
                    </div>
                    <div style={{
                        fontFamily: 'monospace', fontSize: '9px', color: '#2a2a2a',
                    }}>
                        KERNEL 0xREFLX_STBL
                    </div>
                </div>
            </header>

            {/* ─── Body ─── */}
            <div style={S.body}>
                {Sidebar}
                <div style={S.content}>
                    {renderPage()}
                </div>
            </div>
        </div>
    );
}
