import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function TerminalFeed({ data }) {
    const [logs, setLogs] = useState([]);
    const logsEndRef = useRef(null);

    // Auto-generate logs based on data state
    useEffect(() => {
        if (!data) return;

        const timestamp = new Date().toISOString().substring(11, 23);
        const newLogs = [];

        if (data.status === 'DESTROYED') {
            newLogs.push(`[${timestamp}] [SYS] TARGET ELIMINATED! REACQUIRING NEW TARGET.`);
        } else if (data.status === 'ENGAGING') {
            newLogs.push(`[${timestamp}] [SYS] TACTICAL INTERCEPTION IN PROGRESS...`);
        } else if (data.collapse_status) {
            newLogs.push(`[${timestamp}] [ACCE] CONFIDENCE COLLAPSE! FALLING BACK TO REFLEX PURSUIT.`);
        } else if (data.sonar_active) {
            newLogs.push(`[${timestamp}] [DFAF] SONAR ECHO RECORDED. AVOIDING OBSTACLE.`);
        } else {
            // General tracking log - unfiltered raw data stream
            const currentBrain = data.history_true[data.history_true.length - 1]?.brain || 0.0;
            newLogs.push(`[${timestamp}] [IBIP] PREDICTIVE VELOCITY CALCULATED: ${currentBrain.toFixed(4)} m/s`);
        }

        if (newLogs.length > 0) {
            setLogs(prev => {
                const updated = [...prev, ...newLogs];
                return updated.slice(-60); // Keep last 60 lines
            });
        }
    }, [data]);

    // Scroll to bottom
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const history = data && data.history_true ? data.history_true : [];

    return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#050505', color: '#0f0', fontFamily: 'monospace', padding: '16px', gap: '16px', overflow: 'hidden', height: '100%', boxSizing: 'border-box' }}>
            
            <div style={{ padding: '8px 16px', backgroundColor: '#0a0a0a', border: '1px solid #1a1a1a', fontSize: '10px', color: '#B39DDB', letterSpacing: '0.1em', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                <span>HYBRID SWITCH ALGORITHM — TELEMETRY CORE</span>
                <span style={data?.collapse_status ? { color: '#FF5252' } : { color: '#4CAF50' }}>{data?.collapse_status ? 'SYSTEM: REFLEX OVERRIDE' : 'SYSTEM: INTENT PREDICTION'}</span>
            </div>

            <div style={{ display: 'flex', flex: 1, gap: '16px', overflow: 'hidden' }}>
                {/* Left Side: Real-time Graph */}
                <div style={{ flex: 2, display: 'flex', flexDirection: 'column', border: '1px solid #1a1a1a', backgroundColor: '#000', padding: '16px' }}>
                    <div style={{ fontSize: '10px', color: '#888', marginBottom: '16px', textTransform: 'uppercase' }}>
                        Comparative Response Curves: Reflex (Raw Sensor) vs Brain (Temporal Intent)
                    </div>
                    <div style={{ flex: 1 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#111" />
                                <XAxis dataKey="time" hide />
                                <YAxis domain={[0, 6]} stroke="#333" fontSize={10} width={40} />
                                <Tooltip contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #222', fontSize: '10px' }} />
                                <Legend wrapperStyle={{ fontSize: '10px' }} />
                                <Line type="monotone" dataKey="reflex" name="Reflex (Spike Energy)" stroke="#FF5252" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                                <Line type="monotone" dataKey="brain" name="Brain (IBIP Intent)" stroke="#2196F3" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Right Side: stdout Terminal feed */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', border: '1px solid #1a1a1a', backgroundColor: '#000' }}>
                    <div style={{ padding: '8px', borderBottom: '1px solid #1a1a1a', fontSize: '10px', color: '#444', display: 'flex', gap: '8px' }}>
                        <span style={{ color: '#FF5252' }}>●</span>
                        <span style={{ color: '#FFD700' }}>●</span>
                        <span style={{ color: '#4CAF50' }}>●</span>
                        <span style={{ marginLeft: '8px' }}>root@hybrid-switch:~# tail -f /var/log/neuro_core.log</span>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px', fontSize: '11px', lineHeight: '1.6em', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                        {logs.map((log, i) => (
                            <div key={i} style={{ 
                                color: log.includes('[ACCE]') || log.includes('ELIMINATED') ? '#FF5252' : 
                                       log.includes('[DFAF]') ? '#FFD700' : '#4CAF50',
                                marginBottom: '6px',
                                textShadow: '0 0 2px rgba(76,175,80,0.3)'
                            }}>
                                {log}
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            </div>
        </div>
    );
}
