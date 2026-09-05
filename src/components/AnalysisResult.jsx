import React, { useState } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  Cpu,
  Brain,
  Share2,
  RefreshCw,
  Copy,
  Check,
  FileText,
  Layers,
  Sparkles
} from 'lucide-react';
import MediaPreview from './MediaPreview.jsx';

export default function AnalysisResult({ result, onReset }) {
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const {
    id,
    verdict = 'Uncertain',
    confidence = 50,
    explanation = '',
    breakdown = {},
    media_url,
    _localPreviewUrl,
    media_type = 'image',
    created_at
  } = result;

  // For uploaded files: use the base64 data URL preserved client-side.
  // For URL submissions or shared permalink views: use the remote media_url.
  const previewSrc = _localPreviewUrl || media_url;

  const seScore = breakdown?.sightengine_score ?? (result.sightengine_result?.score ?? 0);
  const gemScore = breakdown?.gemini_score ?? (result.gemini_result?.score ?? 0);
  const sePct = Math.round(seScore * 100);
  const gemPct = Math.round(gemScore * 100);

  // Whether each engine actually returned a real result
  const seAvailable = result.sightengine_result?.success !== false;
  const gemAvailable = result.gemini_result?.success !== false;

  // Verdict style mapping
  let verdictClass = 'uncertain';
  let badgeClass = 'badge-uncertain';
  let VerdictIcon = HelpCircle;
  let barGradient = 'linear-gradient(90deg, #f59e0b, #d97706)';

  if (verdict === 'Likely AI-generated') {
    verdictClass = 'ai-generated';
    badgeClass = 'badge-ai';
    VerdictIcon = ShieldAlert;
    barGradient = 'linear-gradient(90deg, #f43f5e, #e11d48)';
  } else if (verdict === 'Likely Authentic') {
    verdictClass = 'authentic';
    badgeClass = 'badge-authentic';
    VerdictIcon = ShieldCheck;
    barGradient = 'linear-gradient(90deg, #10b981, #059669)';
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/?id=${id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section className="results-container" aria-label="Forensic Analysis Results">
      {/* Top action toolbar */}
      <div className="results-header-bar">
        <button
          type="button"
          className="btn-secondary"
          onClick={onReset}
          aria-label="Scan another media file"
        >
          <RefreshCw size={15} aria-hidden="true" />
          <span>Analyze New Media</span>
        </button>

        {id && (
          <button
            type="button"
            className="btn-secondary"
            onClick={handleCopyLink}
            aria-label="Copy permalink for this analysis"
          >
            {copied ? <Check size={15} color="#10b981" aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
            <span>{copied ? 'Link Copied!' : 'Share Analysis Link'}</span>
          </button>
        )}
      </div>

      {/* Main Verdict Card */}
      <div className={`glass-card verdict-hero-card ${verdictClass}`}>
        <div className="verdict-info-block">
          <div className={`verdict-badge ${badgeClass}`}>
            <VerdictIcon size={16} aria-hidden="true" />
            <span>{verdict}</span>
          </div>
          <h1 className="verdict-title">{verdict}</h1>
          <p className="verdict-summary-line">
            Dual-detection consensus indicates this media is{' '}
            <strong>{verdict.toLowerCase()}</strong> with a weighted reliability score of{' '}
            <strong>{confidence}%</strong>.
          </p>

          {/* Confidence linear progress bar */}
          <div className="confidence-bar-wrapper">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
              <span>Synthesis Confidence</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-primary)' }}>{confidence}%</span>
            </div>
            <div
              className="confidence-bar-track"
              role="progressbar"
              aria-valuenow={confidence}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Synthesis Confidence percentage"
            >
              <div
                className="confidence-bar-fill"
                style={{
                  width: `${confidence}%`,
                  background: barGradient
                }}
              />
            </div>
          </div>
        </div>

        {/* Confidence Gauge Badge */}
        <div className="confidence-gauge-box">
          <div className="confidence-number">{confidence}%</div>
          <div className="confidence-label">Confidence Score</div>
        </div>
      </div>

      {/* Media Inspection Preview */}
      {previewSrc && (
        <div style={{ marginBottom: '28px' }}>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={14} aria-hidden="true" />
            <span>Inspected Media Asset</span>
          </div>
          <MediaPreview mediaUrl={previewSrc} mediaType={media_type} alt="Analyzed media" />
        </div>
      )}

      {/* DUAL-ENGINE VERIFICATION SECTION — CORE DIFFERENTIATOR */}
      <div className="dual-engine-section">
        <div className="section-title-box">
          <h2 className="section-title">
            <Cpu size={20} style={{ color: 'var(--accent-cyan)' }} aria-hidden="true" />
            <span>Dual-Engine Verification Breakdown</span>
          </h2>
          {breakdown?.consensus && (
            <span className="consensus-tag">{breakdown.consensus}</span>
          )}
        </div>

        <div className="dual-cards-grid">
          {/* Engine 1: Sightengine GenAI */}
          <article className="glass-card engine-card" aria-label="Sightengine GenAI Detection Score">
            <div>
              <div className="engine-header">
                <div className="engine-info">
                  <div className="engine-avatar avatar-sightengine" aria-hidden="true">
                    <Cpu size={22} />
                  </div>
                  <div>
                    <h3 className="engine-name">Sightengine GenAI</h3>
                    <div className="engine-role">Signal 1 · Neural Pixel &amp; Artifacts Probe</div>
                  </div>
                </div>
              </div>

              <div className="engine-score-display">
                <span
                  className="engine-score-big"
                  style={{ color: seScore >= 0.65 ? 'var(--status-ai)' : seScore <= 0.35 ? 'var(--status-real)' : 'var(--status-uncertain)' }}
                >
                  {sePct}%
                </span>
                <span className="engine-score-unit">AI Probability</span>
              </div>

              <div
                className="confidence-bar-track"
                role="progressbar"
                aria-valuenow={sePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Sightengine AI Probability percentage"
                style={{ marginBottom: '16px' }}
              >
                <div
                  className="confidence-bar-fill"
                  style={{
                    width: `${sePct}%`,
                    background: seScore >= 0.65 ? 'var(--status-ai)' : seScore <= 0.35 ? 'var(--status-real)' : 'var(--status-uncertain)'
                  }}
                />
              </div>
            </div>

            <p className="engine-description">
              Scans low-level pixel frequency matrices, GAN latent fingerprints, and diffusion noise signatures
              independent of metadata.
            </p>
          </article>

          {/* Engine 2: Google Gemini Multimodal */}
          <article className="glass-card engine-card" aria-label="Google Gemini Multimodal Detection Score">
            <div>
              <div className="engine-header">
                <div className="engine-info">
                  <div className="engine-avatar avatar-gemini" aria-hidden="true">
                    <Brain size={22} />
                  </div>
                  <div>
                    <h3 className="engine-name">Google Gemini Flash</h3>
                    <div className="engine-role">Signal 2 · Semantic Reasoning &amp; Multimodal</div>
                  </div>
                </div>
              </div>

              {gemAvailable ? (
                <>
                  <div className="engine-score-display">
                    <span
                      className="engine-score-big"
                      style={{ color: gemScore >= 0.65 ? 'var(--status-ai)' : gemScore <= 0.35 ? 'var(--status-real)' : 'var(--status-uncertain)' }}
                    >
                      {gemPct}%
                    </span>
                    <span className="engine-score-unit">Likelihood Judgment</span>
                  </div>

                  <div
                    className="confidence-bar-track"
                    role="progressbar"
                    aria-valuenow={gemPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Gemini Likelihood Judgment percentage"
                    style={{ marginBottom: '16px' }}
                  >
                    <div
                      className="confidence-bar-fill"
                      style={{
                        width: `${gemPct}%`,
                        background: gemScore >= 0.65 ? 'var(--status-ai)' : gemScore <= 0.35 ? 'var(--status-real)' : 'var(--status-uncertain)'
                      }}
                    />
                  </div>
                </>
              ) : (
                <div
                  className="engine-unavailable"
                  role="status"
                  aria-label="Gemini engine currently unavailable"
                >
                  <Sparkles size={16} aria-hidden="true" style={{ opacity: 0.5 }} />
                  <span>Service Unavailable</span>
                  <span className="engine-unavailable-sub">Assessment based on Sightengine only</span>
                </div>
              )}
            </div>

            <p className="engine-description">
              Examines anatomical coherence, lighting physics, contextual logic, and cross-checks against
              Sightengine's score to articulate forensic reasoning.
            </p>
          </article>
        </div>
      </div>

      {/* Forensic Reasoning & Explanation Card */}
      <article className="glass-card explanation-card" aria-label="Forensic Reasoning Explanation">
        <div className="explanation-header">
          <FileText size={20} style={{ color: 'var(--accent-cyan)' }} aria-hidden="true" />
          <h2>Forensic Reasoning &amp; Findings</h2>
        </div>
        <p className="explanation-body">{explanation}</p>

        {result.gemini_result?.artifacts_detected && result.gemini_result.artifacts_detected.length > 0 && (
          <div className="artifacts-tag-list" aria-label="Detected forensic signals">
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '6px' }}>
              Detected Signals:
            </span>
            {result.gemini_result.artifacts_detected.map((artifact, i) => (
              <span key={i} className="artifact-pill">
                {artifact}
              </span>
            ))}
          </div>
        )}

        {created_at && (
          <div style={{ marginTop: '20px', fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            Analysis Timestamp: {new Date(created_at).toLocaleString()} · Record ID: {id}
          </div>
        )}
      </article>
    </section>
  );
}
