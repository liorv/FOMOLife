'use client';

import { useEffect, useState, useCallback } from 'react';

interface DailyActivitySnapshot {
  date: string;
  totalUsers: number;
  newUsers: number;
  activeUsers: number;
  totalProjects: number;
  newProjects: number;
  totalTasks: number;
  newTasks: number;
  completedTasks: number;
  totalContacts: number;
  newContacts: number;
  totalFeedback: number;
  totalFeedbackComments: number;
  totalProjectThreadComments: number;
}

interface AdminMetricsData {
  snapshots: DailyActivitySnapshot[];
  lastUpdated: string;
}

// ── Histogram (area + bars) ──────────────────────────────────────────────────
interface HistogramProps {
  snapshots: DailyActivitySnapshot[];
  series: { key: keyof DailyActivitySnapshot; label: string; color: string }[];
  title: string;
  height?: number;
}

function Histogram({ snapshots, series, title, height = 180 }: HistogramProps) {
  const data = snapshots.slice(-60);
  const n = data.length;
  if (n === 0) return null;

  const W = 600;
  const H = height;
  const padL = 38;
  const padB = 28;
  const padT = 8;
  const padR = 8;
  const chartW = W - padL - padR;
  const chartH = H - padB - padT;

  const allVals = data.flatMap((d) => series.map((s) => (d[s.key] as number) ?? 0));
  const maxVal = Math.max(...allVals, 1);

  const tickCount = 4;
  const rawStep = maxVal / tickCount;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep || 1)));
  const niceStep = Math.ceil(rawStep / magnitude) * magnitude || 1;
  const ticks: number[] = [];
  for (let t = 0; t <= maxVal + niceStep; t += niceStep) ticks.push(t);
  const topTick = ticks[ticks.length - 1] ?? 1;

  const xScale = (i: number) => padL + (i / Math.max(n - 1, 1)) * chartW;
  const yScale = (v: number) => padT + chartH - (v / topTick) * chartH;

  const barW = Math.max(3, chartW / (n + 1) - 2);

  return (
    <div style={cardStyle}>
      <p style={{ margin: '0 0 12px', fontSize: 12, color: '#94a3b8', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {title}
      </p>
      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block', minWidth: 280 }} preserveAspectRatio="none">
          <defs>
            {series.map((s) => (
              <linearGradient key={s.key as string} id={`grad-${s.key as string}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
                <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
              </linearGradient>
            ))}
          </defs>

          {ticks.map((t) => {
            const y = yScale(t);
            if (y < padT - 2 || y > padT + chartH + 2) return null;
            return (
              <g key={t}>
                <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#1e293b" strokeWidth={1} />
                <text x={padL - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#475569">
                  {t >= 1000 ? `${(t / 1000).toFixed(0)}k` : t}
                </text>
              </g>
            );
          })}

          {data.map((d, i) => {
            const step = Math.max(1, Math.round(n / 8));
            if (i % step !== 0 && i !== n - 1) return null;
            return (
              <text key={d.date} x={xScale(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#475569">
                {d.date.slice(5)}
              </text>
            );
          })}

          <line x1={padL} y1={padT + chartH} x2={W - padR} y2={padT + chartH} stroke="#334155" strokeWidth={1} />

          {series.map((s, si) => {
            const vals = data.map((d) => (d[s.key] as number) ?? 0);

            if (series.length === 1) {
              return (
                <g key={s.key as string}>
                  {vals.map((v, i) => {
                    const bh = Math.max(1, (v / topTick) * chartH);
                    const bx = xScale(i) - barW / 2;
                    const by = padT + chartH - bh;
                    return <rect key={i} x={bx} y={by} width={barW} height={bh} rx={1.5} fill={s.color} opacity={0.82} />;
                  })}
                </g>
              );
            }

            const pts = vals.map((v, i) => `${xScale(i)},${yScale(v)}`).join(' ');
            const areaPath =
              `M ${xScale(0)},${padT + chartH} ` +
              vals.map((v, i) => `L ${xScale(i)},${yScale(v)}`).join(' ') +
              ` L ${xScale(n - 1)},${padT + chartH} Z`;

            return (
              <g key={s.key as string} opacity={si === 0 ? 1 : 0.85}>
                <path d={areaPath} fill={`url(#grad-${s.key as string})`} />
                <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                {n <= 14 && vals.map((v, i) => (
                  <circle key={i} cx={xScale(i)} cy={yScale(v)} r={2.5} fill={s.color} />
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {series.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 8 }}>
          {series.map((s) => (
            <div key={s.key as string} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
              <span style={{ fontSize: 11, color: '#64748b' }}>{s.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, delta, color }: { icon: string; label: string; value: number; delta: number; color: string }) {
  const trendColor = delta > 0 ? '#4ade80' : delta < 0 ? '#f87171' : '#475569';
  const trendIcon = delta > 0 ? 'trending_up' : delta < 0 ? 'trending_down' : 'trending_flat';
  return (
    <div style={{ background: 'linear-gradient(145deg,#1e293b 0%,#0f172a 100%)', borderRadius: 14, padding: '16px 20px', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 4px 20px rgba(0,0,0,0.35)', flex: '1 1 160px', minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-icons" style={{ color, fontSize: 18 }}>{icon}</span>
        </div>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 }}>{value.toLocaleString()}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
        <span className="material-icons" style={{ color: trendColor, fontSize: 14 }}>{trendIcon}</span>
        <span style={{ fontSize: 11, color: trendColor, fontWeight: 600 }}>{delta > 0 ? '+' : ''}{delta} today</span>
      </div>
    </div>
  );
}

// ── Completion ring ──────────────────────────────────────────────────────────
function Ring({ pct, label }: { pct: number; label: string }) {
  const r = 44, circ = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={108} height={108} viewBox="0 0 108 108">
        <circle cx={54} cy={54} r={r} fill="none" stroke="#1e293b" strokeWidth={12} />
        <circle cx={54} cy={54} r={r} fill="none" stroke="url(#rg)" strokeWidth={12}
          strokeLinecap="round" strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct / 100)}
          transform="rotate(-90 54 54)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
        <defs>
          <linearGradient id="rg" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d32998" /><stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        <text x={54} y={50} textAnchor="middle" fontSize={18} fontWeight={800} fill="#f1f5f9">{pct}%</text>
        <text x={54} y={64} textAnchor="middle" fontSize={9} fill="#64748b">complete</text>
      </svg>
      <span style={{ fontSize: 11, color: '#64748b' }}>{label}</span>
    </div>
  );
}

function SectionLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
      <span className="material-icons" style={{ color: '#334155', fontSize: 16 }}>{icon}</span>
      <span style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: 0.6, textTransform: 'uppercase' }}>{label}</span>
    </div>
  );
}

function avgDelta(s: DailyActivitySnapshot[], k: keyof DailyActivitySnapshot): string {
  if (s.length < 2) return 'N/A';
  const total = s.slice(1).reduce((sum, x) => sum + ((x[k] as number) ?? 0), 0);
  return (total / (s.length - 1)).toFixed(1);
}

// ── Styles ────────────────────────────────────────────────────────────────────
const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'radial-gradient(ellipse at 20% 10%, #1a0a2e 0%, #0a0f1e 60%)',
  fontFamily: "'Roboto', 'Google Sans', system-ui, sans-serif",
  color: '#f1f5f9',
};
const centerStyle: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center',
  background: 'radial-gradient(ellipse at 20% 50%, #1a0a2e 0%, #0a0f1e 60%)',
  fontFamily: "'Roboto', system-ui, sans-serif", padding: 24, color: '#f1f5f9',
};
const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
  borderRadius: 14, padding: '18px 20px',
  border: '1px solid rgba(255,255,255,0.06)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.35)',
};
const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
  background: 'linear-gradient(135deg,#d32998,#7c3aed)',
  color: '#fff', border: 'none', borderRadius: 9,
  fontWeight: 600, fontSize: 13, cursor: 'pointer',
  fontFamily: 'inherit', boxShadow: '0 4px 14px rgba(211,41,152,0.25)',
  width: '100%', padding: '12px 0',
};
const td: React.CSSProperties = {
  padding: '9px 14px', color: '#94a3b8',
  borderBottom: '1px solid rgba(255,255,255,0.04)', whiteSpace: 'nowrap',
};

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminMetricsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const fetchMetrics = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/admin/metrics');
      if (!res.ok) { setError('Failed to load metrics.'); setData(null); }
      else setData((await res.json()) as AdminMetricsData);
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchMetrics(); }, [fetchMetrics]);

  const handleSync = async () => {
    setSyncing(true); setSyncMsg('');
    try {
      const res = await fetch('/api/admin/cron');
      setSyncMsg(res.ok ? 'Snapshot captured!' : 'Sync failed.');
      if (res.ok) await fetchMetrics();
    } catch { setSyncMsg('Network error.'); }
    finally { setSyncing(false); setTimeout(() => setSyncMsg(''), 3500); }
  };

  const snapshots = data?.snapshots ?? [];
  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];
  const delta = (k: keyof DailyActivitySnapshot) =>
    latest && prev ? (latest[k] as number) - (prev[k] as number) : (latest ? (latest[k] as number) : 0);

  if (loading) return (
    <div style={centerStyle}>
      <span className="material-icons" style={{ color: '#d32998', fontSize: 48, animation: 'spin 1s linear infinite' }}>refresh</span>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  if (error) return (
    <div style={centerStyle}>
      <span className="material-icons" style={{ color: '#f44336', fontSize: 48, display: 'block', marginBottom: 12 }}>error_outline</span>
      <p style={{ color: '#f44336', fontWeight: 600 }}>{error}</p>
      <button onClick={() => { setError(null); fetchMetrics(); }} style={{ ...btnStyle, marginTop: 16, padding: '10px 24px', width: 'auto' }}>Retry</button>
    </div>
  );

  const completionPct = latest && latest.totalTasks > 0 ? Math.round((latest.completedTasks / latest.totalTasks) * 100) : 0;
  const totalConversations = latest ? (latest.totalFeedback ?? 0) + (latest.totalFeedbackComments ?? 0) + (latest.totalProjectThreadComments ?? 0) : 0;

  return (
    <div style={pageStyle}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:#0f172a}
        ::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}
        body{background:#0a0f1e!important}
      `}</style>

      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', flexWrap: 'wrap', gap: 10, background: 'linear-gradient(90deg,#0f172a,#1a1040)', borderBottom: '1px solid rgba(255,255,255,0.06)', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg,#d32998,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="material-icons" style={{ color: '#fff', fontSize: 20 }}>analytics</span>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>FOMO Life · Dashboard</div>
            <div style={{ fontSize: 10, color: '#475569' }}>Activity Overview</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {data?.lastUpdated && <span style={{ fontSize: 11, color: '#334155' }}>Updated {new Date(data.lastUpdated).toLocaleString()}</span>}
          {syncMsg && <span style={{ fontSize: 12, fontWeight: 600, color: syncMsg.includes('!') ? '#4ade80' : '#f87171' }}>{syncMsg}</span>}
          <button onClick={handleSync} disabled={syncing} style={{ ...btnStyle, width: 'auto', padding: '8px 16px', fontSize: 12, opacity: syncing ? 0.6 : 1 }}>
            <span className="material-icons" style={{ fontSize: 15, animation: syncing ? 'spin 1s linear infinite' : 'none' }}>sync</span>
            {syncing ? 'Capturing…' : 'Capture Snapshot'}
          </button>
        </div>
      </header>

      <main style={{ padding: '24px 28px', maxWidth: 1400, margin: '0 auto' }}>
        {!latest ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 80, gap: 16 }}>
            <span className="material-icons" style={{ color: '#1e293b', fontSize: 72 }}>insert_chart</span>
            <p style={{ color: '#475569', fontSize: 15 }}>No snapshots yet.</p>
            <button onClick={handleSync} style={{ ...btnStyle, width: 'auto', padding: '10px 28px' }}>
              <span className="material-icons" style={{ fontSize: 16 }}>play_arrow</span>Capture First Snapshot
            </button>
          </div>
        ) : (
          <>
            {/* KPI grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
              <StatCard icon="group" label="Total Users" value={latest.totalUsers} delta={delta('totalUsers')} color="#7c3aed" />
              <StatCard icon="person" label="Active Users" value={latest.activeUsers} delta={delta('activeUsers')} color="#d32998" />
              <StatCard icon="folder" label="Projects" value={latest.totalProjects} delta={delta('totalProjects')} color="#0ea5e9" />
              <StatCard icon="task_alt" label="Tasks" value={latest.totalTasks} delta={delta('totalTasks')} color="#10b981" />
              <StatCard icon="check_circle" label="Completed" value={latest.completedTasks} delta={delta('completedTasks')} color="#4ade80" />
              <StatCard icon="contacts" label="Contacts" value={latest.totalContacts} delta={delta('totalContacts')} color="#f59e0b" />
              <StatCard icon="forum" label="Feedback Posts" value={latest.totalFeedback ?? 0} delta={delta('totalFeedback')} color="#a78bfa" />
              <StatCard icon="chat_bubble" label="Feedback Replies" value={latest.totalFeedbackComments ?? 0} delta={delta('totalFeedbackComments')} color="#fb923c" />
              <StatCard icon="comment" label="Project Replies" value={latest.totalProjectThreadComments ?? 0} delta={delta('totalProjectThreadComments')} color="#38bdf8" />
            </div>

            {/* Summary row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
              <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: 24, flex: '0 1 auto', padding: '20px 32px' }}>
                <Ring pct={completionPct} label="Task completion" />
                <div style={{ width: 1, height: 80, background: 'rgba(255,255,255,0.06)' }} />
                <div>
                  <div style={{ fontSize: 11, color: '#475569', marginBottom: 4 }}>TOTAL CONVERSATIONS</div>
                  <div style={{ fontSize: 38, fontWeight: 800, color: '#f1f5f9' }}>{totalConversations.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    {latest.totalFeedback ?? 0} posts · {latest.totalFeedbackComments ?? 0} feedback replies · {latest.totalProjectThreadComments ?? 0} project replies
                  </div>
                </div>
              </div>

              <div style={{ ...cardStyle, flex: '1 1 240px' }}>
                <p style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', margin: '0 0 12px' }}>Today&apos;s New Activity</p>
                {([
                  ['person_add', 'New Users', 'newUsers', '#7c3aed'],
                  ['create_new_folder', 'New Projects', 'newProjects', '#0ea5e9'],
                  ['add_task', 'New Tasks', 'newTasks', '#10b981'],
                  ['person', 'New Contacts', 'newContacts', '#f59e0b'],
                ] as [string, string, keyof DailyActivitySnapshot, string][]).map(([icon, lbl, key, col]) => (
                  <div key={key as string} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="material-icons" style={{ color: col, fontSize: 16 }}>{icon}</span>
                      <span style={{ fontSize: 12, color: '#94a3b8' }}>{lbl}</span>
                    </div>
                    <span style={{ fontSize: 18, fontWeight: 700, color: (latest[key] as number) > 0 ? '#4ade80' : '#334155' }}>+{latest[key] as number}</span>
                  </div>
                ))}
              </div>

              <div style={{ ...cardStyle, flex: '1 1 220px' }}>
                <p style={{ fontSize: 11, color: '#475569', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase', margin: '0 0 12px' }}>System Info</p>
                {([
                  ['Last snapshot', latest.date],
                  ['Total snapshots', String(snapshots.length)],
                  ['Data range', snapshots.length > 1 ? `${snapshots[0]!.date} → ${latest.date}` : latest.date],
                  ['Avg new users/day', avgDelta(snapshots, 'newUsers')],
                  ['Avg new tasks/day', avgDelta(snapshots, 'newTasks')],
                ] as [string, string][]).map(([lbl, val]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ color: '#64748b' }}>{lbl}</span>
                    <span style={{ color: '#cbd5e1', fontWeight: 500 }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Histograms */}
            {snapshots.length >= 2 && (
              <>
                <SectionLabel icon="people" label="Users & Engagement" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginBottom: 28 }}>
                  <Histogram snapshots={snapshots} title="Total Users" series={[{ key: 'totalUsers', label: 'Total Users', color: '#7c3aed' }]} />
                  <Histogram snapshots={snapshots} title="New vs Active Users" series={[{ key: 'newUsers', label: 'New', color: '#d32998' }, { key: 'activeUsers', label: 'Active', color: '#7c3aed' }]} />
                </div>

                <SectionLabel icon="task_alt" label="Tasks & Projects" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginBottom: 28 }}>
                  <Histogram snapshots={snapshots} title="Total Tasks" series={[{ key: 'totalTasks', label: 'Tasks', color: '#10b981' }]} />
                  <Histogram snapshots={snapshots} title="Tasks: Total vs Completed" series={[{ key: 'totalTasks', label: 'Total', color: '#0ea5e9' }, { key: 'completedTasks', label: 'Completed', color: '#10b981' }]} />
                  <Histogram snapshots={snapshots} title="Projects" series={[{ key: 'totalProjects', label: 'Projects', color: '#0ea5e9' }]} />
                </div>

                <SectionLabel icon="forum" label="Conversations" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16, marginBottom: 28 }}>
                  <Histogram snapshots={snapshots} title="Feedback Posts" series={[{ key: 'totalFeedback', label: 'Feedback', color: '#a78bfa' }]} />
                  <Histogram snapshots={snapshots} title="Comments: Feedback vs Project" series={[{ key: 'totalFeedbackComments', label: 'Feedback replies', color: '#fb923c' }, { key: 'totalProjectThreadComments', label: 'Project replies', color: '#38bdf8' }]} />
                  <Histogram snapshots={snapshots} title="Contacts" series={[{ key: 'totalContacts', label: 'Contacts', color: '#f59e0b' }]} />
                </div>
              </>
            )}

            {/* Raw table */}
            <SectionLabel icon="table_chart" label="Snapshot History" />
            <div style={{ ...cardStyle, padding: 0, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                    {['Date', 'Users', '↑', 'Active', 'Projects', 'Tasks', '✓', 'Contacts', 'Feedback', 'FB Replies', 'Proj Replies'].map((h) => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Date' ? 'left' : 'center', color: '#475569', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.06)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...snapshots].reverse().map((s, i) => (
                    <tr key={s.date} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                      <td style={td}>{s.date}</td>
                      <td style={{ ...td, textAlign: 'center', color: '#c4b5fd' }}>{s.totalUsers}</td>
                      <td style={{ ...td, textAlign: 'center', color: s.newUsers > 0 ? '#4ade80' : '#334155' }}>+{s.newUsers}</td>
                      <td style={{ ...td, textAlign: 'center', color: '#a78bfa' }}>{s.activeUsers}</td>
                      <td style={{ ...td, textAlign: 'center', color: '#7dd3fc' }}>{s.totalProjects}</td>
                      <td style={{ ...td, textAlign: 'center', color: '#6ee7b7' }}>{s.totalTasks}</td>
                      <td style={{ ...td, textAlign: 'center', color: '#4ade80' }}>{s.completedTasks}</td>
                      <td style={{ ...td, textAlign: 'center', color: '#fcd34d' }}>{s.totalContacts}</td>
                      <td style={{ ...td, textAlign: 'center', color: '#c4b5fd' }}>{s.totalFeedback ?? 0}</td>
                      <td style={{ ...td, textAlign: 'center', color: '#fb923c' }}>{s.totalFeedbackComments ?? 0}</td>
                      <td style={{ ...td, textAlign: 'center', color: '#38bdf8' }}>{s.totalProjectThreadComments ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
