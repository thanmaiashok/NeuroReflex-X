import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations, ContactShadows } from '@react-three/drei';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import * as THREE from 'three';

// ⛰️ Terrain Height Function (Must match Backend exactly)
function getTerrainHeight(x, y) {
    const sc = 0.15; // scale
    let h = Math.sin(x * sc) * 2.5 + Math.cos(y * sc * 1.2) * 1.5;
    h += Math.sin((x + y) * sc * 2.0) * 0.5;
    return h;
}

function TerrainGrid() {
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <planeGeometry args={[600, 600, 300, 300]} onUpdate={(self) => {
                const pos = self.attributes.position;
                for (let i = 0; i < pos.count; i++) {
                    const x = pos.getX(i);
                    const y = pos.getY(i);
                    pos.setZ(i, getTerrainHeight(x, y) + 0.01);
                }
                pos.needsUpdate = true;
            }} />
            <meshBasicMaterial color="#333" wireframe transparent opacity={0.3} />
        </mesh>
    );
}

// SmoothedDrone: real quad mesh, smooth lerp, animated props
function SmoothedDrone({ targetPosition }) {
    const groupRef = useRef();
    const smoothPos = useRef(new THREE.Vector3(targetPosition[0], targetPosition[2], targetPosition[1]));
    // 4 prop refs — separate names (React hooks rules)
    const sp0 = useRef(), sp1 = useRef(), sp2 = useRef(), sp3 = useRef();

    useFrame((_, dt) => {
        if (!groupRef.current) return;
        const target = new THREE.Vector3(targetPosition[0], targetPosition[2], targetPosition[1]);
        smoothPos.current.lerp(target, 0.08);
        groupRef.current.position.copy(smoothPos.current);

        const dx = target.x - smoothPos.current.x;
        const dz = target.z - smoothPos.current.z;
        groupRef.current.rotation.z = -dx * 0.18;
        groupRef.current.rotation.x = dz * 0.18;

        // Spin props: CW for M1/M2, CCW for M3/M4
        if (sp0.current) sp0.current.rotation.y +=  dt * 22;
        if (sp1.current) sp1.current.rotation.y +=  dt * 22;
        if (sp2.current) sp2.current.rotation.y += -dt * 22;
        if (sp3.current) sp3.current.rotation.y += -dt * 22;
    });

    // Motor positions (X-config 45°)
    const motors = [
        { pos: [ 0.38, 0, -0.38], ref: sp0, color: '#56ccf2' },
        { pos: [-0.38, 0,  0.38], ref: sp1, color: '#56ccf2' },
        { pos: [-0.38, 0, -0.38], ref: sp2, color: '#bb86fc' },
        { pos: [ 0.38, 0,  0.38], ref: sp3, color: '#bb86fc' },
    ];

    return (
        <group ref={groupRef}>
            {/* Top plate */}
            <mesh position={[0, 0.06, 0]}>
                <boxGeometry args={[0.32, 0.04, 0.32]} />
                <meshStandardMaterial color="#f0f0f0" roughness={0.25} metalness={0.4} />
            </mesh>
            {/* Bottom plate */}
            <mesh position={[0, -0.06, 0]}>
                <boxGeometry args={[0.28, 0.03, 0.28]} />
                <meshStandardMaterial color="#e0e0e0" roughness={0.25} metalness={0.4} />
            </mesh>
            {/* Arms */}
            <mesh rotation={[0,  Math.PI / 4, 0]}>
                <boxGeometry args={[0.78, 0.03, 0.04]} />
                <meshStandardMaterial color="#e8e8e8" roughness={0.3} metalness={0.4} />
            </mesh>
            <mesh rotation={[0, -Math.PI / 4, 0]}>
                <boxGeometry args={[0.78, 0.03, 0.04]} />
                <meshStandardMaterial color="#e8e8e8" roughness={0.3} metalness={0.4} />
            </mesh>
            {/* Motor housings + props */}
            {motors.map((m, i) => (
                <group key={i} position={m.pos}>
                    <mesh position={[0, 0.03, 0]}>
                        <cylinderGeometry args={[0.072, 0.065, 0.07, 8]} />
                        <meshStandardMaterial color="#f5f5f5" roughness={0.2} metalness={0.5} />
                    </mesh>
                    {/* Accent ring */}
                    <mesh>
                        <cylinderGeometry args={[0.078, 0.078, 0.014, 8]} />
                        <meshStandardMaterial color={m.color} metalness={0.7} roughness={0.2} />
                    </mesh>
                    {/* Spinning prop */}
                    <group ref={m.ref} position={[0, 0.078, 0]}>
                        <mesh>
                            <boxGeometry args={[0.3, 0.008, 0.036]} />
                            <meshStandardMaterial color="#dddddd" transparent opacity={0.9} />
                        </mesh>
                        <mesh rotation={[0, Math.PI / 2, 0]}>
                            <boxGeometry args={[0.3, 0.008, 0.036]} />
                            <meshStandardMaterial color="#dddddd" transparent opacity={0.9} />
                        </mesh>
                    </group>
                    {/* LED */}
                    <mesh position={[0, 0.072, 0]}>
                        <sphereGeometry args={[0.012, 5, 4]} />
                        <meshBasicMaterial color={m.color} />
                    </mesh>
                </group>
            ))}
            {/* Camera bump front */}
            <mesh position={[0, 0.01, -0.2]}>
                <boxGeometry args={[0.07, 0.055, 0.04]} />
                <meshStandardMaterial color="#0d0d0d" roughness={0.8} />
            </mesh>
        </group>
    );
}


// ─── Forest obstacle types ───────────────────────────────────────────────────

function PineTree() {
    return (
        <group>
            <mesh position={[0, 1.2, 0]} castShadow>
                <cylinderGeometry args={[0.18, 0.28, 2.4, 7]} />
                <meshStandardMaterial color="#2c1a0a" roughness={1.0} />
            </mesh>
            <mesh position={[0, 3.8, 0]} castShadow>
                <coneGeometry args={[2.0, 3.5, 7]} />
                <meshStandardMaterial color="#0d2a0d" roughness={1.0} />
            </mesh>
            <mesh position={[0, 5.8, 0]} castShadow>
                <coneGeometry args={[1.4, 2.8, 7]} />
                <meshStandardMaterial color="#0f3010" roughness={1.0} />
            </mesh>
            <mesh position={[0, 7.0, 0]} castShadow>
                <coneGeometry args={[0.8, 2.0, 7]} />
                <meshStandardMaterial color="#1a3d1a" roughness={1.0} />
            </mesh>
        </group>
    );
}

function DeadTree() {
    return (
        <group>
            <mesh position={[0, 2.5, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.28, 5.0, 6]} />
                <meshStandardMaterial color="#2a1e14" roughness={1.0} />
            </mesh>
            {/* Bare branches */}
            {[0.8, 1.6, 2.4, 3.2].map((y, i) => (
                <mesh key={i} position={[0, y, 0]} rotation={[0, i * 1.2, Math.PI / 4 + i * 0.1]} castShadow>
                    <cylinderGeometry args={[0.05, 0.09, 1.2 - i * 0.15, 5]} />
                    <meshStandardMaterial color="#1f1610" roughness={1.0} />
                </mesh>
            ))}
        </group>
    );
}

function RockCluster() {
    return (
        <group>
            <mesh position={[0, 0.55, 0]} castShadow receiveShadow>
                <sphereGeometry args={[0.9, 6, 5]} />
                <meshStandardMaterial color="#4a4640" roughness={1.0} metalness={0.05} />
            </mesh>
            <mesh position={[0.7, 0.35, 0.3]} castShadow receiveShadow>
                <sphereGeometry args={[0.6, 5, 4]} />
                <meshStandardMaterial color="#403c38" roughness={1.0} />
            </mesh>
            <mesh position={[-0.5, 0.25, 0.5]} castShadow receiveShadow>
                <sphereGeometry args={[0.45, 5, 4]} />
                <meshStandardMaterial color="#3a3632" roughness={1.0} />
            </mesh>
        </group>
    );
}

function FallenLog() {
    return (
        <group rotation={[0, Math.PI / 5, 0]}>
            <mesh position={[0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow>
                <cylinderGeometry args={[0.22, 0.28, 2.8, 8]} />
                <meshStandardMaterial color="#3a2510" roughness={1.0} />
            </mesh>
            {/* Moss patch on top */}
            <mesh position={[0, 0.38, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.23, 0.23, 1.2, 8]} />
                <meshStandardMaterial color="#1a3010" roughness={1.0} transparent opacity={0.7} />
            </mesh>
        </group>
    );
}

// ─── Battleground obstacle types ─────────────────────────────────────────────

function RuinedWall() {
    return (
        <group>
            {/* Main wall with gap/damage */}
            <mesh position={[-0.7, 1.0, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.0, 2.0, 0.45]} />
                <meshStandardMaterial color="#5a5040" roughness={0.95} />
            </mesh>
            <mesh position={[0.8, 0.65, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.8, 1.3, 0.45]} />
                <meshStandardMaterial color="#4e4538" roughness={0.95} />
            </mesh>
            {/* Rubble at base */}
            {[[-0.2, 0.15, 0.2], [0.3, 0.12, -0.1], [-0.5, 0.1, -0.2], [0.6, 0.18, 0.3]].map((pos, i) => (
                <mesh key={i} position={pos} rotation={[i * 0.4, i * 0.9, i * 0.3]} castShadow receiveShadow>
                    <boxGeometry args={[0.25 + i * 0.05, 0.15, 0.2 + i * 0.03]} />
                    <meshStandardMaterial color="#4a4235" roughness={1.0} />
                </mesh>
            ))}
        </group>
    );
}

function CraterRim() {
    return (
        <group>
            {/* Crater ring */}
            <mesh position={[0, 0.18, 0]} rotation={[-Math.PI / 2, 0, 0]} castShadow receiveShadow>
                <torusGeometry args={[1.8, 0.35, 6, 18]} />
                <meshStandardMaterial color="#2e2820" roughness={1.0} />
            </mesh>
            {/* Dark crater floor */}
            <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <circleGeometry args={[1.5, 16]} />
                <meshStandardMaterial color="#1a1510" roughness={1.0} />
            </mesh>
        </group>
    );
}

// ─── Urban obstacle types (kept from before) ─────────────────────────────────

// Sandbag wall: stacked row of bags
function SandbagWall() {
    const bagColor = "#b5a27f";
    const bags = [];
    for (let row = 0; row < 3; row++) {
        const count = row % 2 === 0 ? 4 : 3;
        const offsetX = row % 2 === 0 ? 0 : 0.3;
        for (let col = 0; col < count; col++) {
            bags.push(
                <mesh key={`${row}-${col}`} position={[col * 0.58 - (count - 1) * 0.29 + offsetX, row * 0.34, 0]} castShadow receiveShadow>
                    <sphereGeometry args={[0.28, 8, 6]} />
                    <meshStandardMaterial color={bagColor} roughness={1.0} />
                </mesh>
            );
        }
    }
    return <group>{bags}</group>;
}

// Concrete bunker: low slab with side walls
function ConcreteBunker() {
    return (
        <group>
            {/* Base slab */}
            <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
                <boxGeometry args={[3.0, 0.4, 2.0]} />
                <meshStandardMaterial color="#5a5a5a" roughness={0.9} metalness={0.1} />
            </mesh>
            {/* Left wall */}
            <mesh position={[-1.1, 0.85, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.4, 1.1, 2.0]} />
                <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
            </mesh>
            {/* Right wall */}
            <mesh position={[1.1, 0.85, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.4, 1.1, 2.0]} />
                <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
            </mesh>
            {/* Roof */}
            <mesh position={[0, 1.45, 0]} castShadow receiveShadow>
                <boxGeometry args={[3.2, 0.25, 2.2]} />
                <meshStandardMaterial color="#3a3a3a" roughness={0.95} />
            </mesh>
        </group>
    );
}

// Jersey barrier: T-profile concrete road barrier
function JerseyBarrier() {
    return (
        <group>
            {/* Wide base */}
            <mesh position={[0, 0.18, 0]} castShadow receiveShadow>
                <boxGeometry args={[2.4, 0.36, 0.9]} />
                <meshStandardMaterial color="#707070" roughness={0.85} />
            </mesh>
            {/* Tapered mid */}
            <mesh position={[0, 0.62, 0]} castShadow receiveShadow>
                <boxGeometry args={[2.2, 0.5, 0.55]} />
                <meshStandardMaterial color="#686868" roughness={0.85} />
            </mesh>
            {/* Narrow top */}
            <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
                <boxGeometry args={[2.2, 0.3, 0.38]} />
                <meshStandardMaterial color="#606060" roughness={0.85} />
            </mesh>
        </group>
    );
}

// Watchtower: tall legs + platform + railing
function Watchtower() {
    const legPositions = [[-0.6, 0, -0.6], [0.6, 0, -0.6], [-0.6, 0, 0.6], [0.6, 0, 0.6]];
    return (
        <group>
            {/* Legs */}
            {legPositions.map((pos, i) => (
                <mesh key={i} position={[pos[0], 1.5, pos[2]]} castShadow>
                    <boxGeometry args={[0.12, 3.0, 0.12]} />
                    <meshStandardMaterial color="#5c4a30" roughness={0.9} />
                </mesh>
            ))}
            {/* Cross braces */}
            <mesh position={[0, 1.0, -0.6]} rotation={[0, 0, Math.PI / 4]} castShadow>
                <boxGeometry args={[0.08, 1.7, 0.08]} />
                <meshStandardMaterial color="#5c4a30" roughness={0.9} />
            </mesh>
            <mesh position={[0, 1.0, 0.6]} rotation={[0, 0, Math.PI / 4]} castShadow>
                <boxGeometry args={[0.08, 1.7, 0.08]} />
                <meshStandardMaterial color="#5c4a30" roughness={0.9} />
            </mesh>
            {/* Platform floor */}
            <mesh position={[0, 3.1, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.6, 0.12, 1.6]} />
                <meshStandardMaterial color="#6b5535" roughness={0.85} />
            </mesh>
            {/* Railing posts */}
            {[[-0.7, 0, 0], [0.7, 0, 0], [0, 0, -0.7], [0, 0, 0.7]].map((pos, i) => (
                <mesh key={i} position={[pos[0], 3.55, pos[2]]} castShadow>
                    <boxGeometry args={[0.06, 0.9, 0.06]} />
                    <meshStandardMaterial color="#8b6914" roughness={0.8} />
                </mesh>
            ))}
            {/* Railing top bar */}
            <mesh position={[0, 3.95, 0]} castShadow>
                <boxGeometry args={[1.5, 0.06, 1.5]} />
                <meshStandardMaterial color="#8b6914" roughness={0.8} wireframe />
            </mesh>
        </group>
    );
}

// Map obstacle height → [Component, halfH, halfW]
function resolveObstacleType(h) {
    if (h >= 6.5) return [PineTree,        3.5, 1.5];
    if (h >= 4.6) return [DeadTree,        2.5, 0.5];
    if (h >= 4.0) return [Watchtower,      2.25, 0.8];
    if (h >= 2.0) return [RuinedWall,      1.0, 1.0];
    if (h >= 1.6) return [ConcreteBunker,  0.85, 1.6];
    if (h >= 1.3) return [RockCluster,     0.75, 1.0];
    if (h >= 1.1) return [SandbagWall,     0.6, 1.2];
    if (h >= 0.9) return [JerseyBarrier,   0.55, 1.3];
    if (h >= 0.6) return [CraterRim,       0.4, 2.0];
    return             [FallenLog,          0.25, 1.4];
}

function Obstacles({ obstacles }) {
    if (!obstacles) return null;
    return (
        <group>
            {obstacles.map((obs, i) => {
                const terrainY = getTerrainHeight(obs[0], obs[1]);
                const structH  = obs[2] ?? 1.8;
                const [ObstacleComponent, halfH, halfW] = resolveObstacleType(structH);
                const rotY = (i * 1.618) % (Math.PI * 2);
                return (
                    <RigidBody
                        key={i}
                        type="fixed"
                        colliders={false}
                        position={[obs[0], terrainY, obs[1]]}
                        rotation={[0, rotY, 0]}
                    >
                        <ObstacleComponent />
                        <CuboidCollider args={[halfW, halfH, halfW]} position={[0, halfH, 0]} />
                    </RigidBody>
                );
            })}
        </group>
    );
}

function HumanTarget({ position, status, dronePos }) {
    const group = useRef();
    const prevPos = useRef(new THREE.Vector3());
    const { scene, animations } = useGLTF('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/models/gltf/Soldier.glb');
    const { actions } = useAnimations(animations, group);

    const isDestroyed = status === 'DESTROYED';

    // Find Head/Neck Bones for strict forward focus
    const focusBones = useRef([]);
    useEffect(() => {
        const bones = [];
        scene.traverse((object) => {
            if (object.isBone && (
                object.name.includes('Head') || object.name.includes('head') ||
                object.name.includes('Neck') || object.name.includes('neck')
            )) {
                bones.push(object);
            }
        });
        focusBones.current = bones;
    }, [scene]);

    useEffect(() => {
        if (!actions) return;
        if (actions['Idle']) actions['Idle'].play();
    }, [actions]);

    useFrame((state, delta) => {
        if (!group.current || !position) return;

        // Sample terrain height at current XZ position so character runs ON the terrain
        const terrainY = getTerrainHeight(position[0], position[1]);
        const standOffset = 0.9; // half character height above ground
        const currentPos = new THREE.Vector3(position[0], terrainY + standOffset, position[1]);

        // Smooth XZ movement faster than Y so he "flows" over hills naturally
        group.current.position.x = THREE.MathUtils.lerp(group.current.position.x, currentPos.x, 0.15);
        group.current.position.y = THREE.MathUtils.lerp(group.current.position.y, currentPos.y, 0.08);
        group.current.position.z = THREE.MathUtils.lerp(group.current.position.z, currentPos.z, 0.15);

        // 1. Rotation Logic (Face runs in direction of movement, away from drone)
        const velocity = currentPos.clone().sub(prevPos.current);
        if (velocity.length() > 0.01 && !isDestroyed) {
            // +Math.PI flips the model so the face points the way it runs (away from threat)
            const targetAngle = Math.atan2(velocity.x, velocity.z) + Math.PI;
            group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetAngle, 0.15);

            // Terrain Slope Tilt (Lean into hills)
            const forward = new THREE.Vector3(Math.sin(targetAngle), 0, Math.cos(targetAngle)).normalize();
            const sampleDist = 0.5;
            const hFront = getTerrainHeight(currentPos.x + forward.x * sampleDist, currentPos.z + forward.z * sampleDist);
            const hBack = getTerrainHeight(currentPos.x - forward.x * sampleDist, currentPos.z - forward.z * sampleDist);
            const slopeAngle = Math.atan2(hFront - hBack, sampleDist * 2);

            // Apply slope to root x rotation
            group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, slopeAngle, 0.1);
        } else {
            group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, 0, 0.1);
        }

        // 2. Kinetic Leaning & Strict Forward Focus (Phase 10)
        if (!isDestroyed) {
            const speedMag = velocity.length();
            const forwardLean = Math.min(0.65, speedMag * 30.0);

            const turningForce = (Math.atan2(velocity.x, velocity.z) - group.current.rotation.y);
            const wrappedTurn = Math.atan2(Math.sin(turningForce), Math.cos(turningForce));
            const bankLean = THREE.MathUtils.clamp(wrappedTurn * 1.5, -0.6, 0.6);

            // Lock all focus bones (Head/Neck) to neutral forward relative to body
            focusBones.current.forEach(bone => {
                bone.rotation.x = THREE.MathUtils.lerp(bone.rotation.x, forwardLean, 0.1);
                bone.rotation.y = THREE.MathUtils.lerp(bone.rotation.y, 0, 0.2); // Stronger forward lock
                bone.rotation.z = THREE.MathUtils.lerp(bone.rotation.z, -bankLean, 0.1);
            });
        }

        // 3. Animation Locomotion Blending (ENFORCED WALK/RUN BLEND)
        const animSpeed = velocity.length() / delta;
        if (isDestroyed) {
            group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -Math.PI / 2, 0.05);
            Object.values(actions).forEach(a => a?.fadeOut(0.5));
        } else {
            group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, 0, 0.1);

            // NEVER IDLE
            actions['Idle']?.fadeOut(0.2);

            // Calculate Blend (Walk vs Run) — tuned for 4.0 m/s panic cap
            const runWeight = THREE.MathUtils.clamp((animSpeed - 0.5) / 1.5, 0, 1);
            const walkWeight = 1.0 - runWeight;

            if (actions['Walk']) {
                actions['Walk'].enabled = true;
                actions['Walk'].setEffectiveWeight(walkWeight);
                actions['Walk'].setEffectiveTimeScale(Math.max(0.9, animSpeed * 0.6));
                actions['Walk'].play();
            }

            if (actions['Run']) {
                actions['Run'].enabled = true;
                actions['Run'].setEffectiveWeight(runWeight);
                actions['Run'].setEffectiveTimeScale(Math.max(1.2, animSpeed * 0.55));
                actions['Run'].play();
            }
        }

        prevPos.current.copy(currentPos);
    });

    return (
        <group ref={group} scale={1.2}>
            <primitive object={scene} />
        </group>
    );
}

function TruckTarget({ position, status }) {
    const group = useRef();
    const { scene } = useGLTF('/truck.glb');
    const isDestroyed = status === 'DESTROYED';

    useFrame((state, delta) => {
        if (!group.current || !position) return;
        const terrainY = getTerrainHeight(position[0], position[1]);
        const currentPos = new THREE.Vector3(position[0], terrainY + 0.8, position[1]);

        group.current.position.copy(currentPos);
        
        if (isDestroyed) {
             group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -Math.PI / 2, 0.05);
        } else {
             group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, 0, 0.1);
        }
    });

    return (
        <group ref={group} scale={1.2}>
            <primitive object={scene} />
        </group>
    );
}

// ─── Instanced background forest trees ───────────────────────────────────────
const BG_TREE_COUNT = 100;
const BG_POSITIONS = Array.from({ length: BG_TREE_COUNT }, (_, i) => {
    const angle = (i / BG_TREE_COUNT) * Math.PI * 2 + i * 0.618;
    const r = 80 + Math.abs(Math.sin(i * 3.7)) * 220;
    const x = Math.cos(angle) * r;
    const z = Math.sin(angle) * r;
    const scale = 0.6 + (i % 7) * 0.12;
    return { x, z, scale };
});

function ForestBackground() {
    const trunkRef = useRef();
    const cone0Ref = useRef();
    const cone1Ref = useRef();
    const cone2Ref = useRef();

    useEffect(() => {
        const dummy = new THREE.Object3D();
        const layerOffsets = [3.8, 5.8, 7.0];
        const coneRefList  = [cone0Ref, cone1Ref, cone2Ref];

        BG_POSITIONS.forEach(({ x, z, scale }, i) => {
            const h = getTerrainHeight(x, z);
            const rotY = i * 2.399;

            dummy.position.set(x, h + 1.2 * scale, z);
            dummy.scale.set(scale, scale, scale);
            dummy.rotation.set(0, rotY, 0);
            dummy.updateMatrix();
            trunkRef.current.setMatrixAt(i, dummy.matrix);

            layerOffsets.forEach((yOff, li) => {
                dummy.position.set(x, h + yOff * scale, z);
                dummy.scale.setScalar(scale);
                dummy.rotation.set(0, rotY, 0);
                dummy.updateMatrix();
                coneRefList[li].current.setMatrixAt(i, dummy.matrix);
            });
        });

        trunkRef.current.instanceMatrix.needsUpdate = true;
        [cone0Ref, cone1Ref, cone2Ref].forEach(r => { r.current.instanceMatrix.needsUpdate = true; });
    }, []);

    return (
        <group>
            <instancedMesh ref={trunkRef} args={[null, null, BG_TREE_COUNT]} castShadow>
                <cylinderGeometry args={[0.18, 0.28, 2.4, 5]} />
                <meshStandardMaterial color="#2c1a0a" roughness={1.0} />
            </instancedMesh>
            <instancedMesh ref={cone0Ref} args={[null, null, BG_TREE_COUNT]} castShadow>
                <coneGeometry args={[2.0, 3.5, 6]} />
                <meshStandardMaterial color="#0d2a0d" roughness={1.0} />
            </instancedMesh>
            <instancedMesh ref={cone1Ref} args={[null, null, BG_TREE_COUNT]} castShadow>
                <coneGeometry args={[1.4, 2.8, 6]} />
                <meshStandardMaterial color="#0f3010" roughness={1.0} />
            </instancedMesh>
            <instancedMesh ref={cone2Ref} args={[null, null, BG_TREE_COUNT]} castShadow>
                <coneGeometry args={[0.8, 2.0, 6]} />
                <meshStandardMaterial color="#1a3d1a" roughness={1.0} />
            </instancedMesh>
        </group>
    );
}

// ─── Terrain with scenario-aware material ────────────────────────────────────
function BattlegroundTerrain({ scenario }) {
    const colors = {
        forest: '#1a1f14',
        urban:  '#2e2a22',
        mixed:  '#1c1e16',
    };
    const color = colors[scenario] ?? colors.forest;
    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]}>
            <planeGeometry args={[600, 600, 512, 512]} onUpdate={(self) => {
                const pos = self.attributes.position;
                for (let i = 0; i < pos.count; i++) {
                    pos.setZ(i, getTerrainHeight(pos.getX(i), pos.getY(i)));
                }
                pos.needsUpdate = true;
                self.computeVertexNormals();
            }} />
            <meshStandardMaterial color={color} roughness={1.0} metalness={0.0} />
        </mesh>
    );
}

function CameraController({ dronePos, autoFollow }) {
    const controlsRef = useRef();
    useFrame((state) => {
        if (autoFollow && dronePos && controlsRef.current) {
            // Smooth Camera Follow - Focused on Torso height (0.8m)
            const targetPos = new THREE.Vector3(dronePos[0], 0.8, dronePos[1]);
            const offset = new THREE.Vector3(0, 15, 15);

            state.camera.position.lerp(targetPos.clone().add(offset), 0.05);
            controlsRef.current.target.lerp(targetPos, 0.1);
            controlsRef.current.update();
        }
    });
    return <OrbitControls ref={controlsRef} />;
}

// ─── Rain particle system ─────────────────────────────────────────────────────
const RAIN_COUNT = 500;

function RainSystem({ windAngle = 0, windSpeed = 3, active }) {
    const meshRef  = useRef();
    const posRef   = useRef(null);

    useEffect(() => {
        posRef.current = Array.from({ length: RAIN_COUNT }, () => ({
            x: Math.random() * 320 - 160,
            y: Math.random() * 70,
            z: Math.random() * 320 - 160,
        }));
    }, []);

    useFrame((_, delta) => {
        if (!meshRef.current || !active || !posRef.current) return;
        const dummy  = new THREE.Object3D();
        const wx     = Math.cos(windAngle) * windSpeed * 0.15;
        const wz     = Math.sin(windAngle) * windSpeed * 0.15;
        const tiltX  = Math.atan2(wz, 12);
        const tiltZ  = Math.atan2(wx, 12);

        posRef.current.forEach((p, i) => {
            p.y -= 18 * delta;
            p.x += wx * delta;
            p.z += wz * delta;
            if (p.y < -3) {
                p.y = 65 + Math.random() * 10;
                p.x = Math.random() * 320 - 160;
                p.z = Math.random() * 320 - 160;
            }
            dummy.position.set(p.x, p.y, p.z);
            dummy.rotation.set(tiltX, 0, tiltZ);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    if (!active) return null;
    return (
        <instancedMesh ref={meshRef} args={[null, null, RAIN_COUNT]}>
            <planeGeometry args={[0.03, 0.55]} />
            <meshBasicMaterial color="#a8d4ff" transparent opacity={0.55} depthWrite={false} />
        </instancedMesh>
    );
}

// ─── Wind direction indicator particles (dust/leaves) ─────────────────────────
const DUST_COUNT = 80;

function WindParticles({ windAngle = 0, windSpeed = 3, enabled }) {
    const meshRef = useRef();
    const posRef  = useRef(null);

    useEffect(() => {
        posRef.current = Array.from({ length: DUST_COUNT }, () => ({
            x: Math.random() * 200 - 100,
            y: 1 + Math.random() * 6,
            z: Math.random() * 200 - 100,
            phase: Math.random() * Math.PI * 2,
        }));
    }, []);

    useFrame((state, delta) => {
        if (!meshRef.current || !enabled || !posRef.current) return;
        const dummy = new THREE.Object3D();
        const wx = Math.cos(windAngle) * windSpeed * 0.4;
        const wz = Math.sin(windAngle) * windSpeed * 0.4;
        const t  = state.clock.elapsedTime;

        posRef.current.forEach((p, i) => {
            p.x += wx * delta + Math.sin(t + p.phase) * 0.02;
            p.z += wz * delta + Math.cos(t + p.phase) * 0.02;
            p.y += Math.sin(t * 0.8 + p.phase) * 0.01;
            if (p.x > 110)  p.x = -100;
            if (p.x < -110) p.x =  100;
            if (p.z > 110)  p.z = -100;
            if (p.z < -110) p.z =  100;
            dummy.position.set(p.x, p.y + getTerrainHeight(p.x, p.z), p.z);
            dummy.rotation.set(0, windAngle + t * 0.5 + p.phase, 0);
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    if (!enabled) return null;
    return (
        <instancedMesh ref={meshRef} args={[null, null, DUST_COUNT]}>
            <boxGeometry args={[0.08, 0.02, 0.04]} />
            <meshBasicMaterial color="#c8a060" transparent opacity={0.4} />
        </instancedMesh>
    );
}

// Base atmosphere per scenario × weather overlay
const BASE_ATMO = {
    forest: { fog: '#1e2a1a', fogNear: 60,  fogFar: 350, ambient: 0.60, bg: '#1e2a1a' },
    urban:  { fog: '#2a2018', fogNear: 80,  fogFar: 400, ambient: 0.65, bg: '#2a2018' },
    mixed:  { fog: '#24271a', fogNear: 50,  fogFar: 320, ambient: 0.55, bg: '#24271a' },
};

function buildAtmo(scenario, sunny, rain) {
    const base = BASE_ATMO[scenario] ?? BASE_ATMO.forest;
    if (sunny) return { ...base, fog: '#7aace0', fogNear: 150, fogFar: 600, ambient: 0.70, bg: '#4a88c0' };
    if (rain)  return { ...base, fogNear: base.fogNear * 0.6, fogFar: base.fogFar * 0.6, ambient: Math.max(0.45, base.ambient * 0.75), bg: '#1a1e22' };
    return base;
}

// ── YOLO-in-the-Loop perception component (must live inside Canvas) ──────────
const API_PERCEPTION = 'http://localhost:8000/perception/detect';

function YOLOPerception({ onYoloDetect, enabled }) {
    const { gl, camera } = useThree();
    const lastCapture = useRef(0);

    useFrame(() => {
        if (!enabled || !onYoloDetect) return;
        const now = Date.now();
        if (now - lastCapture.current < 2000) return; // 0.5 fps — inside useFrame, buffer valid before compositor
        lastCapture.current = now;
        try {
            const canvas = gl.domElement;
            const dataURL = canvas.toDataURL('image/jpeg', 0.6);
            if (!dataURL || dataURL === 'data:,') return;
            const base64 = dataURL.split(',')[1];
            fetch(API_PERCEPTION, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_b64: base64,
                    img_w: canvas.width,
                    img_h: canvas.height,
                    cam_pos: camera.position.toArray(),
                    cam_quat: camera.quaternion.toArray(),
                    fov_y: camera.fov,
                }),
            }).then(r => r.ok ? r.json() : null)
              .then(result => { if (result && onYoloDetect) onYoloDetect(result.detections); })
              .catch(() => {});
        } catch {}
    });

    return null;
}

export default function Scene3D({ data, autoFollow, targetModel, scenario = 'forest', onYoloDetect }) {
    const dronePos    = data?.drone_real_pos || [0, 0, 2.5];
    const obstacles   = data ? data.obstacles : [];
    const destination = data ? data.destination : null;
    const status      = data ? data.status : 'SEARCHING';
    const windAngle   = data?.wind_angle   ?? 0;
    const windSpeed   = data?.wind_speed   ?? 3;
    const rainActive  = data?.rain_active  ?? false;
    const sunny       = data?.weather_sunny ?? false;
    const windEnabled = data?.wind_force_x !== undefined;  // proxy: wind data present
    const atmo        = buildAtmo(scenario, sunny, rainActive);

    return (
        <div style={{ width: '100%', height: '100%' }}>
            <Canvas camera={{ position: [0, 20, 20], fov: 50 }}>
                {/* Atmosphere */}
                <color attach="background" args={[atmo.bg]} />
                <fog attach="fog" args={[atmo.fog, atmo.fogNear, atmo.fogFar]} />
                <ambientLight intensity={atmo.ambient} />
                <directionalLight
                    position={sunny ? [100, 120, 60] : [40, 60, 20]}
                    intensity={sunny ? 2.2 : 0.9}
                    castShadow
                    shadow-mapSize={[1024, 1024]}
                    color={sunny ? '#fff8e0' : scenario === 'urban' ? '#c8a060' : '#c8d8a0'}
                />
                <hemisphereLight
                    color={sunny ? '#87ceeb' : scenario === 'forest' ? '#1a2a10' : '#201810'}
                    groundColor={sunny ? '#5a7a3a' : '#080808'}
                    intensity={sunny ? 0.7 : 0.4}
                />

                <ContactShadows
                    position={[0, 0, 0]}
                    opacity={0.5}
                    scale={100}
                    blur={2}
                    far={4}
                    resolution={256}
                    color="#000000"
                />

                <Physics gravity={[0, -9.81, 0]} colliders={false}>
                    <RigidBody type="fixed" colliders="trimesh">
                        <BattlegroundTerrain scenario={scenario} />
                    </RigidBody>

                    <Obstacles obstacles={obstacles} />
                    {targetModel === 'truck' ? (
                        <TruckTarget position={destination} status={status} />
                    ) : (
                        <HumanTarget position={destination} status={status} dronePos={[dronePos[0], dronePos[1]]} />
                    )}
                </Physics>

                {/* Background instanced trees (forest + mixed) */}
                {(scenario === 'forest' || scenario === 'mixed') && <ForestBackground />}

                {/* Weather effects */}
                <RainSystem windAngle={windAngle} windSpeed={windSpeed} active={rainActive} />
                <WindParticles windAngle={windAngle} windSpeed={windSpeed} enabled={!sunny && !rainActive} />

                <TerrainGrid />
                <SmoothedDrone targetPosition={dronePos} />
                <CameraController dronePos={[dronePos[0], dronePos[1]]} autoFollow={autoFollow} />
                <YOLOPerception onYoloDetect={onYoloDetect} enabled={!!onYoloDetect} />

                {data?.sonar_active && (
                    <mesh position={[dronePos[0], 2, dronePos[1]]} rotation={[-Math.PI / 2, 0, 0]}>
                        <ringGeometry args={[0.5, 3, 32]} />
                        <meshBasicMaterial color="#ff0000" transparent opacity={0.1} side={THREE.DoubleSide} />
                    </mesh>
                )}
            </Canvas>
        </div>
    );
}
