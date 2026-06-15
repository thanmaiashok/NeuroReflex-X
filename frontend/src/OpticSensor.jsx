import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';

function Obstacles({ obstacles }) {
    if (!obstacles) return null;
    return (
        <group>
            {obstacles.map((obs, i) => (
                <mesh key={i} position={[obs[0], 1.5, obs[1]]}>
                    <cylinderGeometry args={[0.5, 0.5, 3, 16]} />
                    <meshStandardMaterial color="#333333" roughness={0.9} />
                </mesh>
            ))}
        </group>
    );
}

function Target({ position }) {
    if (!position) return null;
    // position = [x, z_world, terrain_height] from API
    const terrainY = position[2] ?? 0;
    return (
        <mesh position={[position[0], terrainY + 0.9, position[1]]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial color="#eb5757" emissive="#eb5757" emissiveIntensity={0.6} />
        </mesh>
    );
}

// Drone-mounted gimbal camera: follows real drone altitude, locks onto target
function TrackerCamera({ dronePos, targetPos }) {
    const { camera } = useThree();
    const smoothCamPos = useRef(new THREE.Vector3());
    const smoothLookAt = useRef(new THREE.Vector3());

    useFrame(() => {
        if (!dronePos || !targetPos) return;

        // dronePos = [X, Z_world, altitude]  (API: drone_real_pos[0,1,2])
        const camX   = dronePos[0];
        const camY   = dronePos[2] ?? 2.5;   // BUG FIX #1: use real altitude
        const camZ   = dronePos[1];

        // targetPos = [X, Z_world, terrain_height]
        const tgtX   = targetPos[0];
        const tgtY   = (targetPos[2] ?? 0) + 0.9;  // BUG FIX #2: terrain + center-of-mass
        const tgtZ   = targetPos[1];

        // Smooth camera movement so feed doesn't snap
        smoothCamPos.current.lerp(new THREE.Vector3(camX, camY, camZ), 0.12);
        smoothLookAt.current.lerp(new THREE.Vector3(tgtX, tgtY, tgtZ), 0.12);

        camera.position.copy(smoothCamPos.current);
        camera.lookAt(smoothLookAt.current);
    });

    return null;
}

export default function OpticSensor({ data, showDFAF = true, yoloDetections = [] }) {
    // BUG FIX #3: safe extraction — drone_real_pos is [X,Z,alt], predicted_pos is [X,Z]
    const dronePos = data?.drone_real_pos
        ?? (data?.predicted_pos ? [data.predicted_pos[0], data.predicted_pos[1], 2.5] : [0, 0, 2.5]);

    const targetPos   = data?.destination ?? null;
    const obstacles   = data?.obstacles   ?? [];
    const isEngaging  = data?.status === 'ENGAGING';
    const isDestroyed = data?.status === 'DESTROYED';
    const isCollapsed = data?.collapse_status ?? false;
    const confidence  = data?.stability ?? 1.0;
    const hasTarget   = !!targetPos && !isDestroyed;

    // BUG FIX #4: stable jitter — update only when data changes, not every render
    const jitterRef = useRef({ x: 0, y: 0 });
    const prevTickRef = useRef(0);
    const currentTick = data?.history_true?.length ?? 0;
    if (currentTick !== prevTickRef.current) {
        jitterRef.current = {
            x: (Math.random() - 0.5) * 3,
            y: (Math.random() - 0.5) * 3,
        };
        prevTickRef.current = currentTick;
    }
    const { x: jitterX, y: jitterY } = jitterRef.current;

    // Crosshair color: cyan when tracking, red when collapsed
    const crossColor = isCollapsed ? '#eb5757' : '#56ccf2';

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', background: '#000' }}>

            {/* 3D scene */}
            <Canvas camera={{ position: [0, 5, 0], fov: 72 }}>
                <ambientLight intensity={0.35} />
                <pointLight position={[10, 10, 10]} intensity={0.8} />
                <Environment preset="night" />
                <gridHelper args={[200, 80, '#1a1a1a', '#111111']} />
                <Obstacles obstacles={obstacles} />
                <Target position={targetPos} />
                <TrackerCamera dronePos={dronePos} targetPos={targetPos ?? [0, 0, 0]} />
            </Canvas>

            {/* Dark + scanline overlay */}
            <div style={{
                position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
                background: 'rgba(0,0,0,0.22)',
            }} />
            <div style={{
                position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
            }} />

            {/* ── LEFT MODE: YOLO detection only ── */}
            {!showDFAF && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 10,
                    pointerEvents: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    {(() => {
                        const hasReal = yoloDetections.length > 0;
                        const showBox = hasReal || hasTarget;
                        if (!showBox) return (
                            <div style={{
                                color: '#333', fontSize: 9, fontFamily: 'monospace',
                                border: '1px dashed #222', padding: '4px 10px',
                            }}>NO_DETECT</div>
                        );
                        const best    = hasReal ? yoloDetections.reduce((a, b) => a.confidence > b.confidence ? a : b) : null;
                        const conf    = hasReal ? best.confidence : (confidence);
                        const cls     = hasReal ? best.class.toUpperCase() : 'TGT';
                        const col     = hasReal ? '#6fcf97' : (isCollapsed ? '#eb5757' : '#f2c94c');
                        const prefix  = hasReal ? 'YOLO' : 'SIM';
                        return (
                            <div style={{
                                width: 72, height: 72,
                                border: `1.5px solid ${col}`,
                                transform: `translate(${jitterX * 0.4}px, ${jitterY * 0.4}px)`,
                                position: 'relative', flexShrink: 0,
                            }}>
                                {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx, sy], i) => (
                                    <div key={i} style={{
                                        position: 'absolute', width: 9, height: 9,
                                        top: sy < 0 ? -1 : 'auto', bottom: sy > 0 ? -1 : 'auto',
                                        left: sx < 0 ? -1 : 'auto', right: sx > 0 ? -1 : 'auto',
                                        borderTop:    sy < 0 ? `2px solid ${col}` : 'none',
                                        borderBottom: sy > 0 ? `2px solid ${col}` : 'none',
                                        borderLeft:   sx < 0 ? `2px solid ${col}` : 'none',
                                        borderRight:  sx > 0 ? `2px solid ${col}` : 'none',
                                    }} />
                                ))}
                                <div style={{
                                    position: 'absolute', top: -16, left: -2,
                                    background: col, color: '#000',
                                    fontSize: '8px', fontWeight: '700',
                                    padding: '1px 5px', whiteSpace: 'nowrap',
                                    fontFamily: 'monospace',
                                }}>
                                    {prefix}:{cls} | {conf.toFixed(2)}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* ── RIGHT MODE: YOLO + DFAF dual-fovea ── */}
            {showDFAF && hasTarget && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 10,
                    pointerEvents: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    {/* YOLO green box — outer layer */}
                    {yoloDetections.length > 0 && (() => {
                        const best = yoloDetections.reduce((a, b) => a.confidence > b.confidence ? a : b);
                        return (
                            <div style={{
                                position: 'absolute',
                                width: 80, height: 80,
                                border: '1px solid #6fcf97',
                                transform: `translate(${jitterX * 0.4}px, ${jitterY * 0.4}px)`,
                            }}>
                                <div style={{
                                    position: 'absolute', top: -14, left: -2,
                                    color: '#6fcf97', fontSize: '7px', fontWeight: '700',
                                    fontFamily: 'monospace', whiteSpace: 'nowrap',
                                }}>
                                    YOLO:{best.class.toUpperCase()} {best.confidence.toFixed(2)}
                                </div>
                            </div>
                        );
                    })()}

                    {/* HARE_TGT tracking box — yellow, inner */}
                    <div style={{
                        width: 56, height: 56,
                        border: `1.5px solid ${isCollapsed ? '#eb5757' : '#f2c94c'}`,
                        transform: `translate(${jitterX}px, ${jitterY}px)`,
                        position: 'relative', flexShrink: 0,
                    }}>
                        {[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx, sy], i) => (
                            <div key={i} style={{
                                position: 'absolute', width: 8, height: 8,
                                top: sy < 0 ? -1 : 'auto', bottom: sy > 0 ? -1 : 'auto',
                                left: sx < 0 ? -1 : 'auto', right: sx > 0 ? -1 : 'auto',
                                borderTop:    sy < 0 ? `2px solid ${isCollapsed ? '#eb5757' : '#f2c94c'}` : 'none',
                                borderBottom: sy > 0 ? `2px solid ${isCollapsed ? '#eb5757' : '#f2c94c'}` : 'none',
                                borderLeft:   sx < 0 ? `2px solid ${isCollapsed ? '#eb5757' : '#f2c94c'}` : 'none',
                                borderRight:  sx > 0 ? `2px solid ${isCollapsed ? '#eb5757' : '#f2c94c'}` : 'none',
                            }} />
                        ))}
                        <div style={{
                            position: 'absolute', top: -16, left: -2,
                            background: isCollapsed ? '#eb5757' : '#f2c94c',
                            color: '#000', fontSize: '8px', fontWeight: '700',
                            padding: '1px 5px', whiteSpace: 'nowrap',
                            fontFamily: 'monospace', letterSpacing: '0.04em',
                        }}>
                            {isCollapsed ? 'LOST' : 'HARE_TGT'} | {confidence.toFixed(2)}
                        </div>
                    </div>

                    {/* DFAF: crosshair + primary ring + secondary ring */}
                    {data?.primary_fovea && (
                        <>
                            <div style={{
                                position: 'absolute', top: '50%', left: '50%',
                                transform: 'translate(-50%,-50%)',
                                width: 20, height: 20,
                            }}>
                                <div style={{ position: 'absolute', top: 9, left: 0, width: 20, height: 1, background: crossColor }} />
                                <div style={{ position: 'absolute', top: 0, left: 9, width: 1, height: 20, background: crossColor }} />
                            </div>

                            {/* Primary fovea ring — cyan/red */}
                            <div style={{
                                position: 'absolute', top: '50%', left: '50%',
                                transform: 'translate(-50%,-50%)',
                                width: 26, height: 26,
                                border: `1px solid ${crossColor}`,
                                borderRadius: '50%', opacity: 0.85,
                            }}>
                                <span style={{
                                    position: 'absolute', top: -11, left: 28,
                                    color: crossColor, fontSize: 7,
                                    fontFamily: 'monospace', whiteSpace: 'nowrap',
                                }}>PRIMARY</span>
                            </div>

                            {/* Secondary fovea ring — purple dashed, offset by velocity */}
                            {(() => {
                                const scale = 18;
                                const dx = (data.secondary_fovea[0] - data.primary_fovea[0]) * scale;
                                const dy = (data.secondary_fovea[1] - data.primary_fovea[1]) * scale;
                                return (
                                    <div style={{
                                        position: 'absolute',
                                        top:  `calc(50% + ${dy}px)`,
                                        left: `calc(50% + ${dx}px)`,
                                        transform: 'translate(-50%,-50%)',
                                        width: 18, height: 18,
                                        border: '1px dashed rgba(187,134,252,0.7)',
                                        borderRadius: '50%',
                                    }}>
                                        <span style={{
                                            position: 'absolute', top: -11, left: 20,
                                            color: 'rgba(187,134,252,0.85)', fontSize: 7,
                                            fontFamily: 'monospace', whiteSpace: 'nowrap',
                                        }}>SECONDARY</span>
                                    </div>
                                );
                            })()}
                        </>
                    )}
                </div>
            )}

            {/* REC badge */}
            <div style={{
                position: 'absolute', top: 7, left: 8, zIndex: 20,
                color: '#888', fontSize: 9, fontFamily: 'monospace',
                display: 'flex', alignItems: 'center', gap: 4,
            }}>
                REC <span style={{ color: '#eb5757', animation: 'pulse-dot 1.8s ease-in-out infinite', fontSize: 7 }}>●</span>
            </div>

            {/* Confidence bar (bottom) */}
            {data && (
                <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    height: 2, zIndex: 20, background: '#111',
                }}>
                    <div style={{
                        height: '100%',
                        width: `${confidence * 100}%`,
                        background: confidence > 0.6 ? '#6fcf97' : confidence > 0.3 ? '#f2c94c' : '#eb5757',
                        transition: 'width 200ms ease, background 300ms ease',
                    }} />
                </div>
            )}

            {/* Terminal guidance */}
            {isEngaging && (
                <div style={{
                    position: 'absolute', top: '18%', width: '100%',
                    textAlign: 'center', zIndex: 20,
                    color: '#f2c94c', fontSize: 10,
                    fontFamily: 'monospace', letterSpacing: '0.1em',
                }}>
                    TERMINAL_GUIDANCE
                </div>
            )}
        </div>
    );
}
