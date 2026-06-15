import React from 'react';

export default function MetricsPanel({ metrics, latencyMs }) {
    return (
        <div>
            <h2 style={{ marginBottom: '20px', color: '#FFF' }}>Metrics</h2>

            <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Precision</h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '5px 0' }}>
                    {(metrics.precision * 100).toFixed(1)}%
                </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Stability</h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '5px 0' }}>
                    {metrics.stability.toFixed(2)}
                </p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase' }}>Latency</h3>
                <p style={{ fontSize: '32px', fontWeight: 'bold', margin: '5px 0' }}>
                    {latencyMs != null ? `${latencyMs.toFixed(1)} ms` : (metrics?.latencyMs != null ? `${metrics.latencyMs.toFixed(1)} ms` : '-- ms')}
                </p>
            </div>
        </div>
    );
}
