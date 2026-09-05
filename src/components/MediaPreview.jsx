import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Video, Music, FileText, AlertCircle } from 'lucide-react';

export default function MediaPreview({
  mediaUrl,
  textSnippet,
  mediaType = 'image',
  alt = 'Analyzed media'
}) {
  const [hasError, setHasError] = useState(false);

  // Reset error state if media source changes
  useEffect(() => {
    setHasError(false);
  }, [mediaUrl, textSnippet]);

  // If text mode, render a clean text inspection card
  if (mediaType === 'text' || textSnippet) {
    const textToShow = textSnippet || mediaUrl || '';
    const wordCount = textToShow.trim().split(/\s+/).filter(Boolean).length;
    const charCount = textToShow.length;

    return (
      <div className="media-preview-container text-preview-container">
        <div className="text-preview-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={15} style={{ color: 'var(--accent-cyan)' }} aria-hidden="true" />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Inspected Text Excerpt
            </span>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {wordCount} words · {charCount} characters
          </div>
        </div>
        <blockquote className="text-preview-quote">
          "{textToShow}"
        </blockquote>
      </div>
    );
  }

  if (!mediaUrl) {
    return null;
  }

  if (hasError) {
    const Icon = mediaType === 'video' ? Video : mediaType === 'audio' ? Music : ImageIcon;
    return (
      <div className="media-preview-container" style={{ padding: '36px 20px', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Icon size={28} aria-hidden="true" style={{ opacity: 0.6 }} />
          <span style={{ fontSize: '13px' }}>Preview unavailable for this {mediaType} source</span>
        </div>
      </div>
    );
  }

  return (
    <div className="media-preview-container">
      {mediaType === 'image' && (
        <img
          src={mediaUrl}
          alt={alt}
          className="media-preview-img"
          onError={() => setHasError(true)}
          loading="lazy"
        />
      )}

      {mediaType === 'video' && (
        <video
          src={mediaUrl}
          controls
          playsInline
          className="media-preview-video"
          onError={() => setHasError(true)}
        >
          Your browser does not support video playback.
        </video>
      )}

      {mediaType === 'audio' && (
        <div className="audio-preview-box">
          <div className="audio-waveform-simulation" aria-hidden="true">
            {[...Array(24)].map((_, i) => (
              <div
                key={i}
                className="wave-bar"
                style={{
                  animationDelay: `${(i % 6) * 0.15}s`,
                  height: `${Math.sin(i * 0.5) * 16 + 24}px`
                }}
              />
            ))}
          </div>
          <audio
            src={mediaUrl}
            controls
            style={{ width: '100%', maxWidth: '440px' }}
            onError={() => setHasError(true)}
          />
        </div>
      )}
    </div>
  );
}
