import React, { useState, useEffect } from 'react';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import AnalysisResult from '../components/AnalysisResult.jsx';
import { getAnalysis } from '../services/api.js';

export default function Results({ result, analysisId, onReset }) {
  const [data, setData] = useState(result);
  const [loading, setLoading] = useState(!result && Boolean(analysisId));
  const [error, setError] = useState('');

  useEffect(() => {
    if (result) {
      setData(result);
      setLoading(false);
      return;
    }

    if (analysisId) {
      setLoading(true);
      setError('');
      getAnalysis(analysisId)
        .then((record) => {
          setData(record);
        })
        .catch((err) => {
          console.error('Failed to load analysis record:', err);
          setError(err.message || 'Could not find the requested analysis record in Supabase.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [result, analysisId]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 20px' }}>
        <Loader2 size={36} className="spin" style={{ color: 'var(--accent-cyan)', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
          Loading Analysis from Supabase...
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
          Retrieving audit record #{analysisId}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card" style={{ maxWidth: '640px', margin: '60px auto', padding: '40px', textAlign: 'center' }}>
        <AlertCircle size={44} style={{ color: '#ef4444', margin: '0 auto 16px' }} />
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '12px' }}>Analysis Not Found</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: 1.6 }}>
          {error}
        </p>
        <button type="button" className="btn-primary" onClick={onReset}>
          <ArrowLeft size={16} />
          <span>Return to Scanner</span>
        </button>
      </div>
    );
  }

  return <AnalysisResult result={data} onReset={onReset} />;
}
