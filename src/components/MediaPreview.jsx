import React, { useState, useEffect } from 'react';
import { Image as ImageIcon, Video, Music, AlertCircle } from 'lucide-react';

export default function MediaPreview({ mediaUrl, mediaType = 'image', alt = 'Media preview' }) {
  const [hasError, setHasError] = useState(false);

  // Reset error state if the media source changes (new analysis)
  useEffect(() => {
    setHasError(false);
  }, [mediaUrl]);

  if (!mediaUrl) {
    return null;
  }

  if (hasError) {
    // For data: URLs the preview simply isn't displayable in an <img> cross-origin context;
    // show a neutral placeholder instead of an alarming error.
    const Icon = mediaType === 'video' ? Video : mediaType === 'audio' ? Music : ImageIcon;
    return (
      <div className="media-preview-container" style={{ padding: '40px 20px', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <Icon size={28} aria-hidden="true" />
          <span style={{ fontSize: '13px' }}>Preview unavailable for this media type</span>
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
        />
      )}

      {mediaType === 'video' && (
        <video
          src={mediaUrl}
          controls
          className="media-preview-video"
          onError={() => setHasError(true)}
        >
          Your browser does not support the video tag.
        </video>
      )}

      {mediaType === 'audio' && (
        <div className="audio-preview-box">
          <div className="audio-waveform-simulation">
            {[...Array(24)].map((_, i) => (
              <div
                key={i}
                className="wave-bar"
                style={{
                  animationDelay: `${(i % 5) * 0.2}s`,
                  height: `${Math.sin(i) * 16 + 24}px`
                }}
              />
            ))}
          </div>
          <audio
            src={mediaUrl}
            controls
            style={{ width: '100%', maxWidth: '400px' }}
            onError={() => setHasError(true)}
          />
        </div>
      )}
    </div>
  );
}
