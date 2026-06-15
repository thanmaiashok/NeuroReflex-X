import React from 'react';

export default function HUD({ data }) {
    if (!data) return null;

    const { precision, stability, predicted_pos, sonar_active, status, collapse_status, context_radius } = data;

    // Numerical readouts based on backend state
    const history = data.history_true || [];
    const velocity = history.length > 0 ? history[history.length - 1].brain * 5 : 0;
    const altitude = data?.drone_real_pos?.[2] ?? 2.0;

    return (
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 100 }}>


            {/* TACTICAL METRICS (Top Center) */}
            <div style={{ position: 'absolute', top: '30px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '40px', color: '#fff', fontSize: '10px', fontFamily: 'monospace' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#888' }}>VELOCITY</div>
                    <div style={{ fontSize: '12px' }}>{velocity.toFixed(4)} M/S</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#888' }}>ALTITUDE</div>
                    <div style={{ fontSize: '12px' }}>{altitude.toFixed(2)} M</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#888' }}>DFAF_RADIUS</div>
                    <div style={{ fontSize: '12px' }}>{(context_radius || 1.0).toFixed(3)} M</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#888' }}>COORD_X</div>
                    <div style={{ fontSize: '12px' }}>{predicted_pos?.[0]?.toFixed(5) ?? '—'}</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#888' }}>COORD_Y</div>
                    <div style={{ fontSize: '12px' }}>{predicted_pos?.[1]?.toFixed(5) ?? '—'}</div>
                </div>
            </div>

            {/* SONAR WARNING */}
            {sonar_active && (
                <div style={{
                    position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
                    color: '#FF5252', fontWeight: 'bold', fontSize: '14px', fontFamily: 'monospace',
                    border: '1px solid #FF5252', padding: '5px 20px', backgroundColor: 'rgba(255, 0, 0, 0.05)'
                }}>
                    COLLISION ALERT: REFLEX_ACTIVE
                </div>
            )}

            {/* MISSION STATUS (Bottom Right) */}
            <div style={{ position: 'absolute', bottom: '40px', right: '40px', color: '#888', fontSize: '11px', fontFamily: 'monospace', textAlign: 'right' }}>
                <div>MISSION_STATE: <span style={{ color: status === 'DESTROYED' ? '#FF5252' : '#4CAF50' }}>{status}</span></div>
                {collapse_status && <div style={{ color: '#FF5252', fontWeight: 'bold', marginTop: '5px', animation: 'blink 1s infinite' }}>! SYSTEM COLLAPSE !</div>}
            </div>

        </div>
    );
}
