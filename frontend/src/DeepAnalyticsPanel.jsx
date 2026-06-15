import React from 'react';
import {
    LineChart, Line, AreaChart, Area,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

/* ─── Design tokens (match index.css) ─── */
const C = {
    bg0:     '#080808',
    bg1:     '#0d0d0d',
    bg2:     '#111111',
    border:  '#1a1a1a',
    border2: '#222222',
    text0:   '#f2f2f2',
    text1:   '#888888',
    text2:   '#444444',
    text3:   '#2a2a2a',
    reflex:  '#eb5757',
    ibip:    '#56ccf2',
    acce:    '#bb86fc',
    sdpl:    '#f2c94c',
    ok:      '#6fcf97',
    warn:    '#f2c94c',
    danger:  '#eb5757',
};

const TOOLTIP = {
    contentStyle: {
        background: '#0d0d0d',
        border: `1px solid ${C.border2}`,
        borderRadius: 0,
        fontSize: 9,
        color: C.text1,
        fontFamily: 'monospace',
        padding: '4px 8px',
    },
    cursor: { stroke: C.border2, strokeWidth: 1 },
};

/* ─── Subcomponents ─── */
function PanelCard({ accentColor = C.text2, label, badge, badgeColor, children }) {
    return (
        <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            background: C.bg1, border: `1px solid ${C.border}`,
            overflow: 'hidden',
        }}>
            {/* Top accent bar */}
            <div style={{ height: 2, background: accentColor, opacity: 0.6, flexShrink: 0 }} />

            {/* Header row */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 10px 5px',
                borderBottom: `1px solid ${C.border}`,
                flexShrink: 0,
            }}>
                <span style={{
                    fontFamily: 'monospace', fontSize: 9, fontWeight: 700,
                    color: accentColor, letterSpacing: '0.1em',
                }}>
                    {label}
                </span>
                <span style={{
                    fontFamily: 'monospace', fontSize: 9,
                    color: badgeColor ?? C.text2,
                    letterSpacing: '0.06em',
                }}>
                    {badge}
                </span>
            </div>

            {/* Chart area */}
            <div style={{ flex: 1, minHeight: 0, padding: '6px 4px 4px 0' }}>
                {children}
            </div>
        </div>
    );
}

function KernelRow({ label, value, valueColor }) {
    return (
        <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            padding: '2px 0',
        }}>
            <span style={{ color: C.text2, fontSize: 9, fontFamily: 'monospace' }}>{label}</span>
            <span style={{ color: valueColor ?? C.text1, fontSize: 9, fontFamily: 'monospace', fontWeight: 600 }}>
                {value}
            </span>
        </div>
    );
}

function SectionTitle({ children }) {
    return (
        <div style={{
            fontSize: 8, color: C.text3, fontFamily: 'monospace',
            letterSpacing: '0.12em', fontWeight: 600,
            borderBottom: `1px solid ${C.border}`,
            paddingBottom: 4, marginBottom: 4, marginTop: 8,
        }}>
            {children}
        </div>
    );
}

/* ─── Main component ─── */
export default function DeepAnalyticsPanel({ data, physDt = 0, dataLoss = 0 }) {
    const history = data?.history_true ?? [];
    const last    = history.length > 0 ? history[history.length - 1] : null;

    const reflexVal  = last?.reflex.toFixed(4)     ?? '0.0000';
    const brainVal   = last?.brain.toFixed(4)      ?? '0.0000';
    const trustVal   = last?.confidence.toFixed(4) ?? '1.0000';
    const isCol      = last?.is_collapsed ?? false;
    const hasAnomaly = last?.sdpl > 0;

    const sdplEvents = history.filter(h => h.sdpl > 0).length;
    const status     = data?.status ?? 'OFFLINE';

    const statusColor = {
        TRACKING:  C.ok,
        ENGAGING:  C.warn,
        STRIKING:  '#f2994a',
        COLLAPSED: C.ibip,
        DESTROYED: C.danger,
    }[status] ?? C.text2;

    return (
        <div style={{
            height: '100%', display: 'flex', gap: 6,
            padding: '6px 8px', boxSizing: 'border-box',
            background: C.bg0,
        }}>

            {/* ─── DFAF — Reflex Energy ─── */}
            <PanelCard
                label="DFAF — REFLEX ENERGY"
                accentColor={C.reflex}
                badge={`${reflexVal}  ${data?.sonar_active ? 'ACTIVE' : 'SCAN'}`}
                badgeColor={data?.sonar_active ? C.reflex : C.text2}
            >
                <ResponsiveContainer width="100%" height="100%" minHeight={40}>
                    <LineChart data={history} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip {...TOOLTIP} formatter={v => [v.toFixed(6), 'REFLEX']} />
                        <Line
                            type="step" dataKey="reflex"
                            stroke={C.reflex} strokeWidth={1.2}
                            dot={false} isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </PanelCard>

            {/* ─── IBIP — Intent Velocity ─── */}
            <PanelCard
                label="IBIP — INTENT VELOCITY"
                accentColor={C.ibip}
                badge={`${brainVal}  m/s`}
                badgeColor={C.ibip}
            >
                <ResponsiveContainer width="100%" height="100%" minHeight={40}>
                    <LineChart data={history} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={['auto', 'auto']} />
                        <Tooltip {...TOOLTIP} formatter={v => [v.toFixed(6), 'IBIP_VEL']} />
                        <Line
                            type="monotone" dataKey="brain"
                            stroke={C.ibip} strokeWidth={1.2}
                            dot={false} isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </PanelCard>

            {/* ─── ACCE — Trust Score ─── */}
            <PanelCard
                label="ACCE — TRUST SCORE"
                accentColor={C.acce}
                badge={isCol ? 'COLLAPSED' : `${trustVal}`}
                badgeColor={isCol ? C.danger : C.acce}
            >
                <ResponsiveContainer width="100%" height="100%" minHeight={40}>
                    <AreaChart data={history} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={[0, 1]} />
                        <Tooltip {...TOOLTIP} formatter={v => [v.toFixed(6), 'TRUST']} />
                        <Area
                            type="monotone" dataKey="confidence"
                            stroke={C.acce} fill={`${C.acce}18`}
                            strokeWidth={1.2} dot={false} isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </PanelCard>

            {/* ─── SDPL — Depth Lock ─── */}
            <PanelCard
                label="SDPL — DEPTH LOCK"
                accentColor={C.sdpl}
                badge={hasAnomaly ? 'Z-JUMP DETECTED' : 'NOMINAL'}
                badgeColor={hasAnomaly ? C.sdpl : C.text2}
            >
                <ResponsiveContainer width="100%" height="100%" minHeight={40}>
                    <LineChart data={history} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="2 4" stroke={C.border} vertical={false} />
                        <XAxis dataKey="time" hide />
                        <YAxis hide domain={[0, 1]} />
                        <Tooltip {...TOOLTIP} formatter={v => [v > 0 ? 'ANOMALY' : 'OK', 'SDPL']} />
                        <Line
                            type="step" dataKey="sdpl"
                            stroke={C.sdpl} strokeWidth={1.5}
                            dot={false} isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </PanelCard>

            {/* ─── Kernel Analytics sidebar ─── */}
            <div style={{
                width: 210, flexShrink: 0,
                background: C.bg1,
                border: `1px solid ${C.border}`,
                padding: '8px 12px',
                display: 'flex', flexDirection: 'column',
                overflow: 'hidden',
            }}>
                <div style={{
                    fontSize: 9, fontFamily: 'monospace', fontWeight: 700,
                    color: C.text2, letterSpacing: '0.12em',
                    borderBottom: `1px solid ${C.border}`,
                    paddingBottom: 5, marginBottom: 6,
                }}>
                    KERNEL ANALYTICS
                </div>

                <KernelRow label="STATE_TICK" value={history.length.toString().padStart(4, '0')} />
                <KernelRow label="PHYS_DT"   value={`+${physDt.toFixed(3)}s`} />
                <KernelRow
                    label="DATA_LOSS"
                    value={`${dataLoss.toFixed(3)}%`}
                    valueColor={dataLoss > 0 ? C.danger : C.ok}
                />

                <SectionTitle>LIVE STATE</SectionTitle>
                <KernelRow label="MODE"    value={status} valueColor={statusColor} />
                <KernelRow label="T_X"     value={data?.true_pos?.[0].toFixed(3) ?? '—'} />
                <KernelRow label="T_Y"     value={data?.true_pos?.[1].toFixed(3) ?? '—'} />
                <KernelRow label="P_X"     value={data?.predicted_pos?.[0].toFixed(3) ?? '—'} valueColor={C.text2} />
                <KernelRow label="P_Y"     value={data?.predicted_pos?.[1].toFixed(3) ?? '—'} valueColor={C.text2} />

                <SectionTitle>ACCE / SDPL</SectionTitle>
                <KernelRow
                    label="TRUST"
                    value={(last?.confidence ?? 1).toFixed(4)}
                    valueColor={(last?.confidence ?? 1) < 0.5 ? C.danger : C.acce}
                />
                <KernelRow label="SDPL_EVENTS" value={sdplEvents}       valueColor={sdplEvents > 0 ? C.sdpl : C.text2} />
                <KernelRow
                    label="COLLAPSE"
                    value={isCol ? 'YES' : 'NO'}
                    valueColor={isCol ? C.danger : C.ok}
                />
                <KernelRow
                    label="PRECISION"
                    value={data ? `${(data.precision * 100).toFixed(1)}%` : '—'}
                    valueColor={C.text1}
                />
            </div>

        </div>
    );
}
