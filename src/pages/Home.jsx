import React, { useState, useEffect } from 'react';
import { Shield, Sparkles, Cpu, Brain, CheckCircle2, Loader2, AlertTriangle, FileText } from 'lucide-react';
import FileUpload from '../components/FileUpload.jsx';
import { analyzeMedia } from '../services/api.js';

const SCAN_STEPS_MAP = {
  text: [
    'Initializing linguistic forensic pipeline...',
    'Analyzing semantic perplexity and syntactic burstiness...',
    'Probing for formulaic LLM tropes and cadence patterns...',
    'Synthesizing forensic text assessment & saving to Supabase...'
  ],
  audio: [
    'Initializing acoustic speech forensic probe...',
    'Analyzing spectral harmonics & robotic vocoder artifacts...',
    'Evaluating speech prosody, cadence, and cloning hallmarks...',
    'Generating experimental audio assessment & saving to Supabase...'
  ],
  video: [
    'Initializing video keyframe extraction pipeline...',
    'Probing keyframe with Sightengine GenAI neural detector...',
    'Cross-checking with Google Gemini multimodal reasoning engine...',
    'Calculating Sightengine-weighted consensus & saving to Supabase...'
  ],
  image: [
    'Initializing multi-modal forensic pipeline...',
    'Probing Sightengine GenAI model for diffusion & GAN artifacts...',
    'Cross-checking with Google Gemini multimodal reasoning engine...',
    'Calculating Sightengine-weighted consensus & saving to Supabase...'
  ]
};

export default function Home({ onAnalysisComplete }) {
  const [isLoading, setIsLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [scanPreviewUrl, setScanPreviewUrl] = useState(null);
  const [scanTextSnippet, setScanTextSnippet] = useState(null);
  const [activeScanType, setActiveScanType] = useState('image');
  const [errorMessage, setErrorMessage] = useState('');

  // Dynamic steps based on media type
  const currentSteps = SCAN_STEPS_MAP[activeScanType] || SCAN_STEPS_MAP.image;

  // Step simulation during analysis
  useEffect(() => {
    let interval;
    if (isLoading) {
      setCurrentStepIndex(0);
      interval = setInterval(() => {
        setCurrentStepIndex((prev) => (prev < currentSteps.length - 1 ? prev + 1 : prev));
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading, currentSteps]);

  const handleStartAnalysis = async (payload) => {
    setIsLoading(true);
    setErrorMessage('');
    const type = payload.mediaType || 'image';
    setActiveScanType(type);

    const localPreviewUrl = payload.videoPreviewUrl || payload.fileData || payload.mediaUrl || null;
    setScanPreviewUrl(localPreviewUrl);
    setScanTextSnippet(payload.textInput || null);

    try {
      const result = await analyzeMedia(payload);
      // Enrich result with the local preview so MediaPreview renders immediately
      onAnalysisComplete({
        ...result,
        _localPreviewUrl: localPreviewUrl,
        _localText: payload.textInput || null,
        input_mode: payload.inputMode || 'file',
        media_type: type
      });
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
          <span>TruthLens v1.1 · Multi-Modal Forensic Detection</span>
        </div>

        <h1 id="hero-main-title" className="hero-title">
          Verify Media Authenticity with{' '}
          <span className="text-gradient">Independent AI Signals</span>
        </h1>

        <p className="hero-subtitle">
          TruthLens leverages Sightengine's specialized pixel neural probe (70% weight) alongside Google Gemini's
          multimodal and linguistic reasoning (30% weight) to synthesize a reliability-weighted verdict with plain-language explanation.
        </p>

        {/* Feature badge pills */}
        <div className="features-badge-row" role="list" aria-label="Key detection features">
          <div className="feature-pill-card" role="listitem">
            <Cpu size={16} style={{ color: 'var(--accent-cyan)' }} aria-hidden="true" />
            <span>
              <strong>Engine 1:</strong> Sightengine GenAI (70% Weight)
            </span>
          </div>
          <div className="feature-pill-card" role="listitem">
            <Brain size={16} style={{ color: 'var(--accent-indigo)' }} aria-hidden="true" />
            <span>
              <strong>Engine 2:</strong> Gemini Flash (30% Weight + Text)
            </span>
          </div>
          <div className="feature-pill-card" role="listitem">
            <Shield size={16} style={{ color: 'var(--status-real)' }} aria-hidden="true" />
            <span>
              <strong>Coverage:</strong> Image · Video · Audio · Text
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
          className="glass-card upload-container scanner-overlay fade-in"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          {scanPreviewUrl && activeScanType !== 'text' && (
            <div className="scanner-media-preview-box">
              <img src={scanPreviewUrl} alt="Scanning preview in progress" className="scanner-img" />
              <div className="laser-beam" aria-hidden="true" />
            </div>
          )}

          {scanTextSnippet && activeScanType === 'text' && (
            <div className="scanner-text-snippet-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', color: 'var(--accent-cyan)', fontSize: '12px' }}>
                <FileText size={14} aria-hidden="true" />
                <span>Text Stream Probing</span>
              </div>
              <p className="scanner-text-content">
                "{scanTextSnippet.slice(0, 180)}..."
              </p>
              <div className="laser-beam-horizontal" aria-hidden="true" />
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '20px' }}>
            <Loader2 size={24} className="spin" style={{ color: 'var(--accent-cyan)' }} aria-hidden="true" />
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Forensic Inspection In Progress</h2>
          </div>

          <div className="progress-steps-list">
            {currentSteps.map((step, index) => {
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

          <div className="scanning-skeleton-bar" aria-hidden="true" />

          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Processing multi-modal signals · Typically takes 3-12 seconds
          </p>
        </div>
      ) : (
        <FileUpload onAnalyze={handleStartAnalysis} isLoading={isLoading} />
      )}
    </div>
  );
}
