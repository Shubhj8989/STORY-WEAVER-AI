import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, Loader, ChevronRight, RefreshCw } from 'lucide-react';
import { useStory } from '../context/StoryContext';
import { checkContinuity, getContinuityErrors, resolveError } from '../api/client';
import type { ContinuityError } from '../api/client';

const SeverityConfig = {
  high: { label: '🔴 High', class: 'severity-high', bg: 'rgba(239,68,68,0.05)' },
  medium: { label: '🟡 Medium', class: 'severity-medium', bg: 'rgba(245,158,11,0.05)' },
  low: { label: '🟢 Low', class: 'severity-low', bg: 'rgba(16,185,129,0.05)' },
};

const ContinuityPage: React.FC = () => {
  const { activeStory } = useStory();
  const [chapterNumber, setChapterNumber] = useState(11);
  const [chapterTitle, setChapterTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkResult, setCheckResult] = useState<any>(null);
  const [allErrors, setAllErrors] = useState<ContinuityError[]>([]);
  const [loadingErrors, setLoadingErrors] = useState(false);
  const [tab, setTab] = useState<'check' | 'history'>('check');

  const loadErrors = async () => {
    if (!activeStory) return;
    setLoadingErrors(true);
    getContinuityErrors(activeStory.id)
      .then(r => setAllErrors(r.data))
      .finally(() => setLoadingErrors(false));
  };

  useEffect(() => {
    if (activeStory) loadErrors();
  }, [activeStory]);

  const handleCheck = async () => {
    if (!activeStory || !content.trim()) return;
    setLoading(true);
    setCheckResult(null);
    try {
      const res = await checkContinuity({
        story_id: activeStory.id,
        chapter_number: chapterNumber,
        chapter_title: chapterTitle,
        content,
      });
      setCheckResult(res.data);
      await loadErrors();
    } catch (e: any) {
      setCheckResult({ error: e?.response?.data?.detail || 'Check failed' });
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (errorId: string) => {
    await resolveError(errorId);
    await loadErrors();
  };

  const unresolvedCount = allErrors.filter(e => !e.resolved).length;
  const highCount = allErrors.filter(e => e.severity === 'high' && !e.resolved).length;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2>Continuity Checker</h2>
            <p>Validate new chapters against the established Story Bible</p>
          </div>
          {unresolvedCount > 0 && (
            <div style={{
              display: 'flex', gap: 8, alignItems: 'center',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              padding: '8px 16px', borderRadius: 'var(--radius-md)'
            }}>
              <AlertTriangle size={14} style={{ color: 'var(--accent-red)' }} />
              <span style={{ color: 'var(--accent-red)', fontSize: 13, fontWeight: 600 }}>
                {unresolvedCount} unresolved issue{unresolvedCount !== 1 ? 's' : ''}
                {highCount > 0 && ` · ${highCount} critical`}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="page-body">
        {!activeStory ? (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3>No story selected</h3>
          </div>
        ) : (
          <>
            <div className="tab-bar">
              <button className={`tab-btn ${tab === 'check' ? 'active' : ''}`} onClick={() => setTab('check')}>
                Check New Chapter
              </button>
              <button className={`tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
                Error History
                {unresolvedCount > 0 && (
                  <span style={{
                    marginLeft: 6, background: 'var(--accent-red)', color: 'white',
                    borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700
                  }}>{unresolvedCount}</span>
                )}
              </button>
            </div>

            {/* Check Tab */}
            {tab === 'check' && (
              <div style={{ maxWidth: 800 }}>
                <div className="card" style={{ marginBottom: 20 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Chapter to Check</label>
                      <input
                        type="number"
                        className="form-input"
                        value={chapterNumber}
                        min={1}
                        onChange={e => setChapterNumber(parseInt(e.target.value) || 1)}
                      />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Chapter Title</label>
                      <input
                        className="form-input"
                        placeholder="Optional"
                        value={chapterTitle}
                        onChange={e => setChapterTitle(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Chapter Content</label>
                    <textarea
                      className="form-textarea"
                      rows={10}
                      placeholder="Paste your new chapter draft here. The AI will compare it against the Story Bible and flag any contradictions..."
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      style={{ minHeight: 220 }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button
                      className="btn btn-primary btn-lg"
                      onClick={handleCheck}
                      disabled={loading || !content.trim()}
                    >
                      {loading ? (
                        <><Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> Analyzing...</>
                      ) : (
                        <><AlertTriangle size={16} /> Check Continuity <ChevronRight size={16} /></>
                      )}
                    </button>
                  </div>
                </div>

                {/* Results */}
                {checkResult && (
                  <div className="fade-in">
                    {checkResult.error ? (
                      <div className="alert alert-error">{checkResult.error}</div>
                    ) : checkResult.errors_found === 0 ? (
                      <div className="alert alert-success" style={{ alignItems: 'center' }}>
                        <CheckCircle size={18} />
                        <div>
                          <strong>No continuity errors detected!</strong>
                          <p style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
                            Chapter {checkResult.chapter} is consistent with the established Story Bible.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="alert alert-error" style={{ marginBottom: 16, alignItems: 'center' }}>
                          <AlertTriangle size={18} />
                          <div>
                            <strong>{checkResult.errors_found} continuity issue{checkResult.errors_found !== 1 ? 's' : ''} detected</strong>
                            <p style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>in {checkResult.chapter}</p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {checkResult.errors.map((err: any) => (
                            <ErrorCard key={err.id} error={err} onResolve={handleResolve} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* History Tab */}
            {tab === 'history' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      Total: <strong style={{ color: 'var(--text-primary)' }}>{allErrors.length}</strong>
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--accent-red)' }}>
                      Unresolved: <strong>{unresolvedCount}</strong>
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--accent-emerald)' }}>
                      Resolved: <strong>{allErrors.length - unresolvedCount}</strong>
                    </span>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={loadErrors}>
                    <RefreshCw size={12} /> Refresh
                  </button>
                </div>

                {loadingErrors ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
                    <div className="loading-spinner" style={{ width: 28, height: 28 }} />
                  </div>
                ) : allErrors.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state-icon">✅</div>
                    <h3>No continuity errors found</h3>
                    <p>Run a continuity check on a new chapter draft</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {allErrors.map(err => (
                      <ErrorCard key={err.id} error={err} onResolve={handleResolve} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const ErrorCard: React.FC<{ error: any; onResolve: (id: string) => void }> = ({ error, onResolve }) => {
  const sev = SeverityConfig[error.severity as keyof typeof SeverityConfig] || SeverityConfig.medium;
  return (
    <div className={`error-card ${error.resolved ? 'resolved' : ''}`} style={{ background: sev.bg }}>
      <div className="error-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span className={`severity-badge ${sev.class}`}>{sev.label}</span>
            <span className="tag tag-purple" style={{ fontSize: 10 }}>{error.error_type?.replace(/_/g, ' ')}</span>
            {error.chapter && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{error.chapter}</span>}
            {error.resolved && <span className="tag tag-emerald" style={{ fontSize: 10 }}>✓ resolved</span>}
          </div>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{error.description}</p>
        </div>
        {!error.resolved && (
          <button className="btn btn-sm btn-secondary" onClick={() => onResolve(error.id)}>
            <CheckCircle size={12} /> Resolve
          </button>
        )}
      </div>

      <div className="error-fact conflict">
        <strong>🔴 New chapter claims:</strong>
        {error.conflicting_fact}
      </div>
      <div className="error-fact original">
        <strong>🟢 Previously established:</strong>
        {error.original_fact}
      </div>
    </div>
  );
};

export default ContinuityPage;
