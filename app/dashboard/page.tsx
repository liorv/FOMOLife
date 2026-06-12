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
}

interface AdminMetricsData {
  snapshots: DailyActivitySnapshot[];
  lastUpdated: string;
}

// ── Sparkline SVG ────────────────────────────────────────────────────────────
function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 120;
  const h = 40;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  });
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: 'visible' }}>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      <polyline
        points={`0,${h} ${pts.join(' ')} ${w},${h}`}
        fill={color}
        opacity="0.12"
      />
    </svg>
  );
}

// ── Bar chart ────────────────────────────────────────────────────────────────
function BarChart({
  data,
  valueKey,
  label,
  color,
}: {
  data: DailyActivitySnapshot[];
  valueKey: keyof DailyActivitySnapshot;
  label: string;
  color: string;
}) {
  const visible = data.slice(-30);
  const max = Math.max(...visible.map((d) => d[valueKey] as number), 1);
  const chartH = 160;
  const barW = Math.max(8, Math.floor(600 / (visible.length + 1)));
  const gap = 2;

  return (
    <div style={{ overflowX: 'auto' }}>
      <p style={{ margin: '0 0 8px', fontSize: 13, color: '#90caf9', fontWeight: 500 }}>
        {label} — last {visible.length} days
      </p>
      <svg
        width={visible.length * (barW + gap)}
        height={chartH + 24}
        style={{ display: 'block' }}
      >
        {visible.map((d, i) => {
          const val = d[valueKey] as number;
          const bh = Math.max(2, (val / max) * chartH);
          const x = i * (barW + gap);
          const y = chartH - bh;
          return (
            <g key={d.date}>
              <rect x={x} y={y} width={barW} height={bh} rx={2} fill={color} opacity={0.85} />
              {barW > 14 && (
                <text
                  x={x + barW / 2}
                  y={chartH + 16}
                  textAnchor="middle"
                  fontSize={9}
                  fill="#90caf9"
                  opacity={0.6}
                >
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
        {/* Baseline */}
        <line x1={0} y1={chartH} x2={visible.length * (barW + gap)} y2={chartH} stroke="#334155" strokeWidth={1} />
      </svg>
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  delta,
  trend,
  color,
  sparkValues,
}: {
  icon: string;
  label: string;
  value: number;
  delta: number;
  trend: 'up' | 'down' | 'flat';
  color: string;
  sparkValues: number[];
}) {
  const trendColor = trend === 'up' ? '#4caf50' : trend === 'down' ? '#f44336' : '#90a4ae';
  const trendIcon = trend === 'up' ? 'trending_up' : trend === 'down' ? 'trending_down' : 'trending_flat';

  return (
    <div
      style={{
        background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: 16,
        padding: '20px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
        flex: '1 1 200px',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: `${color}22`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span className="material-icons" style={{ color, fontSize: 22 }}>
              {icon}
            </span>
          </div>
          <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500, letterSpacing: 0.3 }}>
            {label}
          </span>
        </div>
        <Sparkline values={sparkValues} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 34, fontWeight: 700, color: '#f1f5f9', lineHeight: 1 }}>{value.toLocaleString()}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
          <span className="material-icons" style={{ color: trendColor, fontSize: 16 }}>
            {trendIcon}
          </span>
          <span style={{ fontSize: 12, color: trendColor, fontWeight: 600 }}>
            {delta > 0 ? '+' : ''}{delta} today
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminMetricsData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  const fetchMetrics = useCallback(
    async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/admin/metrics');
        if (!res.ok) {
          setError('Failed to load metrics.');
          setData(null);
        } else {
          const json = (await res.json()) as AdminMetricsData;
          setData(json);
        }
      } catch {
        setError('Network error.');
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/admin/cron');
      if (res.ok) {
        setSyncMsg('Snapshot captured!');
        await fetchMetrics();
      } else {
        setSyncMsg('Sync failed.');
      }
    } catch {
      setSyncMsg('Network error.');
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(''), 3000);
    }
  };

  const snapshots = data?.snapshots ?? [];
  const latest = snapshots[snapshots.length - 1];
  const prev = snapshots[snapshots.length - 2];

  const sparkFor = (key: keyof DailyActivitySnapshot) =>
    snapshots.slice(-14).map((s) => s[key] as number);

  const delta = (key: keyof DailyActivitySnapshot) => {
    if (!latest) return 0;
    if (!prev) return latest[key] as number;
    return (latest[key] as number) - (prev[key] as number);
  };

  const trend = (key: keyof DailyActivitySnapshot): 'up' | 'down' | 'flat' => {
    const d = delta(key);
    return d > 0 ? 'up' : d < 0 ? 'down' : 'flat';
  };

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={outerStyle}>
        <span className="material-icons" style={{ color: '#d32998', fontSize: 48, animation: 'spin 1s linear infinite' }}>
          refresh
        </span>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={outerStyle}>
        <div style={{ textAlign: 'center' }}>
          <span className="material-icons" style={{ color: '#f44336', fontSize: 48, display: 'block', marginBottom: 16 }}>
            error_outline
          </span>
          <p style={{ color: '#f44336', fontSize: 16, fontWeight: 600 }}>{error}</p>
          <button
            onClick={() => { setError(null); fetchMetrics(); }}
            style={{ ...btnPrimaryStyle, marginTop: 16, width: 'auto', padding: '10px 24px' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── No data yet ─────────────────────────────────────────────────────────
  if (!latest) {
    return (
      <div style={pageStyle}>
        <Header onSync={handleSync} syncing={syncing} syncMsg={syncMsg} lastUpdated={data?.lastUpdated ?? ''} />
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            gap: 16,
            padding: 40,
          }}
        >
          <span className="material-icons" style={{ color: '#334155', fontSize: 64 }}>
            insert_chart
          </span>
          <p style={{ color: '#64748b', fontSize: 16 }}>No activity snapshots yet.</p>
          <p style={{ color: '#475569', fontSize: 13, maxWidth: 400, textAlign: 'center' }}>
            Click <strong style={{ color: '#90caf9' }}>Capture Snapshot</strong> to record today&apos;s metrics,
            or configure a daily cron job at <code style={{ color: '#d32998' }}>/api/admin/cron</code>.
          </p>
          <button onClick={handleSync} style={{ ...btnPrimaryStyle, width: 'auto', padding: '10px 24px' }}>
            <span className="material-icons" style={{ fontSize: 18 }}>play_arrow</span>
            Capture Snapshot Now
          </button>
        </div>
      </div>
    );
  }

  // ── Full dashboard ──────────────────────────────────────────────────────
  const completionRate = latest.totalTasks > 0
    ? Math.round((latest.completedTasks / latest.totalTasks) * 100)
    : 0;

  return (
    <div style={pageStyle}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #0f172a; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 3px; }
        body { background: #0a0f1e !important; }
      `}</style>

      <Header onSync={handleSync} syncing={syncing} syncMsg={syncMsg} lastUpdated={data?.lastUpdated ?? ''} />

      <main style={{ padding: '24px 32px', maxWidth: 1400, margin: '0 auto', width: '100%' }}>

        {/* KPI cards */}
        <section style={{ marginBottom: 32 }}>
          <SectionLabel icon="dashboard" label="Key Metrics — Today" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
            <StatCard
              icon="group"
              label="Total Users"
              value={latest.totalUsers}
              delta={delta('totalUsers')}
              trend={trend('totalUsers')}
              color="#7c3aed"
              sparkValues={sparkFor('totalUsers')}
            />
            <StatCard
              icon="person_add"
              label="Active Users"
              value={latest.activeUsers}
              delta={delta('activeUsers')}
              trend={trend('activeUsers')}
              color="#d32998"
              sparkValues={sparkFor('activeUsers')}
            />
            <StatCard
              icon="folder"
              label="Total Projects"
              value={latest.totalProjects}
              delta={delta('totalProjects')}
              trend={trend('totalProjects')}
              color="#0ea5e9"
              sparkValues={sparkFor('totalProjects')}
            />
            <StatCard
              icon="task_alt"
              label="Total Tasks"
              value={latest.totalTasks}
              delta={delta('totalTasks')}
              trend={trend('totalTasks')}
              color="#10b981"
              sparkValues={sparkFor('totalTasks')}
            />
            <StatCard
              icon="contacts"
              label="Total Contacts"
              value={latest.totalContacts}
              delta={delta('totalContacts')}
              trend={trend('totalContacts')}
              color="#f59e0b"
              sparkValues={sparkFor('totalContacts')}
            />
          </div>
        </section>

        {/* Progress ring + summary */}
        <section style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 32 }}>
          <div style={cardStyle}>
            <SectionLabel icon="pie_chart" label="Task Completion Rate" />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 0' }}>
              <CompletionRing percentage={completionRate} />
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginTop: 8,
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: 16,
              }}
            >
              <MiniStat icon="check_circle" label="Completed" value={latest.completedTasks} color="#10b981" />
              <MiniStat icon="radio_button_unchecked" label="Open" value={latest.totalTasks - latest.completedTasks} color="#64748b" />
            </div>
          </div>

          <div style={{ ...cardStyle, flex: '1 1 300px' }}>
            <SectionLabel icon="today" label="Today&apos;s Activity" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <ActivityRow icon="person_add" label="New Users" value={latest.newUsers} color="#7c3aed" />
              <ActivityRow icon="create_new_folder" label="New Projects" value={latest.newProjects} color="#0ea5e9" />
              <ActivityRow icon="add_task" label="New Tasks" value={latest.newTasks} color="#10b981" />
              <ActivityRow icon="person" label="New Contacts" value={latest.newContacts} color="#f59e0b" />
            </div>
          </div>

          <div style={{ ...cardStyle, flex: '1 1 300px' }}>
            <SectionLabel icon="info" label="System Info" />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              <InfoRow label="Last snapshot" value={latest.date} />
              <InfoRow label="Total snapshots" value={String(snapshots.length)} />
              <InfoRow
                label="Data range"
                value={snapshots.length > 1 ? `${snapshots[0].date} → ${latest.date}` : latest.date}
              />
              <InfoRow label="Avg daily new users" value={avgDelta(snapshots, 'newUsers')} />
              <InfoRow label="Avg daily new tasks" value={avgDelta(snapshots, 'newTasks')} />
            </div>
          </div>
        </section>

        {/* Time series charts */}
        {snapshots.length >= 2 && (
          <section style={{ marginBottom: 32 }}>
            <SectionLabel icon="show_chart" label="30-Day Trends" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginTop: 16 }}>
              <div style={cardStyle}>
                <BarChart data={snapshots} valueKey="totalUsers" label="Users" color="#7c3aed" />
              </div>
              <div style={cardStyle}>
                <BarChart data={snapshots} valueKey="totalProjects" label="Projects" color="#0ea5e9" />
              </div>
              <div style={cardStyle}>
                <BarChart data={snapshots} valueKey="totalTasks" label="Tasks" color="#10b981" />
              </div>
              <div style={cardStyle}>
                <BarChart data={snapshots} valueKey="completedTasks" label="Completed Tasks" color="#d32998" />
              </div>
            </div>
          </section>
        )}

        {/* Raw snapshot table */}
        <section>
          <SectionLabel icon="table_chart" label="Snapshot History" />
          <div
            style={{
              ...cardStyle,
              marginTop: 16,
              padding: 0,
              overflowX: 'auto',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  {['Date', 'Users', '↑Users', 'Active', 'Projects', '↑Projects', 'Tasks', '↑Tasks', 'Done', 'Contacts', '↑Contacts'].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          padding: '12px 16px',
                          textAlign: h === 'Date' ? 'left' : 'center',
                          color: '#64748b',
                          fontWeight: 600,
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {[...snapshots].reverse().map((s, i) => (
                  <tr
                    key={s.date}
                    style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                  >
                    <td style={tdStyle}>{s.date}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#c4b5fd' }}>{s.totalUsers}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: s.newUsers > 0 ? '#4ade80' : '#475569' }}>+{s.newUsers}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#a78bfa' }}>{s.activeUsers}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#7dd3fc' }}>{s.totalProjects}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: s.newProjects > 0 ? '#4ade80' : '#475569' }}>+{s.newProjects}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#6ee7b7' }}>{s.totalTasks}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: s.newTasks > 0 ? '#4ade80' : '#475569' }}>+{s.newTasks}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#f9a8d4' }}>{s.completedTasks}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: '#fcd34d' }}>{s.totalContacts}</td>
                    <td style={{ ...tdStyle, textAlign: 'center', color: s.newContacts > 0 ? '#4ade80' : '#475569' }}>+{s.newContacts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

// ── Helper sub-components ────────────────────────────────────────────────────

function Header({
  onSync,
  syncing,
  syncMsg,
  lastUpdated,
}: {
  onSync: () => void;
  syncing: boolean;
  syncMsg: string;
  lastUpdated: string;
}) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 32px',
        background: 'linear-gradient(90deg, #0f172a 0%, #1a1040 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        flexWrap: 'wrap',
        gap: 12,
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #d32998, #7c3aed)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span className="material-icons" style={{ color: '#fff', fontSize: 22 }}>
            analytics
          </span>
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', letterSpacing: -0.3 }}>
            FOMO Life · Admin
          </div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>Activity Dashboard</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {lastUpdated && (
          <span style={{ fontSize: 11, color: '#475569' }}>
            Updated {new Date(lastUpdated).toLocaleString()}
          </span>
        )}
        {syncMsg && (
          <span
            style={{
              fontSize: 12,
              color: syncMsg.includes('!') ? '#4ade80' : '#f87171',
              fontWeight: 600,
            }}
          >
            {syncMsg}
          </span>
        )}
        <button
          onClick={onSync}
          disabled={syncing}
          style={{
            ...btnPrimaryStyle,
            width: 'auto',
            padding: '8px 18px',
            fontSize: 13,
            opacity: syncing ? 0.6 : 1,
            cursor: syncing ? 'wait' : 'pointer',
          }}
        >
          <span
            className="material-icons"
            style={{
              fontSize: 16,
              animation: syncing ? 'spin 1s linear infinite' : 'none',
            }}
          >
            sync
          </span>
          {syncing ? 'Capturing…' : 'Capture Snapshot'}
        </button>
      </div>
    </header>
  );
}

function SectionLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="material-icons" style={{ color: '#475569', fontSize: 18 }}>
        {icon}
      </span>
      <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {label}
      </span>
    </div>
  );
}

function MiniStat({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span className="material-icons" style={{ color, fontSize: 18 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 12, color: '#64748b' }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9' }}>{value.toLocaleString()}</div>
      </div>
    </div>
  );
}

function ActivityRow({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span className="material-icons" style={{ color, fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 13, color: '#94a3b8' }}>{label}</span>
      </div>
      <span
        style={{
          fontSize: 20,
          fontWeight: 700,
          color: value > 0 ? '#4ade80' : '#334155',
        }}
      >
        +{value}
      </span>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 13,
        padding: '6px 0',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}
    >
      <span style={{ color: '#64748b' }}>{label}</span>
      <span style={{ color: '#cbd5e1', fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function CompletionRing({ percentage }: { percentage: number }) {
  const r = 60;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - percentage / 100);
  return (
    <div style={{ position: 'relative', width: 152, height: 152 }}>
      <svg width={152} height={152} viewBox="0 0 152 152">
        <circle cx={76} cy={76} r={r} fill="none" stroke="#1e293b" strokeWidth={16} />
        <circle
          cx={76}
          cy={76}
          r={r}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={16}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dashOffset}
          transform="rotate(-90 76 76)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <defs>
          <linearGradient id="ring-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#d32998" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: 28, fontWeight: 800, color: '#f1f5f9' }}>{percentage}%</span>
        <span style={{ fontSize: 11, color: '#64748b' }}>complete</span>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function avgDelta(snapshots: DailyActivitySnapshot[], key: keyof DailyActivitySnapshot): string {
  if (snapshots.length < 2) return 'N/A';
  const total = snapshots.slice(1).reduce((sum, s) => sum + (s[key] as number), 0);
  return (total / (snapshots.length - 1)).toFixed(1);
}

// ── Shared styles ────────────────────────────────────────────────────────────

const outerStyle: React.CSSProperties = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'radial-gradient(ellipse at 20% 50%, #1a0a2e 0%, #0a0f1e 60%)',
  fontFamily: "'Roboto', 'Google Sans', system-ui, sans-serif",
  padding: 24,
};

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'radial-gradient(ellipse at 20% 10%, #1a0a2e 0%, #0a0f1e 60%)',
  fontFamily: "'Roboto', 'Google Sans', system-ui, sans-serif",
  color: '#f1f5f9',
};

const cardStyle: React.CSSProperties = {
  background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
  borderRadius: 16,
  padding: '20px 24px',
  border: '1px solid rgba(255,255,255,0.06)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
  flex: '1 1 280px',
};

const btnPrimaryStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  width: '100%',
  padding: '12px 0',
  background: 'linear-gradient(135deg, #d32998, #7c3aed)',
  color: '#fff',
  border: 'none',
  borderRadius: 10,
  fontWeight: 600,
  fontSize: 14,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 4px 14px rgba(211, 41, 152, 0.3)',
};

const tdStyle: React.CSSProperties = {
  padding: '10px 16px',
  color: '#cbd5e1',
  borderBottom: '1px solid rgba(255,255,255,0.04)',
  whiteSpace: 'nowrap',
};
