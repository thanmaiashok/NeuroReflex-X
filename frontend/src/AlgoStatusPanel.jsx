import React from 'react';

export default function AlgoStatusPanel({ data }) {
    if (!data) return null;
    const { sonar_active, history_true } = data;
    const lastPoint = history_true && history_true.length > 0 ? history_true[history_true.length - 1] : null;
    const levyActive = lastPoint && lastPoint.brain > 0.8;
    const stability = data.stability || 0;

    return (
        <div style={{
            position: 'absolute', top: '240px', right: '16px',
            display: 'flex', flexDirection: 'column', gap: '10px',
            zIndex: 60
        }}>

            {/* BAT (REFLEX) */}
            <div style={{
                padding: '8px 12px',
                backgroundColor: 'rgba(20,20,20,0.9)',
                border: `1px solid ${sonar_active ? '#FF5252' : '#444'}`,
                color: sonar_active ? '#FF5252' : '#888',
                fontSize: '11px', fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'space-between',
                width: '160px'
            }}>
                <span>BAT REFLEX</span>
                <span>{sonar_active ? "ACTIVE" : "IDLE"}</span>
            </div>

            {/* HARE (CORTEX) */}
            <div style={{
                padding: '8px 12px',
                backgroundColor: 'rgba(20,20,20,0.9)',
                border: `1px solid ${levyActive ? '#2196F3' : '#444'}`,
                color: levyActive ? '#2196F3' : '#888',
                fontSize: '11px', fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'space-between',
                width: '160px'
            }}>
                <span>HARE CORTEX</span>
                <span>{levyActive ? "SPRINT" : "FORAGE"}</span>
            </div>

            {/* FUSION STATUS */}
            <div style={{
                padding: '8px 12px',
                backgroundColor: 'rgba(20,20,20,0.9)',
                color: '#AB47BC', fontSize: '10px',
                border: '1px solid #AB47BC',
                textAlign: 'center',
                width: '160px'
            }}>
                FUSION STABILITY: {(stability * 100).toFixed(2)}%
            </div>

        </div>
    );
}
