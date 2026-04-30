import React from 'react';

const fmt = (n) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n);

export default function QuoteResult({ result, onReset }) {
  const { unit_price, total_price, lower_bound, upper_bound } = result;
  const totalLower = Math.round(total_price * 0.90);
  const totalUpper = Math.round(total_price * 1.10);

  return (
    <div className="quote-result">
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 64, marginBottom: 16, lineHeight: 1 }}>✅</div>
        <h2 className="page-title">Your Quote is Ready</h2>
        <p className="page-subtitle">Estimated price based on your job details.</p>
      </div>

      <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Estimated Unit Price
          </div>
          <div className="price-display">{fmt(unit_price)}</div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>
            Per-unit range: {fmt(lower_bound)} – {fmt(upper_bound)} (±10%)
          </div>
        </div>

        <div style={{ height: 1.5, background: 'var(--card-border)', margin: '32px 0' }} />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Estimate</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: '8px 0 4px' }}>{fmt(total_price)}</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#6B5E4A' }}>
              {fmt(totalLower)} – {fmt(totalUpper)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Confidence</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--success)', margin: '8px 0 4px' }}>
              ±10%
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#6B5E4A' }}>based on historical data</div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '32px auto 0' }}>
        <button className="btn-primary" onClick={onReset} type="button">
          Start New Quote
        </button>
      </div>
    </div>
  );
}
