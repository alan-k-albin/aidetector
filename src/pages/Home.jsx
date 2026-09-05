import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Cpu, Brain, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import FileUpload from '../components/FileUpload.jsx';
import { analyzeMedia } from '../services/api.js';

const SCAN_STEPS = [
  'Initializing multi-modal forensic pipeline...',
  'Probing Sightengine GenAI model for diffusion & GAN artifacts...',
  'Cross-checking with Google Gemini multimodal reasoning engine...',
  'Calculating reliability-weighted consensus & saving to Supabase...'
];

export default function Home({ onAnalysisComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [scanPreviewUrl, setScanPreviewUrl] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Step simulation during analysis
  useEffect(() => {
    let interval;
    if (isLoading) {
      setCurrentStepIndex(0);
      interval = setInterval(() => {
        setCurrentStepIndex((prev) => (prev < SCAN_STEPS.length - 1 ? prev + 1 : prev));
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleStartAnalysis = async (payload) => {
    setIsLoading(true);
    setErrorMessage('');
    // Keep the original client-side preview URL (base64 data URL for uploads,
    // or remote URL for links). This is never sent to the backend.
    const localPreviewUrl = payload.fileData || payload.mediaUrl || null;
    setScanPreviewUrl(localPreviewUrl);

    try {
      const result = await analyzeMedia(payload);
      // Enrich result with the local preview URL so MediaPreview can render
      // it without needing the backend to echo back the full base64 payload.
      onAnalysisComplete({ ...result, _localPreviewUrl: localPreviewUrl });
    } catch (err) {
      console.error('Analysis failed:', err);
      setErrorMessage(err.message || 'An error occurred during media analysis. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      {/* Hero section */}
      <section className="hero-section" aria-labelledby="hero-main-title">
        <div className="hero-pill">
          <Sparkles size={14} aria-hidden="true" />
          <span>Dual-Engine Deepfake & AI Media Detection</span>
        </div>

        <h1 id="hero-main-title" className="hero-title">
          Verify Media Authenticity with{' '}
          <span className="text-gradient">Two Independent AI Signals</span>
        </h1>

        <p className="hero-subtitle">
          TruthLens runs Sightengine's specialized pixel artifact neural probe alongside Google Gemini's
          multimodal reasoning to synthesize a reliability-weighted verdict with plain-language explanation.
        </p>

        {/* Feature badge pills */}
        <div className="features-badge-row" role="list" aria-label="Key detection features">
          <div className="feature-pill-card" role="listitem">
            <Cpu size={16} style={{ color: 'var(--accent-cyan)' }} aria-hidden="true" />
            <span>
              <strong>Engine 1:</strong> Sightengine GenAI
            </span>
          </div>
          <div className="feature-pill-card" role="listitem">
            <Brain size={16} style={{ color: 'var(--accent-indigo)' }} aria-hidden="true" />
            <span>
              <strong>Engine 2:</strong> Gemini 3.6 Multimodal
            </span>
          </div>
          <div className="feature-pill-card" role="listitem">
            <Shield size={16} style={{ color: 'var(--status-real)' }} aria-hidden="true" />
            <span>
              <strong>Storage:</strong> Supabase Persistent Audit
            </span>
          </div>
        </div>
      </section>

      {/* Error notification */}
      {errorMessage && (
        <div
          role="alert"
          style={{
            maxWidth: '780px',
            margin: '0 auto 24px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <AlertTriangle size={20} style={{ flexShrink: 0 }} aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Upload Zone or Scanning State */}
      {isLoading ? (
        <div
          className="glass-card upload-container scanner-overlay"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          {scanPreviewUrl && (
            <div className="scanner-media-preview-box">
              <img src={scanPreviewUrl} alt="Scanning preview in progress" className="scanner-img" />
              <div className="laser-beam" aria-hidden="true" />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
            <Loader2 size={24} className="spin" style={{ color: 'var(--accent-cyan)' }} aria-hidden="true" />
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Forensic Inspection In Progress</h2>
          </div>

          <div className="progress-steps-list">
            {SCAN_STEPS.map((step, index) => {
              const isDone = index < currentStepIndex;
              const isActive = index === currentStepIndex;
              return (
                <div
                  key={index}
                  className={`progress-step-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                >
                  {isDone ? (
                    <CheckCircle2 size={16} style={{ color: '#10b981' }} aria-hidden="true" />
                  ) : isActive ? (
                    <Loader2 size={16} className="spin" style={{ color: 'var(--accent-cyan)' }} aria-hidden="true" />
                  ) : (
                    <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.2)' }} aria-hidden="true" />
                  )}
                  <span>{step}</span>
                </div>
              );
            })}
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Processing dual model signals · Typically takes 4-8 seconds
          </p>
        </div>
      ) : (
        <FileUpload onAnalyze={handleStartAnalysis} isLoading={isLoading} />
      )}
    </div>
  );
}
