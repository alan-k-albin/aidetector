import React, { useState, useRef } from 'react';
import { UploadCloud, Link as LinkIcon, Sparkles, Image as ImageIcon, Video, Music, ArrowRight } from 'lucide-react';

const SAMPLE_PRESETS = [
  {
    id: 'ai-portrait',
    name: 'Midjourney Portrait',
    type: 'image',
    category: 'AI Synthetic',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    description: 'Synthetic surreal digital art'
  },
  {
    id: 'real-camera',
    name: 'Authentic DSLR Photo',
    type: 'image',
    category: 'Human Camera',
    url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    description: 'Real Nike sneaker photograph'
  },
  {
    id: 'nature-real',
    name: 'Real Landscape',
    type: 'image',
    category: 'Human Camera',
    url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=800&q=80',
    description: 'Natural mountain landscape capture'
  }
];

export default function FileUpload({ onAnalyze, isLoading }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'url'
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (file) => {
    if (!file) return;
    setFileError('');

    // Check size limit for serverless upload (4.5 MB limit)
    if (file.size > 4.5 * 1024 * 1024) {
      setFileError('File exceeds the 4.5MB limit for serverless analysis. Please select a smaller file or provide a public media URL.');
      return;
    }

    let detectedType = 'image';
    if (file.type.startsWith('video/')) detectedType = 'video';
    else if (file.type.startsWith('audio/')) detectedType = 'audio';

    const reader = new FileReader();
    reader.onload = () => {
      onAnalyze({
        fileData: reader.result,
        mediaType: detectedType,
        fileName: file.name
      });
    };
    reader.onerror = () => {
      setFileError('Failed to read selected file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    let detectedType = mediaType;
    const lower = urlInput.toLowerCase();
    if (lower.match(/\.(mp4|webm|mov)$/)) detectedType = 'video';
    else if (lower.match(/\.(mp3|wav|ogg|m4a)$/)) detectedType = 'audio';

    onAnalyze({
      mediaUrl: urlInput.trim(),
      mediaType: detectedType,
      fileName: urlInput.split('/').pop() || 'Remote Media'
    });
  };

  const handleSelectSample = (sample) => {
    onAnalyze({
      mediaUrl: sample.url,
      mediaType: sample.type,
      fileName: sample.name
    });
  };

  const handleKeyDownDropzone = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return (
    <section aria-label="Media Upload Section" className="glass-card upload-container">
      {/* Accessible Upload mode tabs */}
      <div className="upload-tabs" role="tablist" aria-label="Upload method selection">
        <button
          type="button"
          id="tab-upload"
          role="tab"
          aria-selected={activeTab === 'upload'}
          aria-controls="panel-upload"
          className={`upload-tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => setActiveTab('upload')}
        >
          <UploadCloud size={17} aria-hidden="true" />
          <span>Upload File</span>
        </button>
        <button
          type="button"
          id="tab-url"
          role="tab"
          aria-selected={activeTab === 'url'}
          aria-controls="panel-url"
          className={`upload-tab ${activeTab === 'url' ? 'active' : ''}`}
          onClick={() => setActiveTab('url')}
        >
          <LinkIcon size={16} aria-hidden="true" />
          <span>Media Link</span>
        </button>
      </div>

      {fileError && (
        <div
          role="alert"
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            padding: '10px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            marginBottom: '16px'
          }}
        >
          {fileError}
        </div>
      )}

      {activeTab === 'upload' ? (
        <div id="panel-upload" role="tabpanel" aria-labelledby="tab-upload">
          <label htmlFor="media-file-input" style={{ display: 'none' }}>
            Choose media file to analyze
          </label>
          <input
            id="media-file-input"
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/mpeg,audio/wav,audio/mp3"
            aria-label="Upload media file for AI detection"
            onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
            disabled={isLoading}
          />
          <div
            className={`dropzone ${dragOver ? 'dragover' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={handleKeyDownDropzone}
            tabIndex={0}
            role="button"
            aria-label="Dropzone: Click or press Enter to browse files, or drag and drop media file here"
          >
            <div className="dropzone-icon-box" aria-hidden="true">
              <UploadCloud size={30} />
            </div>
            <h3 className="dropzone-title">Drop your media here or click to browse</h3>
            <p className="dropzone-desc">
              Supports JPEG, PNG, WEBP, MP4, WEBM, and MP3 up to 4.5MB
            </p>
            <div className="dropzone-badge-list" aria-label="Supported media types">
              <span className="file-type-pill">Images</span>
              <span className="file-type-pill">Video</span>
              <span className="file-type-pill">Audio / Voice</span>
            </div>
          </div>
        </div>
      ) : (
        <div id="panel-url" role="tabpanel" aria-labelledby="tab-url">
          <form onSubmit={handleUrlSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label id="media-type-label" style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                Media Type:
              </label>
              <div
                role="radiogroup"
                aria-labelledby="media-type-label"
                style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={mediaType === 'image'}
                  className={`btn-secondary ${mediaType === 'image' ? 'btn-primary' : ''}`}
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                  onClick={() => setMediaType('image')}
                >
                  <ImageIcon size={14} aria-hidden="true" /> Image
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={mediaType === 'video'}
                  className={`btn-secondary ${mediaType === 'video' ? 'btn-primary' : ''}`}
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                  onClick={() => setMediaType('video')}
                >
                  <Video size={14} aria-hidden="true" /> Video
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={mediaType === 'audio'}
                  className={`btn-secondary ${mediaType === 'audio' ? 'btn-primary' : ''}`}
                  style={{ padding: '6px 14px', fontSize: '13px' }}
                  onClick={() => setMediaType('audio')}
                >
                  <Music size={14} aria-hidden="true" /> Audio
                </button>
              </div>
            </div>

            <div className="url-input-container">
              <label htmlFor="media-url-input" style={{ display: 'none' }}>
                Media URL address
              </label>
              <input
                id="media-url-input"
                type="url"
                className="input-styled"
                placeholder="https://example.com/sample-media.jpg"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={isLoading}
                aria-label="Direct URL to media file"
                required
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading || !urlInput.trim()}
                aria-label="Start AI detection analysis"
              >
                <span>Analyze</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick sample presets */}
      <div className="samples-bar">
        <div className="samples-label">
          <Sparkles size={13} style={{ color: 'var(--accent-cyan)' }} aria-hidden="true" />
          <span>Quick Test Presets (Instant Demonstration)</span>
        </div>
        <div className="samples-grid" role="list" aria-label="Sample test media">
          {SAMPLE_PRESETS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              role="listitem"
              className="sample-chip"
              onClick={() => handleSelectSample(sample)}
              aria-label={`Test with ${sample.name}, ${sample.category}`}
            >
              <img src={sample.url} alt="" aria-hidden="true" className="sample-chip-img" />
              <div className="sample-chip-info">
                <div className="sample-chip-name">{sample.name}</div>
                <div className="sample-chip-type">{sample.category}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
