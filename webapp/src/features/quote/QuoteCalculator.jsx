import React, { useState } from 'react';
import useQuoteForm from './useQuoteForm';
import QuoteResult from './QuoteResult';

const WORK_TYPES = [
  { value: 'Install',      icon: '🔧', label: 'Install'      },
  { value: 'Labor',        icon: '👷', label: 'Labor'        },
  { value: 'Modify',       icon: '✏️',  label: 'Modify'       },
  { value: 'Remove',       icon: '🗑️',  label: 'Remove'       },
  { value: 'Rental',       icon: '🏷️',  label: 'Rental'       },
  { value: 'Repair',       icon: '🛠️',  label: 'Repair'       },
  { value: 'Replace',      icon: '🔄', label: 'Replace'      },
  { value: 'Service Call', icon: '📞', label: 'Service Call' },
  { value: 'Supply',       icon: '📦', label: 'Supply'       },
];

// Each entry declares which model flags it sets
const PRODUCT_TYPES = [
  { value: 'Door General',  icon: '🚪', label: 'Door General',  firedoor: 0, specialty_door: 0, dock_seal: 0 },
  { value: 'Fire Door',     icon: '🔥', label: 'Fire Door',     firedoor: 1, specialty_door: 0, dock_seal: 0 },
  { value: 'High Speed',    icon: '⚡', label: 'High Speed',    firedoor: 0, specialty_door: 1, dock_seal: 0 },
  { value: 'Traffic/Crash', icon: '🚗', label: 'Traffic/Crash', firedoor: 0, specialty_door: 1, dock_seal: 0 },
  { value: 'Dock Seal',     icon: '🔒', label: 'Dock Seal',     firedoor: 0, specialty_door: 0, dock_seal: 1 },
];

const ADDONS = [
  { key: 'bumpers',        label: '🟤 Bumpers'         },
  { key: 'dropTest',       label: '📋 Drop Test'        },
  { key: 'operatorOpener', label: '⚙️ Operator/Opener'  },
];

export default function QuoteCalculator() {
  const { form, update, reset } = useQuoteForm();
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const dimW = parseFloat(form.dimWidth)  || 0;
  const dimH = parseFloat(form.dimHeight) || 0;

  const valid =
    form.customerName.trim() &&
    form.distance !== '' &&
    form.workType.length > 0 &&
    form.doorGeneral &&
    dimW > 0 &&
    dimH > 0;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const base = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${base}/api/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload(form)),
      });
      if (!res.ok) {
        let msg = 'Server error';
        try {
          const errData = await res.json();
          msg = errData.error || errData.detail || msg;
        } catch (e) {}
        throw new Error(msg);
      }
      const data = await res.json();
      setResult(data);
    } catch (err) {
      console.error('API Error:', err);
      setError(err.message || 'Could not reach the quote server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    reset();
    setResult(null);
    setError(null);
  };

  const toggleWorkType = (val) => {
    update({
      workType: form.workType.includes(val)
        ? form.workType.filter((v) => v !== val)
        : [...form.workType, val],
    });
  };

  if (result) {
    return <QuoteResult result={result} onReset={handleReset} />;
  }

  return (
    <div className="quote-calculator fade-in">
      <h1 className="page-title">Generate a Quote</h1>
      <p className="page-subtitle">Fill out the details below to instantly calculate an estimate.</p>

      {error && <div className="error-banner">{error}</div>}

      {/* ── Section 1: Customer & Location ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 16 }}>1. Customer &amp; Location</h2>

        <div className="form-group">
          <label className="form-label">Customer Name <span className="req">*</span></label>
          <input
            className="form-input"
            value={form.customerName}
            onChange={(e) => update({ customerName: e.target.value })}
            placeholder="e.g. Lenworth"
          />
        </div>

        <div className="flex-row">
          <div className="form-group flex-1">
            <label className="form-label">Distance (km) <span className="req">*</span></label>
            <input
              type="number"
              className="form-input"
              value={form.distance}
              onChange={(e) => update({ distance: e.target.value })}
              placeholder="e.g. 75"
              min="0"
              step="0.1"
            />
          </div>
          <div className="form-group flex-1">
            <label className="form-label">Customer Tier</label>
            <select
              className="form-input"
              value={form.customerTier}
              onChange={(e) => update({ customerTier: parseInt(e.target.value) })}
            >
              <option value={0}>New</option>
              <option value={1}>Recurring</option>
              <option value={2}>Loyalty</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#4A3D2E' }}>
            <input
              type="checkbox"
              checked={form.isLenworth}
              onChange={(e) => update({ isLenworth: e.target.checked })}
              style={{ width: 17, height: 17, accentColor: '#C17F24', cursor: 'pointer' }}
            />
            Is this a Lenworth customer?
          </label>
        </div>
      </div>

      {/* ── Section 2: Job Type ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 16 }}>2. Job Type</h2>

        <div className="form-group">
          <label className="form-label">Work Type <span className="req">*</span> <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(select all that apply)</span></label>
          <div className="selector-grid">
            {WORK_TYPES.map(({ value, icon, label }) => (
              <div
                key={value}
                className={`selector-card ${form.workType.includes(value) ? 'selected' : ''}`}
                onClick={() => toggleWorkType(value)}
              >
                <div className="selector-icon">{icon}</div>
                <div className="selector-label">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Product Type <span className="req">*</span></label>
          <div className="selector-grid">
            {PRODUCT_TYPES.map(({ value, icon, label }) => (
              <div
                key={value}
                className={`selector-card ${form.doorGeneral === value ? 'selected' : ''}`}
                onClick={() => update({ doorGeneral: value })}
              >
                <div className="selector-icon">{icon}</div>
                <div className="selector-label">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Section 3: Details & Add-ons ── */}
      <div className="card" style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 18, marginTop: 0, marginBottom: 16 }}>3. Details &amp; Add-ons</h2>

        <div className="flex-row" style={{ alignItems: 'flex-start' }}>
          <div className="form-group flex-1">
            <label className="form-label">Door Dimensions (ft) <span className="req">*</span></label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input
                type="number"
                className="form-input"
                value={form.dimWidth}
                onChange={(e) => update({ dimWidth: e.target.value })}
                placeholder="Width"
                min="0"
                step="0.5"
              />
              <span style={{ color: 'var(--muted)', fontWeight: 700, flexShrink: 0 }}>×</span>
              <input
                type="number"
                className="form-input"
                value={form.dimHeight}
                onChange={(e) => update({ dimHeight: e.target.value })}
                placeholder="Height"
                min="0"
                step="0.5"
              />
            </div>
            {dimW > 0 && dimH > 0 && (
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                {dimW} × {dimH} ft = {(dimW * dimH).toFixed(1)} sq ft per door
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Quantity <span className="req">*</span></label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--input-border)', borderRadius: 10, overflow: 'hidden', width: 'fit-content' }}>
              <button
                type="button"
                onClick={() => update({ quantity: Math.max(1, form.quantity - 1) })}
                disabled={form.quantity <= 1}
                style={{ width: 44, height: 44, background: '#fff', border: 'none', fontSize: 20, cursor: 'pointer' }}
              >−</button>
              <div style={{ width: 44, textAlign: 'center', fontWeight: 700, borderLeft: '1.5px solid var(--input-border)', borderRight: '1.5px solid var(--input-border)', lineHeight: '44px', background: '#FAF8F5' }}>
                {form.quantity}
              </div>
              <button
                type="button"
                onClick={() => update({ quantity: form.quantity + 1 })}
                style={{ width: 44, height: 44, background: '#fff', border: 'none', fontSize: 20, cursor: 'pointer' }}
              >+</button>
            </div>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 16 }}>
          <label className="form-label">Job Complexity (0 to 5) <span className="req">*</span></label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <input
              type="range"
              min="0"
              max="5"
              step="0.1"
              value={form.jobComplexity}
              onChange={(e) => update({ jobComplexity: parseFloat(e.target.value) })}
              style={{ flex: 1, accentColor: '#C17F24' }}
            />
            <div style={{ fontWeight: 600, color: '#4A3D2E', minWidth: 40 }}>
              {form.jobComplexity.toFixed(1)}
            </div>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Add-ons</label>
          <div className="pill-group">
            {ADDONS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`pill-toggle ${form[key] ? 'active' : ''}`}
                onClick={() => update({ [key]: !form[key] })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginTop: 32 }}>
        <button className="btn-secondary" onClick={handleReset} type="button">Reset</button>
        <button
          className="btn-primary"
          onClick={handleSubmit}
          disabled={!valid || loading}
          type="button"
          style={{ flex: 1 }}
        >
          {loading ? 'Calculating...' : 'Calculate Quote'}
        </button>
      </div>
    </div>
  );
}

// ── Flag lookup by product type ──
const PRODUCT_FLAGS = Object.fromEntries(
  PRODUCT_TYPES.map(({ value, firedoor, specialty_door, dock_seal }) => [
    value, { firedoor, specialty_door, dock_seal },
  ])
);

function buildPayload(form) {
  const flags = PRODUCT_FLAGS[form.doorGeneral] ?? { firedoor: 0, specialty_door: 0, dock_seal: 0 };

  return {
    customer_tier:   form.customerTier,           // 0=New, 1=Recurring, 2=Loyalty
    is_lenworth:     form.isLenworth ? 1 : 0,
    distance:        parseFloat(form.distance) || 0,
    quantity:        form.quantity,
    dim_width:       parseFloat(form.dimWidth)  || 0,
    dim_height:      parseFloat(form.dimHeight) || 0,
    work_type:       form.workType,
    product_type:    form.doorGeneral,
    ...flags,
    bumpers:         form.bumpers        ? 1 : 0,
    drop_test:       form.dropTest       ? 1 : 0,
    operator_opener: form.operatorOpener ? 1 : 0,
    replace:         form.workType.includes('Replace') ? 1 : 0,
    remove:          form.workType.includes('Remove')  ? 1 : 0,
    install:         form.workType.includes('Install') ? 1 : 0,
    job_complexity:  form.jobComplexity,
  };
}
