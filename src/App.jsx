import React, { useState, useEffect } from 'react';
import { Eye, Shield, Cpu, ExternalLink } from 'lucide-react';
import Home from './pages/Home.jsx';
import Results from './pages/Results.jsx';

export default function App() {
  const [currentResult, setCurrentResult] = useState(null);
  const [analysisId, setAnalysisId] = useState(null);
  const [currentPage, setCurrentPage] = useState('home'); // 'home' | 'results'

  // Read ?id= query param on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    if (idParam) {
      setAnalysisId(idParam);
      setCurrentPage('results');
    }
  }, []);

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
    <div className="app-container">
      {/* Navbar */}
      <header className="navbar">
        <div className="nav-inner">
          <div className="brand-logo" onClick={handleReset}>
            <div className="brand-icon">
              <Eye size={20} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span className="brand-name">TruthLens</span>
              <span className="brand-tag">v1.0</span>
            </div>
          </div>

          <div className="nav-badges">
            <div className="nav-pill">
              <span className="status-dot" />
              <span>Sightengine + Gemini Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-content">
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
      <footer className="footer">
        <p>
          TruthLens — Dual-Signal AI Media Detection Platform · Powered by{' '}
          <strong>Sightengine GenAI</strong> &amp; <strong>Google Gemini Multimodal</strong> · Persisted on{' '}
          <strong>Supabase</strong>
        </p>
      </footer>
    </div>
  );
}
