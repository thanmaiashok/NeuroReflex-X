import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

const C = {
    bg0:    '#080808',
    bg1:    '#0d0d0d',
    bg2:    '#111111',
    border: '#1a1a1a',
    border2:'#222222',
    text0:  '#f2f2f2',
    text1:  '#888888',
    text2:  '#444444',
    text3:  '#2a2a2a',
    ok:     '#6fcf97',
    warn:   '#f2c94c',
    danger: '#eb5757',
    blue:   '#56ccf2',
    purple: '#bb86fc',
};

function healthColor(pct) {
    if (pct > 75) return C.ok;
    if (pct > 40) return C.warn;
    return C.danger;
}

// X-config motor positions (45° diagonal arms)
const MOTOR_META = [
    { id: 'm1', label: 'M1', desc: 'FRONT-RIGHT', rotation: 'CW',  pos: [ 0.52, 0, -0.52], color: C.blue },
    { id: 'm2', label: 'M2', desc: 'BACK-LEFT',   rotation: 'CW',  pos: [-0.52, 0,  0.52], color: C.blue },
    { id: 'm3', label: 'M3', desc: 'FRONT-LEFT',  rotation: 'CCW', pos: [-0.52, 0, -0.52], color: C.purple },
    { id: 'm4', label: 'M4', desc: 'BACK-RIGHT',  rotation: 'CCW', pos: [ 0.52, 0,  0.52], color: C.purple },
];
const PROP_SPINS = [1, 1, -1, -1];

// ─── 3D Drone Model ──────────────────────────────────────────────────────────

function DroneModel({ selected, hovered, onSelect, onHover }) {
    const p0 = useRef(), p1 = useRef(), p2 = useRef(), p3 = useRef();
    const propRefs = [p0, p1, p2, p3];

    useFrame((_, dt) => {
        propRefs.forEach((ref, i) => {
            if (ref.current) ref.current.rotation.y += PROP_SPINS[i] * dt * 20;
        });
    });

    const highlight = (id, base, emissive) => ({
        color:             selected === id ? '#e0e0e0' : hovered === id ? '#888' : base,
        emissive:          selected === id ? emissive  : '#000000',
        emissiveIntensity: selected === id ? 0.5 : 0,
    });

    const bind = (id) => ({
        onClick:      (e) => { e.stopPropagation(); onSelect(selected === id ? null : id); },
        onPointerOver:(e) => { e.stopPropagation(); onHover(id);  document.body.style.cursor = 'pointer'; },
        onPointerOut: (e) => { e.stopPropagation(); onHover(null); document.body.style.cursor = 'default'; },
    });

    return (
        <group scale={1.5}>
            {/* ── Frame body ── */}
            <group {...bind('body')}>
                {/* Top plate */}
                <mesh position={[0, 0.09, 0]}>
                    <boxGeometry args={[0.46, 0.055, 0.46]} />
                    <meshStandardMaterial {...highlight('body', '#4a4a4a', '#cccccc')} roughness={0.25} metalness={0.65} />
                </mesh>
                {/* Bottom plate */}
                <mesh position={[0, -0.09, 0]}>
                    <boxGeometry args={[0.42, 0.045, 0.42]} />
                    <meshStandardMaterial {...highlight('body', '#3a3a3a', '#cccccc')} roughness={0.25} metalness={0.65} />
                </mesh>
                {/* Standoffs (4 corners) */}
                {[[0.16, 0.16], [0.16, -0.16], [-0.16, 0.16], [-0.16, -0.16]].map(([x, z], i) => (
                    <mesh key={i} position={[x, 0, z]}>
                        <cylinderGeometry args={[0.016, 0.016, 0.2, 6]} />
                        <meshStandardMaterial color="#333" metalness={0.9} roughness={0.15} />
                    </mesh>
                ))}
            </group>

            {/* ── Arms (cross diagonal) ── */}
            <mesh rotation={[0, Math.PI / 4, 0]}>
                <boxGeometry args={[1.16, 0.04, 0.055]} />
                <meshStandardMaterial color="#424242" roughness={0.35} metalness={0.55} />
            </mesh>
            <mesh rotation={[0, -Math.PI / 4, 0]}>
                <boxGeometry args={[1.16, 0.04, 0.055]} />
                <meshStandardMaterial color="#424242" roughness={0.35} metalness={0.55} />
            </mesh>

            {/* ── Motors + props ── */}
            {MOTOR_META.map((m, i) => (
                <group key={m.id} position={m.pos} {...bind(m.id)}>
                    {/* Motor housing */}
                    <mesh position={[0, 0.05, 0]}>
                        <cylinderGeometry args={[0.1, 0.09, 0.1, 12]} />
                        <meshStandardMaterial
                            {...highlight(m.id, '#505050', m.color)}
                            roughness={0.2} metalness={0.8}
                        />
                    </mesh>
                    {/* Accent ring */}
                    <mesh position={[0, -0.005, 0]}>
                        <cylinderGeometry args={[0.11, 0.11, 0.02, 12]} />
                        <meshStandardMaterial color={m.color} metalness={0.7} roughness={0.2} />
                    </mesh>
                    {/* Prop (2-blade cross) */}
                    <group ref={propRefs[i]} position={[0, 0.12, 0]}>
                        <mesh>
                            <boxGeometry args={[0.44, 0.01, 0.05]} />
                            <meshStandardMaterial
                                color={selected === m.id ? '#cccccc' : '#505050'}
                                transparent opacity={0.9}
                            />
                        </mesh>
                        <mesh rotation={[0, Math.PI / 2, 0]}>
                            <boxGeometry args={[0.44, 0.01, 0.05]} />
                            <meshStandardMaterial
                                color={selected === m.id ? '#cccccc' : '#505050'}
                                transparent opacity={0.9}
                            />
                        </mesh>
                    </group>
                    {/* Status LED */}
                    <mesh position={[0, 0.11, 0]}>
                        <sphereGeometry args={[0.016, 6, 4]} />
                        <meshBasicMaterial color={m.color} />
                    </mesh>
                </group>
            ))}

            {/* ── FC stack (top of body) ── */}
            <group {...bind('fc')}>
                <mesh position={[0, 0.165, 0]}>
                    <boxGeometry args={[0.24, 0.032, 0.24]} />
                    <meshStandardMaterial
                        {...highlight('fc', '#1a4a1a', C.ok)}
                        roughness={0.5} metalness={0.3}
                    />
                </mesh>
                <mesh position={[0, 0.185, 0]}>
                    <boxGeometry args={[0.058, 0.01, 0.058]} />
                    <meshStandardMaterial color="#050505" metalness={0.6} />
                </mesh>
            </group>

            {/* ── Battery (bottom) ── */}
            <group {...bind('battery')}>
                <mesh position={[0, -0.2, 0.05]}>
                    <boxGeometry args={[0.33, 0.1, 0.68]} />
                    <meshStandardMaterial
                        {...highlight('battery', '#3a2a00', C.warn)}
                        roughness={0.65} metalness={0.1}
                    />
                </mesh>
                {/* Cell labels */}
                {[-0.12, -0.04, 0.04, 0.12].map((x, i) => (
                    <mesh key={i} position={[x, -0.15, 0.4]}>
                        <boxGeometry args={[0.052, 0.01, 0.015]} />
                        <meshBasicMaterial color={C.ok} />
                    </mesh>
                ))}
            </group>

            {/* ── Camera mount (front) ── */}
            <group {...bind('body')}>
                <mesh position={[0, 0.01, -0.29]}>
                    <boxGeometry args={[0.1, 0.075, 0.055]} />
                    <meshStandardMaterial color="#101010" roughness={0.8} />
                </mesh>
                <mesh position={[0, 0.01, -0.32]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.026, 0.026, 0.018, 10]} />
                    <meshStandardMaterial color="#020202" metalness={0.95} roughness={0.05} />
                </mesh>
            </group>
        </group>
    );
}

// ─── Detail panels (right side) ──────────────────────────────────────────────

function Row({ label, value, color }) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0',
                      borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: C.text2, letterSpacing: '0.1em' }}>{label}</span>
            <span style={{ fontFamily: 'monospace', fontSize: 9, color: color ?? C.text1, fontWeight: 600 }}>{value}</span>
        </div>
    );
}

function Bar({ pct, color }) {
    return (
        <div style={{ height: 3, background: C.border2, borderRadius: 1, overflow: 'hidden', marginTop: 3 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 400ms ease' }} />
        </div>
    );
}

function SectionHdr({ children, color }) {
    return (
        <div style={{ fontFamily: 'monospace', fontSize: 8, color: color ?? C.text3,
                      letterSpacing: '0.14em', fontWeight: 700,
                      borderBottom: `1px solid ${C.border}`, paddingBottom: 4, marginBottom: 6, marginTop: 10 }}>
            {children}
        </div>
    );
}

function MotorDetail({ motor, meta }) {
    const rpm    = motor.rpm;
    const maxRPM = 11000;
    const hc     = healthColor(motor.health);
    return (
        <div style={{ padding: '14px 16px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: C.text0, fontWeight: 700, letterSpacing: '0.08em' }}>
                    {meta.label} — {meta.desc}
                </span>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: C.text2, marginBottom: 12 }}>
                {meta.rotation === 'CW' ? 'CLOCKWISE' : 'COUNTER-CLOCKWISE'} · BRUSHLESS
            </div>

            <SectionHdr color={meta.color}>PERFORMANCE</SectionHdr>
            <Row label="RPM"         value={`${rpm.toLocaleString()} rpm`} />
            <Bar pct={Math.round((rpm / maxRPM) * 100)} color={meta.color} />
            <div style={{ height: 6 }} />
            <Row label="CURRENT"     value={`${motor.current} A`} />
            <Row label="TEMPERATURE" value={`${motor.temp} °C`}  color={motor.temp > 65 ? C.danger : motor.temp > 50 ? C.warn : C.text1} />

            <SectionHdr>ESC</SectionHdr>
            <Row label="INPUT VOLTAGE" value={`${motor.escV} V`} />
            <Row label="PWM SIGNAL"    value={`${motor.pwm} µs`} />
            <Row label="ESC TEMP"      value={`${motor.escTemp} °C`} />

            <SectionHdr>HEALTH</SectionHdr>
            <Row label="INTEGRITY" value={`${motor.health.toFixed(1)} %`} color={hc} />
            <Bar pct={motor.health} color={hc} />
        </div>
    );
}

function BatteryDetail({ batt }) {
    const hc = healthColor(batt.pct);
    return (
        <div style={{ padding: '14px 16px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.warn, flexShrink: 0 }} />
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: C.text0, fontWeight: 700, letterSpacing: '0.08em' }}>
                    BATTERY PACK
                </span>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: C.text2, marginBottom: 12 }}>
                4S LiPo · 1300 mAh · XT60
            </div>

            <SectionHdr color={C.warn}>CELL STATUS</SectionHdr>
            {batt.cells.map((v, i) => (
                <div key={i}>
                    <Row label={`CELL ${i + 1}`} value={`${v.toFixed(2)} V`}
                         color={v < 3.5 ? C.danger : v < 3.7 ? C.warn : C.ok} />
                </div>
            ))}

            <SectionHdr>PACK</SectionHdr>
            <Row label="PACK VOLTAGE"   value={`${batt.voltage.toFixed(2)} V`} />
            <Row label="CHARGE"         value={`${batt.pct} %`} color={hc} />
            <Bar pct={batt.pct} color={hc} />
            <div style={{ height: 6 }} />
            <Row label="DRAW"           value={`${batt.current} A`} />
            <Row label="TEMPERATURE"    value={`${batt.temp} °C`} color={batt.temp > 45 ? C.warn : C.text1} />
            <Row label="ESTIMATED LIFE" value={batt.pct > 10 ? `${Math.round(batt.pct / 8)} min` : 'RTB NOW'} color={batt.pct < 20 ? C.danger : C.text1} />
        </div>
    );
}

function FCDetail({ fc }) {
    return (
        <div style={{ padding: '14px 16px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.ok, flexShrink: 0 }} />
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: C.text0, fontWeight: 700, letterSpacing: '0.08em' }}>
                    FLIGHT CONTROLLER
                </span>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: C.text2, marginBottom: 12 }}>
                NRX-FC v2 · BETAFLIGHT 4.4
            </div>

            <SectionHdr color={C.ok}>LOOP</SectionHdr>
            <Row label="LOOP FREQUENCY" value={`${fc.loopHz} Hz`} />
            <Row label="CPU LOAD"       value={`${fc.cpuPct} %`} color={fc.cpuPct > 70 ? C.danger : fc.cpuPct > 50 ? C.warn : C.ok} />
            <Bar pct={fc.cpuPct} color={healthColor(100 - fc.cpuPct)} />

            <SectionHdr>IMU</SectionHdr>
            <Row label="GYRO BIAS"    value={fc.gyroBias} />
            <Row label="ACC CALIB"    value={fc.armed ? 'OK' : 'STANDBY'} color={fc.armed ? C.ok : C.text2} />

            <SectionHdr>STATE</SectionHdr>
            <Row label="ARMED"        value={fc.armed ? 'ARMED' : 'DISARMED'} color={fc.armed ? C.ok : C.text2} />
            <Row label="FLIGHT MODE"  value={fc.armed ? 'ANGLE' : 'IDLE'} />
            <Row label="GPS LOCK"     value="NO FIX" color={C.text2} />
        </div>
    );
}

function FrameDetail({ frame }) {
    const hc = healthColor(frame.integrity);
    return (
        <div style={{ padding: '14px 16px', overflowY: 'auto', height: '100%', boxSizing: 'border-box' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.text1, flexShrink: 0 }} />
                <span style={{ fontFamily: 'monospace', fontSize: 11, color: C.text0, fontWeight: 700, letterSpacing: '0.08em' }}>
                    FRAME / CHASSIS
                </span>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: C.text2, marginBottom: 12 }}>
                CARBON FIBER · 5" · 220mm DIAG
            </div>

            <SectionHdr>VIBRATION (m/s²)</SectionHdr>
            <Row label="X-AXIS" value={`${frame.vibX}`} color={parseFloat(frame.vibX) > 2 ? C.warn : C.text1} />
            <Row label="Y-AXIS" value={`${frame.vibY}`} color={parseFloat(frame.vibY) > 2 ? C.warn : C.text1} />
            <Row label="Z-AXIS" value={`${frame.vibZ}`} color={parseFloat(frame.vibZ) > 2 ? C.warn : C.text1} />

            <SectionHdr>STRUCTURAL</SectionHdr>
            <Row label="INTEGRITY" value={`${frame.integrity} %`} color={hc} />
            <Bar pct={frame.integrity} color={hc} />
            <div style={{ height: 6 }} />
            <Row label="MATERIAL"     value="CFRP 3K" />
            <Row label="ARM TORQUE"   value={frame.integrity > 80 ? 'NOMINAL' : 'CHECK'} color={frame.integrity > 80 ? C.ok : C.warn} />
        </div>
    );
}

function PlaceholderDetail() {
    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <div style={{ fontFamily: 'monospace', fontSize: 9, color: C.text3, letterSpacing: '0.15em' }}>
                NO COMPONENT SELECTED
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 8, color: C.border2, letterSpacing: '0.1em' }}>
                CLICK DRONE PART TO INSPECT
            </div>
        </div>
    );
}

// ─── Bottom motor strip ───────────────────────────────────────────────────────

function MotorStrip({ motors, batt, selected, onSelect }) {
    const stripBtn = (id, active) => ({
        flex: 1, background: active ? 'rgba(255,255,255,0.04)' : 'transparent',
        border: `1px solid ${active ? '#333' : C.border}`,
        padding: '6px 10px', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', gap: 4,
        transition: 'background 120ms',
    });

    return (
        <div style={{ display: 'flex', gap: 4, height: 60, flexShrink: 0, padding: '0 0 0 0' }}>
            {motors.map((m, i) => {
                const meta = MOTOR_META[i];
                const hc   = healthColor(m.health);
                const active = selected === meta.id;
                return (
                    <button key={meta.id} onClick={() => onSelect(active ? null : meta.id)} style={stripBtn(meta.id, active)}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 8, color: meta.color, fontWeight: 700, letterSpacing: '0.1em' }}>
                                {meta.label} {meta.desc}
                            </span>
                            <span style={{ fontFamily: 'monospace', fontSize: 8, color: C.text2 }}>{meta.rotation}</span>
                        </div>
                        <div style={{ height: 2, background: C.border2, borderRadius: 1 }}>
                            <div style={{ height: '100%', width: `${Math.round((m.rpm / 11000) * 100)}%`,
                                          background: meta.color, transition: 'width 300ms ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: 7, color: C.text2 }}>
                                {m.rpm.toLocaleString()} RPM
                            </span>
                            <span style={{ fontFamily: 'monospace', fontSize: 7, color: hc }}>
                                {m.health.toFixed(0)}%
                            </span>
                        </div>
                    </button>
                );
            })}

            {/* Battery mini card */}
            <button onClick={() => onSelect(selected === 'battery' ? null : 'battery')}
                    style={stripBtn('battery', selected === 'battery')}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 8, color: C.warn, fontWeight: 700, letterSpacing: '0.1em' }}>
                        BATTERY 4S
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: 8, color: C.text2 }}>XT60</span>
                </div>
                <div style={{ height: 2, background: C.border2, borderRadius: 1 }}>
                    <div style={{ height: '100%', width: `${batt.pct}%`,
                                  background: healthColor(batt.pct), transition: 'width 300ms ease' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 7, color: C.text2 }}>
                        {batt.voltage.toFixed(1)} V · {batt.current} A
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: 7, color: healthColor(batt.pct) }}>
                        {batt.pct}%
                    </span>
                </div>
            </button>

            {/* FC mini card */}
            <button onClick={() => onSelect(selected === 'fc' ? null : 'fc')}
                    style={stripBtn('fc', selected === 'fc')}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 8, color: C.ok, fontWeight: 700, letterSpacing: '0.1em' }}>
                        FC STACK
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: 8, color: C.text2 }}>NRX-FC</span>
                </div>
                <div style={{ height: 2, background: C.border2, borderRadius: 1 }}>
                    <div style={{ height: '100%', width: `${100 - batt.pct * 0.3}%`, background: C.ok }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 7, color: C.text2 }}>400 Hz LOOP</span>
                    <span style={{ fontFamily: 'monospace', fontSize: 7, color: C.ok }}>OK</span>
                </div>
            </button>
        </div>
    );
}

// ─── Main export ─────────────────────────────────────────────────────────────

export default function DroneConditionPanel({ data }) {
    const [selected, setSelected] = useState(null);
    const [hovered,  setHovered]  = useState(null);

    const isActive = data !== null && data?.status !== 'OFFLINE';
    const speed     = data?.speed      ?? 0;
    const precision = data?.precision  ?? 1.0;
    const stability = data?.stability  ?? 1.0;

    const telemetry = useMemo(() => {
        const baseRPM  = isActive ? Math.round(3400 + speed * 390) : 0;
        const baseTemp = isActive ? Math.round(28 + speed * 3.2)   : 24;
        const baseCurr = isActive ? 2.6 + speed * 0.55             : 0;
        const health   = precision * 100;
        const jitter   = [1.00, 0.98, 1.02, 0.99];
        const escBase  = 15.8 * stability;

        const motors = MOTOR_META.map((m, i) => ({
            rpm:     Math.round(baseRPM  * jitter[i]),
            temp:    Math.round(baseTemp + i * 0.5),
            current: +(baseCurr * jitter[i]).toFixed(1),
            health:  Math.min(100, health - i * 0.3),
            escV:    +(escBase).toFixed(2),
            pwm:     isActive ? Math.round(1480 + speed * 195 * jitter[i]) : 1000,
            escTemp: Math.round(baseTemp * 0.9 + i * 0.4),
        }));

        const cellV = (escBase / 4);
        const batt = {
            voltage: +(escBase).toFixed(2),
            pct:     Math.round(stability * 100),
            current: +(motors.reduce((s, m) => s + m.current, 0)).toFixed(1),
            temp:    isActive ? Math.round(28 + speed * 1.8) : 24,
            cells:   [cellV, cellV - 0.01, cellV + 0.01, cellV - 0.005],
        };

        const fc = {
            loopHz:   400,
            cpuPct:   isActive ? Math.round(17 + speed * 4) : 3,
            gyroBias: isActive ? (Math.abs(1 - precision) * 0.12).toFixed(4) : '0.0000',
            armed:    isActive,
        };

        const frame = {
            vibX:      isActive ? (Math.abs(precision - 0.98) * 14).toFixed(2) : '0.00',
            vibY:      isActive ? (Math.abs(precision - 0.96) * 11).toFixed(2) : '0.00',
            vibZ:      isActive ? (Math.abs(stability - 0.98) * 7).toFixed(2)  : '0.00',
            integrity: Math.round(precision * 100),
        };

        return { motors, batt, fc, frame };
    }, [speed, precision, stability, isActive]);

    const renderDetail = () => {
        if (!selected)          return <PlaceholderDetail />;
        if (selected === 'battery') return <BatteryDetail batt={telemetry.batt} />;
        if (selected === 'fc')      return <FCDetail fc={telemetry.fc} />;
        if (selected === 'body')    return <FrameDetail frame={telemetry.frame} />;
        const idx = MOTOR_META.findIndex(m => m.id === selected);
        if (idx >= 0) return <MotorDetail motor={telemetry.motors[idx]} meta={MOTOR_META[idx]} />;
        return <PlaceholderDetail />;
    };

    return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column',
                      background: C.bg0, overflow: 'hidden' }}>

            {/* ── Header bar ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '7px 14px', background: C.bg1, borderBottom: `1px solid ${C.border}`,
                          flexShrink: 0 }}>
                <span style={{ fontFamily: 'monospace', fontSize: 9, color: C.text2, letterSpacing: '0.12em' }}>
                    DRONE_CONDITION — UNIT NRX-ALPHA-01
                </span>
                <div style={{ display: 'flex', gap: 16 }}>
                    <span style={{ fontFamily: 'monospace', fontSize: 9, color: isActive ? C.ok : C.text3 }}>
                        {isActive ? '● TELEMETRY LIVE' : '○ OFFLINE'}
                    </span>
                    <span style={{ fontFamily: 'monospace', fontSize: 9, color: C.text3 }}>
                        X-CONFIG · 5" · 220mm
                    </span>
                </div>
            </div>

            {/* ── Main split ── */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

                {/* 3D Viewer */}
                <div style={{ flex: '0 0 60%', position: 'relative', background: '#050505',
                              borderRight: `1px solid ${C.border}` }}>
                    <Canvas
                        camera={{ position: [2.2, 1.8, 2.2], fov: 42 }}
                        style={{ width: '100%', height: '100%' }}
                        gl={{ antialias: true }}
                    >
                        <ambientLight intensity={1.0} />
                        <directionalLight position={[4, 6, 4]} intensity={1.8} />
                        <directionalLight position={[-3, 2, -3]} intensity={0.8} color="#56ccf2" />
                        <directionalLight position={[0, -3, 3]} intensity={0.5} color="#bb86fc" />

                        <DroneModel
                            selected={selected}
                            hovered={hovered}
                            onSelect={setSelected}
                            onHover={setHovered}
                        />

                        <OrbitControls
                            enablePan={false}
                            minDistance={2}
                            maxDistance={8}
                            autoRotate={!selected && !hovered}
                            autoRotateSpeed={0.6}
                        />

                        {/* Ground reflection plane */}
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.6, 0]}>
                            <planeGeometry args={[8, 8]} />
                            <meshStandardMaterial color="#0a0a0a" roughness={1} />
                        </mesh>
                    </Canvas>

                    {/* Overlay hint */}
                    <div style={{ position: 'absolute', bottom: 10, left: 12,
                                  fontFamily: 'monospace', fontSize: 8, color: C.text3,
                                  letterSpacing: '0.1em', pointerEvents: 'none' }}>
                        DRAG TO ORBIT · SCROLL TO ZOOM · CLICK PART TO INSPECT
                    </div>

                    {/* Selected label */}
                    {selected && (
                        <div style={{ position: 'absolute', top: 10, left: 12,
                                      fontFamily: 'monospace', fontSize: 8,
                                      color: C.text1, letterSpacing: '0.12em',
                                      background: 'rgba(0,0,0,0.7)', padding: '3px 8px',
                                      border: `1px solid ${C.border}` }}>
                            {MOTOR_META.find(m => m.id === selected)?.label ?? selected.toUpperCase()} SELECTED
                        </div>
                    )}
                </div>

                {/* Detail panel */}
                <div style={{ flex: 1, background: C.bg1, overflow: 'hidden',
                              borderLeft: `1px solid ${C.border}` }}>
                    {renderDetail()}
                </div>
            </div>

            {/* ── Bottom motor strip ── */}
            <div style={{ flexShrink: 0, borderTop: `1px solid ${C.border}`,
                          background: C.bg1, padding: '6px 8px' }}>
                <MotorStrip
                    motors={telemetry.motors}
                    batt={telemetry.batt}
                    selected={selected}
                    onSelect={setSelected}
                />
            </div>
        </div>
    );
}
