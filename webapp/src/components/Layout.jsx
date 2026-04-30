import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children }) {
  const { pathname } = useLocation();

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="app-logo">
            <div className="app-logo-icon">🚪</div>
            <div>
              <div className="app-logo-text">Kornelsen's Solutions Inc.</div>
              <div className="app-logo-sub">Operations Toolkit</div>
            </div>
          </Link>
          <nav className="app-nav">
            <Link to="/" className={`nav-link ${pathname === '/' ? 'active' : ''}`}>
              📋 Work Journal
            </Link>
            <Link to="/quote" className={`nav-link ${pathname.startsWith('/quote') ? 'active' : ''}`}>
              💰 Quote Calculator
            </Link>
          </nav>
        </div>
      </header>
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}
