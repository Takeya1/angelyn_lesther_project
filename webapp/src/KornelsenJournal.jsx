import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const JOB_TYPES = ['Installation', 'Repair', 'Consultation', 'Other'];

const TYPE_STYLE = {
  Installation: { bg: '#FEF3E2', text: '#92600A' },
  Repair:       { bg: '#E6F4EE', text: '#1F6644' },
  Consultation: { bg: '#EEF0FB', text: '#3340B0' },
  Other:        { bg: '#F3F0ED', text: '#5C5043' },
};

const TYPE_CHART_COLORS = ['#C17F24', '#2E8B5A', '#4A5DD4', '#9E8B6B'];

const todayStr = () => new Date().toISOString().split('T')[0];

const fmtDate = (s) =>
  new Date(s + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

const getMonday = (d) => {
  const date = new Date(d);
  const day = date.getDay();
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1));
  date.setHours(0, 0, 0, 0);
  return date;
};

export default function KornelsenJournal() {
  const [entries, setEntries] = useState([]);
  const [search, setSearch]  = useState('');
  const [toast, setToast]    = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [form, setForm] = useState({
    jobName: '', clientName: '', date: todayStr(),
    hours: '', jobType: 'Installation', notes: '',
  });

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSave = () => {
    if (!form.jobName.trim() || !form.clientName.trim() || !form.hours) {
      alert('Please fill in Job Name, Client Name, and Hours before saving.');
      return;
    }
    setEntries((prev) => [
      { id: Date.now(), ...form, hours: parseFloat(form.hours) },
      ...prev,
    ]);
    setForm({ jobName: '', clientName: '', date: todayStr(), hours: '', jobType: 'Installation', notes: '' });
    setIsDrawerOpen(false);
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  const handleDelete = (id) => {
    if (window.confirm('Remove this job entry?')) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return [...entries]
      .filter(
        (e) =>
          e.jobName.toLowerCase().includes(q) ||
          e.clientName.toLowerCase().includes(q),
      )
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [entries, search]);

  const summary = useMemo(() => {
    const totalHours = entries.reduce((s, e) => s + e.hours, 0);
    const byType = JOB_TYPES.map((t) => ({
      name: t,
      hours: entries.filter((e) => e.jobType === t).reduce((s, e) => s + e.hours, 0),
    })).filter((t) => t.hours > 0);

    const thisMonday  = getMonday(new Date());
    const lastMonday  = new Date(thisMonday); lastMonday.setDate(lastMonday.getDate() - 7);

    const thisWeek = entries
      .filter((e) => new Date(e.date + 'T00:00:00') >= thisMonday)
      .reduce((s, e) => s + e.hours, 0);
    const lastWeek = entries
      .filter((e) => {
        const d = new Date(e.date + 'T00:00:00');
        return d >= lastMonday && d < thisMonday;
      })
      .reduce((s, e) => s + e.hours, 0);

    return { totalHours, totalJobs: entries.length, byType, thisWeek, lastWeek };
  }, [entries]);

  return (
    <div className="fade-in">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          backgroundColor: 'var(--success)', color: '#fff', padding: '12px 24px',
          borderRadius: '30px', fontSize: '14px', fontWeight: '600',
          boxShadow: '0 4px 20px rgba(0,0,0,0.18)', zIndex: 999,
        }}>
          ✓ Job entry saved successfully
        </div>
      )}

      {/* Summary Section */}
      <h1 className="page-title">Dashboard</h1>
      <p className="page-subtitle">Overview of all logged work</p>
      
      <SummaryStats summary={summary} />

      {/* Jobs Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 48, marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <h2 style={{ fontSize: 22, margin: 0 }}>Recent Jobs</h2>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search jobs or clients…"
          className="form-input"
          style={{ width: '280px', padding: '10px 14px' }}
        />
      </div>

      {entries.length === 0 ? (
        <EmptyState
          icon={search ? '🔍' : '📋'}
          title={search ? 'No matches found' : 'No jobs logged yet'}
          message={search ? 'Try a different name or clear your search.' : 'Click the + button to log your first job.'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((e) => <EntryCard key={e.id} entry={e} onDelete={handleDelete} />)}
        </div>
      )}

      {/* Floating Action Button */}
      <button className="floating-add-btn" onClick={() => setIsDrawerOpen(true)} title="Log New Work">
        +
      </button>

      {/* Slide-over Drawer for Logging Work */}
      {isDrawerOpen && (
        <div className="modal-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <h2 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Log a Job Entry</h2>
              <button className="drawer-close" onClick={() => setIsDrawerOpen(false)}>×</button>
            </div>

            <div className="form-group">
              <label className="form-label">Job Name / Description <span className="req">*</span></label>
              <input
                name="jobName" className="form-input"
                value={form.jobName} onChange={handleChange}
                placeholder="e.g. Front door installation — 42 Oak Street"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Client Name <span className="req">*</span></label>
              <input
                name="clientName" className="form-input"
                value={form.clientName} onChange={handleChange}
                placeholder="e.g. Smith Family"
              />
            </div>

            <div className="flex-row">
              <div className="form-group flex-1">
                <label className="form-label">Date of Work <span className="req">*</span></label>
                <input
                  type="date" name="date" className="form-input"
                  value={form.date} onChange={handleChange}
                />
              </div>
              <div className="form-group flex-1">
                <label className="form-label">Hours Spent <span className="req">*</span></label>
                <input
                  type="number" name="hours" className="form-input"
                  value={form.hours} onChange={handleChange}
                  placeholder="e.g. 3.5" min="0" step="0.25"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Job Type</label>
              <select name="jobType" className="form-input" value={form.jobType} onChange={handleChange}>
                {JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <textarea
                name="notes" className="form-input"
                value={form.notes} onChange={handleChange}
                placeholder="Any details worth remembering..."
                rows={4} style={{ resize: 'vertical' }}
              />
            </div>

            <button className="btn-primary" onClick={handleSave} style={{ marginTop: 'auto' }}>
              Save Entry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryStats({ summary }) {
  const { totalHours, totalJobs, byType, thisWeek, lastWeek } = summary;

  const weekData = [
    { name: 'Last Week', hours: parseFloat(lastWeek.toFixed(1)) },
    { name: 'This Week', hours: parseFloat(thisWeek.toFixed(1)) },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <StatCard value={totalHours.toFixed(1)} unit="Total Hours" label="All-Time" />
        <StatCard value={totalJobs} unit="Jobs" label="Logged" />
        <StatCard value={thisWeek.toFixed(1)} unit="Hours" label="This Week" />
        <StatCard value={lastWeek.toFixed(1)} unit="Hours" label="Last Week" />
      </div>

      {totalJobs > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
          <div className="card">
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Weekly Hours Comparison</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weekData} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: 10, border: '1px solid var(--card-border)' }} formatter={(v) => [`${v} h`, 'Hours']} />
                <Bar dataKey="hours" fill="var(--accent)" radius={[8, 8, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {byType.length > 0 && (
            <div className="card">
              <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Hours by Job Type</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={byType} dataKey="hours" nameKey="name"
                    cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                    paddingAngle={4}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={{ stroke: '#C4A882' }}
                  >
                    {byType.map((_, i) => (
                      <Cell key={i} fill={TYPE_CHART_COLORS[i % TYPE_CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 10, border: '1px solid var(--card-border)' }} formatter={(v) => [`${v} h`, 'Hours']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EntryCard({ entry, onDelete }) {
  return (
    <div className="card" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', transition: 'box-shadow 0.2s, transform 0.2s' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)' }}>{entry.jobName}</span>
          <TypeBadge type={entry.jobType} />
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--muted)', flexWrap: 'wrap' }}>
          <span>👤 {entry.clientName}</span>
          <span>📅 {fmtDate(entry.date)}</span>
          <span style={{ fontWeight: 700, color: 'var(--accent)' }}>⏱ {entry.hours}h</span>
        </div>
        {entry.notes && (
          <p style={{ margin: '8px 0 0', fontSize: 13, color: '#8A7A60', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {entry.notes}
          </p>
        )}
      </div>
      <button
        onClick={() => onDelete(entry.id)}
        style={{
          background: 'none', border: 'none', color: 'var(--muted)', fontSize: 18, cursor: 'pointer',
          padding: '4px 8px', alignSelf: 'flex-start', borderRadius: 8, transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'var(--danger-bg)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'none'; }}
      >
        ✕
      </button>
    </div>
  );
}

function StatCard({ value, unit, label }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '24px 16px' }}>
      <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: '#A89A84', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{unit}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#4A3D2E', marginTop: 12 }}>{label}</div>
    </div>
  );
}

function TypeBadge({ type }) {
  const s = TYPE_STYLE[type] || TYPE_STYLE.Other;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '4px 10px',
      borderRadius: 20, backgroundColor: s.bg, color: s.text,
      letterSpacing: '0.02em',
    }}>
      {type}
    </span>
  );
}

function EmptyState({ icon, title, message }) {
  return (
    <div style={{
      textAlign: 'center', padding: '64px 20px',
      backgroundColor: '#fff',
      border: '2px dashed var(--input-border)',
      borderRadius: 16,
    }}>
      <div style={{ fontSize: 52, marginBottom: 16, lineHeight: 1 }}>{icon}</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: '#4A3D2E', margin: '0 0 8px' }}>{title}</h3>
      <p style={{ color: 'var(--muted)', fontSize: 14, margin: '0 auto', maxWidth: 280, lineHeight: 1.6 }}>{message}</p>
    </div>
  );
}
