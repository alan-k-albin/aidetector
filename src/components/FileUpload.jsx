import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  Link as LinkIcon,
  Sparkles,
  Image as ImageIcon,
  Video,
  Music,
  ArrowRight,
  FileText,
  AlertCircle,
  HelpCircle
} from 'lucide-react';

const SAMPLE_PRESETS = [
  {
    id: 'ai-portrait',
    name: 'Midjourney Portrait',
    type: 'image',
    category: 'AI Synthetic',
    mode: 'link',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    description: 'Synthetic surreal digital art'
  },
  {
    id: 'real-camera',
    name: 'Authentic DSLR Photo',
    type: 'image',
    category: 'Human Camera',
    mode: 'link',
    url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80',
    description: 'Real Nike sneaker photograph'
  },
  {
    id: 'ai-text-sample',
    name: 'AI Generated Essay',
    type: 'text',
    category: 'AI Synthetic',
    mode: 'text',
    text: 'In the rapidly evolving tapestry of modern technological paradigms, it is crucial to delve into the multidimensional nuances of artificial intelligence. Furthermore, this dynamic interplay serves as a testament to human ingenuity, facilitating seamless integration across disparate sectors and heralding a transformative dawn.',
    description: 'Formulaic LLM phrasing with typical tropes'
  },
  {
    id: 'human-text-sample',
    name: 'Human Casual Email',
    type: 'text',
    category: 'Human Authentic',
    mode: 'text',
    text: 'Hey Sarah! Just wanted to check if you got my email about the camping trip next weekend. We still need to book the campsite before spots fill up, and Dave said his car might be in the shop on Friday. Let me know if you can drive instead!',
    description: 'Natural human sentence burstiness and colloquial phrasing'
  }
];

export default function FileUpload({ onAnalyze, isLoading }) {
  // Input mode tabs: 'upload' | 'link' | 'text'
  const [activeTab, setActiveTab] = useState('upload');
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [textInput, setTextInput] = useState('');
  const [fileError, setFileError] = useState('');
  const fileInputRef = useRef(null);

  /**
   * Helper to extract a representative frame from a video file client-side.
   */
  const extractVideoFrame = (file) => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;

      video.onloadeddata = () => {
        video.currentTime = Math.min(1.0, video.duration > 0.5 ? 0.5 : 0);
      };

      video.onseeked = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frameData = canvas.toDataURL('image/jpeg', 0.85);
          resolve({ frameData, objectUrl });
        } catch (err) {
          resolve({ frameData: null, objectUrl });
        }
      };

      video.onerror = () => {
        resolve({ frameData: null, objectUrl });
      };
    });
  };

  const handleFileChange = async (file) => {
    if (!file) return;
    setFileError('');

    // Check size limit for serverless upload (4.5 MB limit)
    if (file.size > 4.5 * 1024 * 1024) {
      setFileError('File exceeds the 4.5MB limit for direct upload. Please select a smaller file or use the Media Link tab.');
      return;
    }

    let detectedType = 'image';
    if (file.type.startsWith('video/')) detectedType = 'video';
    else if (file.type.startsWith('audio/')) detectedType = 'audio';

    if (detectedType === 'video') {
      try {
        const { frameData, objectUrl } = await extractVideoFrame(file);
        if (frameData) {
          onAnalyze({
            fileData: frameData,
            mediaType: 'video',
            inputMode: 'file',
            fileName: file.name,
            videoPreviewUrl: objectUrl
          });
          return;
        }
      } catch (e) {
        console.warn('Frame extraction fallback:', e);
      }
    }

    const reader = new FileReader();
    reader.onload = () => {
      onAnalyze({
        fileData: reader.result,
        mediaType: detectedType,
        inputMode: 'file',
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
    const cleanUrl = urlInput.trim();
    if (!cleanUrl) return;

    let detectedType = mediaType;
    const lower = cleanUrl.toLowerCase();
    if (lower.match(/\.(mp4|webm|mov)$/)) detectedType = 'video';
    else if (lower.match(/\.(mp3|wav|ogg|m4a)$/)) detectedType = 'audio';

    onAnalyze({
      mediaUrl: cleanUrl,
      mediaType: detectedType,
      inputMode: 'link',
      fileName: cleanUrl.split('/').pop() || 'Remote Media'
    });
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    const cleanText = textInput.trim();
    if (!cleanText) return; // should not reach here (button disabled when empty)
    setFileError('');

    onAnalyze({
      textInput: cleanText,
      mediaType: 'text',
      inputMode: 'text',
      fileName: 'Text Analysis Sample'
    });
  };

  const handleSelectSample = (sample) => {
    setFileError('');
    if (sample.mode === 'text') {
      setActiveTab('text');
      setTextInput(sample.text);
      onAnalyze({
        textInput: sample.text,
        mediaType: 'text',
        inputMode: 'text',
        fileName: sample.name
      });
    } else {
      setActiveTab('link');
      setUrlInput(sample.url);
      setMediaType(sample.type);
      onAnalyze({
        mediaUrl: sample.url,
        mediaType: sample.type,
        inputMode: 'link',
        fileName: sample.name
      });
    }
  };

  const handleKeyDownDropzone = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return (
    <section aria-label="Media Upload and Analysis Section" className="glass-card upload-container fade-in">
      {/* Accessible Input Mode Tabs: Upload File | Media Link | Text */}
      <div className="upload-tabs" role="tablist" aria-label="Input mode selection">
        <button
          type="button"
          id="tab-upload"
          role="tab"
          aria-selected={activeTab === 'upload'}
          aria-controls="panel-upload"
          className={`upload-tab ${activeTab === 'upload' ? 'active' : ''}`}
          onClick={() => { setActiveTab('upload'); setFileError(''); }}
        >
          <UploadCloud size={17} aria-hidden="true" />
          <span>Upload File</span>
        </button>

        <button
          type="button"
          id="tab-link"
          role="tab"
          aria-selected={activeTab === 'link'}
          aria-controls="panel-link"
          className={`upload-tab ${activeTab === 'link' ? 'active' : ''}`}
          onClick={() => { setActiveTab('link'); setFileError(''); }}
        >
          <LinkIcon size={16} aria-hidden="true" />
          <span>Media Link</span>
        </button>

        <button
          type="button"
          id="tab-text"
          role="tab"
          aria-selected={activeTab === 'text'}
          aria-controls="panel-text"
          className={`upload-tab ${activeTab === 'text' ? 'active' : ''}`}
          onClick={() => { setActiveTab('text'); setFileError(''); }}
        >
          <FileText size={16} aria-hidden="true" />
          <span>Text Analysis</span>
        </button>
      </div>

      {fileError && (
        <div
          role="alert"
          style={{
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#fca5a5',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0 }} aria-hidden="true" />
          <span>{fileError}</span>
        </div>
      )}

      {/* ----------------- TAB 1: FILE UPLOAD ----------------- */}
      {activeTab === 'upload' && (
        <div id="panel-upload" role="tabpanel" aria-labelledby="tab-upload" className="tab-pane-fade">
          <label htmlFor="media-file-input" style={{ display: 'none' }}>
            Choose media file to analyze
          </label>
          <input
            id="media-file-input"
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,audio/mpeg,audio/wav,audio/mp3,audio/ogg"
            aria-label="Upload image, video, or audio file for AI detection"
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
              <span className="file-type-pill">Video (Keyframe Extraction)</span>
              <span className="file-type-pill">Audio (Experimental)</span>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: MEDIA LINK ----------------- */}
      {activeTab === 'link' && (
        <div id="panel-link" role="tabpanel" aria-labelledby="tab-link" className="tab-pane-fade">
          <form onSubmit={handleUrlSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label id="media-type-label" style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                Select Media Type:
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
                Direct media link URL
              </label>
              <input
                id="media-url-input"
                type="url"
                className="input-styled"
                placeholder="https://example.com/media.jpg (Direct public file URL)"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                disabled={isLoading}
                aria-label="Direct public URL to media file"
                required
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading || !urlInput.trim()}
                aria-label="Start AI detection analysis on URL"
              >
                <span>Analyze</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Direct public URL required (e.g. ending in .jpg, .png, .mp4, .mp3). Link will be fetched and verified server-side.
            </p>
          </form>
        </div>
      )}

      {/* ----------------- TAB 3: TEXT ANALYSIS ----------------- */}
      {activeTab === 'text' && (
        <div id="panel-text" role="tabpanel" aria-labelledby="tab-text" className="tab-pane-fade">
          <form onSubmit={handleTextSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label htmlFor="text-input-field" style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Paste article, essay, or email text for LLM forensic examination:
                </label>
                <span style={{ fontSize: '12px', color: textInput.trim().length > 0 ? 'var(--text-secondary)' : 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {textInput.length} chars{textInput.trim().length > 0 && textInput.trim().length < 20 ? ' (min 20 for analysis)' : ''}
                </span>
              </div>
              <textarea
                id="text-input-field"
                className="input-styled"
                style={{
                  width: '100%',
                  minHeight: '140px',
                  resize: 'vertical',
                  padding: '14px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '14px',
                  lineHeight: '1.6'
                }}
                placeholder="Paste the text sample here to evaluate for Large Language Model (ChatGPT, Claude, Gemini) hallmarks..."
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                disabled={isLoading}
                maxLength={25000}
                aria-label="Text to analyze for AI generation"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Evaluated by Google Gemini Forensic Text Engine · Scans perplexity, burstiness &amp; synthetic cadence
              </span>

              <button
                type="submit"
                className="btn-primary"
                disabled={isLoading || textInput.trim().length === 0}
                aria-label="Analyze text for AI generation"
              >
                <span>Analyze Text</span>
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
              {sample.type === 'text' ? (
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(99, 102, 241, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent-cyan)',
                    flexShrink: 0
                  }}
                  aria-hidden="true"
                >
                  <FileText size={18} />
                </div>
              ) : (
                <img src={sample.url} alt="" aria-hidden="true" className="sample-chip-img" />
              )}
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
