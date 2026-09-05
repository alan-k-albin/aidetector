import React, { useState, useEffect } from 'react';
import { Eye, Shield, Cpu, ExternalLink, Sun, Moon } from 'lucide-react';
import Home from './pages/Home.jsx';
import Results from './pages/Results.jsx';

export default function App() {
  const [currentResult, setCurrentResult] = useState(null);
  const [analysisId, setAnalysisId] = useState(null);
  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'results'
  const [theme, setTheme] = useState('dark'); // 'dark' | 'light' (defaults to dark mode, tracked in React state)

  // Read ?id= query param on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    if (idParam) {
      setAnalysisId(idParam);
      setCurrentPage('results');
    }
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const handleAnalysisComplete = (result) => {
    setCurrentResult(result);
    setAnalysisId(result.id);
    setCurrentPage('results');
    // Update URL without full refresh for clean shareability
    if (result.id && !result.id.startsWith('local-')) {
      window.history.pushState({}, '', `/?id=${result.id}`);
    }
  };

  const handleReset = () => {
    setCurrentResult(null);
    setAnalysisId(null);
    setCurrentPage('home');
    window.history.pushState({}, '', '/');
  };

  return (
    <div className="app-container" data-theme={theme}>
      {/* Navbar */}
      <header className="navbar" role="banner">
        <div className="nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className="brand-logo"
              onClick={handleReset}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleReset()}
              aria-label="TruthLens Home"
            >
              <div className="brand-icon" aria-hidden="true">
                <Eye size={20} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="brand-name">TruthLens</span>
                <span className="brand-tag">v1.1</span>
              </div>
            </div>

            {/* Accessible Theme Toggle Button next to branding */}
            <button
              type="button"
              className="theme-toggle-btn"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? (
                <Sun size={17} className="theme-icon sun" aria-hidden="true" />
              ) : (
                <Moon size={17} className="theme-icon moon" aria-hidden="true" />
              )}
              <span className="theme-toggle-label">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
          </div>

          <div className="nav-badges">
            <div className="nav-pill">
              <span className="status-dot" aria-hidden="true" />
              <span>Sightengine (70%) + Gemini (30%)</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-content" role="main">
        {currentPage === 'home' ? (
          <Home onAnalysisComplete={handleAnalysisComplete} />
        ) : (
          <Results
            result={currentResult}
            analysisId={analysisId}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="footer" role="contentinfo">
        <p>
          TruthLens v1.1 — Dual-Signal AI Media Detection Platform · Powered by{' '}
          <strong>Sightengine GenAI (70%)</strong> &amp; <strong>Google Gemini Multimodal (30%)</strong> · Persisted on{' '}
          <strong>Supabase</strong>
        </p>
      </footer>
    </div>
  );
}
