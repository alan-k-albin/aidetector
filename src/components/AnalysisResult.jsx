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
  Sparkles,
  AlertTriangle,
  Info,
  Sliders
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
    _localText,
    media_type = 'image',
    input_mode = 'file',
    created_at
  } = result;

  const isText = media_type === 'text';
  const isAudio = media_type === 'audio';

  // For uploaded files: use the base64 data URL preserved client-side.
  // For URL submissions or shared permalink views: use the remote media_url.
  const previewSrc = _localPreviewUrl || (isText ? (_localText || media_url) : media_url);

  const seScore = breakdown?.sightengine_score ?? (result.sightengine_result?.score ?? 0);
  const gemScore = breakdown?.gemini_score ?? (result.gemini_result?.score ?? 0);
  const sePct = Math.round(seScore * 100);
  const gemPct = Math.round(gemScore * 100);

  // Whether each engine actually returned a real result
  const seAvailable = result.sightengine_result?.success !== false && !result.sightengine_result?.skipped;
  const gemAvailable = result.gemini_result?.success !== false;

  // Weights
  const seWeightPct = Math.round((breakdown?.sightengine_weight ?? (isText ? 0 : 0.70)) * 100);
  const gemWeightPct = Math.round((breakdown?.gemini_weight ?? (isText ? 1.0 : 0.30)) * 100);

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
    <section className="results-container fade-in" aria-label="Forensic Analysis Results">
      {/* Top action toolbar */}
      <div className="results-header-bar">
        <button
          type="button"
          className="btn-secondary"
          onClick={onReset}
          aria-label="Scan another media file"
        >
          <RefreshCw size={15} aria-hidden="true" />
          <span>Analyze New Input</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="file-type-pill" style={{ textTransform: 'capitalize' }}>
            {media_type} Mode ({input_mode})
          </span>
          {id && (
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCopyLink}
              aria-label="Copy permalink for this analysis"
            >
              {copied ? <Check size={15} color="#10b981" aria-hidden="true" /> : <Share2 size={15} aria-hidden="true" />}
              <span>{copied ? 'Link Copied!' : 'Share Audit'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Experimental Audio Banner */}
      {isAudio && (
        <div
          role="note"
          style={{
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fde68a',
            padding: '12px 18px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <AlertTriangle size={18} style={{ flexShrink: 0, color: 'var(--status-uncertain)' }} aria-hidden="true" />
          <span>
            <strong>Audio analysis is experimental:</strong> Speech synthesis &amp; voice cloning detection evaluates acoustic spectral markers and prosody cadence via Gemini.
          </span>
        </div>
      )}

      {/* Main Verdict Card */}
      <div className={`glass-card verdict-hero-card ${verdictClass}`}>
        <div className="verdict-info-block">
          <div className={`verdict-badge ${badgeClass}`}>
            <VerdictIcon size={16} aria-hidden="true" />
            <span>{verdict}</span>
          </div>
          <h1 className="verdict-title">{verdict}</h1>
          <p className="verdict-summary-line">
            {isText ? (
              <>
                Gemini Forensic Text Engine indicates this sample is{' '}
                <strong>{verdict.toLowerCase()}</strong> with a synthesis confidence of{' '}
                <strong>{confidence}%</strong>.
              </>
            ) : isAudio ? (
              <>
                Gemini Acoustic Forensics indicates this recording is{' '}
                <strong>{verdict.toLowerCase()}</strong> with an experimental confidence score of{' '}
                <strong>{confidence}%</strong>.
              </>
            ) : (
              <>
                Sightengine-weighted consensus (70% Sightengine / 30% Gemini) indicates this media is{' '}
                <strong>{verdict.toLowerCase()}</strong> with a reliability-weighted confidence of{' '}
                <strong>{confidence}%</strong>.
              </>
            )}
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
            <span>Inspected {isText ? 'Text Sample' : 'Media Asset'}</span>
          </div>
          <MediaPreview
            mediaUrl={previewSrc}
            textSnippet={isText ? previewSrc : null}
            mediaType={media_type}
            alt="Analyzed media"
          />
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* VERIFICATION BREAKDOWN SECTION */}
      {/* ------------------------------------------------------------- */}
      <div className="dual-engine-section">
        <div className="section-title-box">
          <h2 className="section-title">
            <Cpu size={20} style={{ color: 'var(--accent-cyan)' }} aria-hidden="true" />
            <span>
              {isText ? 'Forensic Text Detection Engine' : isAudio ? 'Acoustic Forensics Breakdown' : 'Dual-Engine Verification Breakdown'}
            </span>
          </h2>
          {breakdown?.consensus && (
            <span className="consensus-tag">{breakdown.consensus}</span>
          )}
        </div>

        {/* IF TEXT MODE: SHOW DEDICATED GEMINI TEXT CARD ONLY */}
        {isText ? (
          <div className="dual-cards-grid" style={{ gridTemplateColumns: '1fr' }}>
            <article className="glass-card engine-card" aria-label="Google Gemini Forensic Text Engine">
              <div>
                <div className="engine-header">
                  <div className="engine-info">
                    <div className="engine-avatar avatar-gemini" aria-hidden="true">
                      <Brain size={22} />
                    </div>
                    <div>
                      <h3 className="engine-name">Google Gemini Flash (Text Forensics)</h3>
                      <div className="engine-role">Signal 1 · Large Language Model Syntactic &amp; Semantic Probing</div>
                    </div>
                  </div>
                  <span className="file-type-pill" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' }}>
                    100% Signal Weight
                  </span>
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
                      <span className="engine-score-unit">Synthetic Likelihood</span>
                    </div>

                    <div
                      className="confidence-bar-track"
                      role="progressbar"
                      aria-valuenow={gemPct}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label="Gemini Text Likelihood Judgment"
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
                  <div className="engine-unavailable" role="status">
                    <Sparkles size={16} aria-hidden="true" style={{ opacity: 0.5 }} />
                    <span>Service Unavailable</span>
                  </div>
                )}
              </div>

              <p className="engine-description">
                Evaluates perplexity, burstiness (sentence rhythm variations), formulaic transitions, cliché
                patterns, and syntactic predictability characteristic of models like GPT-4, Claude, and Gemini.
              </p>
            </article>
          </div>
        ) : (
          /* FOR IMAGE, VIDEO, OR AUDIO: DUAL CARDS */
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
                  {seAvailable && (
                    <span className="file-type-pill" style={{ background: 'rgba(0, 242, 254, 0.15)', color: 'var(--accent-cyan)' }}>
                      Weight: {seWeightPct}%
                    </span>
                  )}
                </div>

                {seAvailable ? (
                  <>
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
                  </>
                ) : (
                  <div className="engine-unavailable" role="status">
                    <Info size={16} aria-hidden="true" style={{ opacity: 0.6 }} />
                    <span>{isAudio ? 'Skipped for Audio' : 'Signal Unavailable'}</span>
                    <span className="engine-unavailable-sub">
                      {isAudio ? 'Specialized for visual pixel artifacts' : 'Assessment fell back to 100% Gemini'}
                    </span>
                  </div>
                )}
              </div>

              <p className="engine-description">
                Scans low-level pixel frequency matrices, GAN latent fingerprints, and diffusion noise signatures
                independent of metadata. Allocated ~70% weight due to empirical benchmark accuracy.
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
                  {gemAvailable && (
                    <span className="file-type-pill" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc' }}>
                      Weight: {gemWeightPct}%
                    </span>
                  )}
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
                    <span className="engine-unavailable-sub">Assessment fell back to 100% Sightengine</span>
                  </div>
                )}
              </div>

              <p className="engine-description">
                Examines anatomical coherence, lighting physics, contextual logic, and cross-checks against
                Sightengine's score to articulate plain-language forensic reasoning.
              </p>
            </article>
          </div>
        )}
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
