import React, { useEffect, useState } from 'react';
import { Brush, Drama, Lightbulb, Loader, RefreshCw, Sparkles, Target } from 'lucide-react';
import { useStory } from '../context/StoryContext';
import { getCreativeGuidance, getSceneSuggestions } from '../api/client';
import type { CreativeGuidance, CreativeInsight } from '../api/client';

const CreativePage: React.FC = () => {
  const { activeStory } = useStory();
  const [guidance, setGuidance] = useState<CreativeGuidance | null>(null);
  const [customSuggestions, setCustomSuggestions] = useState<CreativeInsight[]>([]);
  const [goal, setGoal] = useState('');
  const [draftContext, setDraftContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [error, setError] = useState('');

  const loadGuidance = async () => {
    if (!activeStory) return;
    setLoading(true);
    setError('');
    try {
      const res = await getCreativeGuidance(activeStory.id);
      setGuidance(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not load creative guidance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setGuidance(null);
    setCustomSuggestions([]);
    if (activeStory) loadGuidance();
  }, [activeStory?.id]);

  const handleSuggest = async () => {
    if (!activeStory) return;
    setSuggesting(true);
    setError('');
    try {
      const res = await getSceneSuggestions({
        story_id: activeStory.id,
        goal,
        draft_context: draftContext,
      });
      setCustomSuggestions(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Could not generate suggestions.');
    } finally {
      setSuggesting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div>
            <h2>Creative Guidance</h2>
            <p>Character arcs, style adaptation, foreshadowing, and next-scene support</p>
          </div>
          {activeStory && (
            <button className="btn btn-secondary btn-sm" onClick={loadGuidance} disabled={loading}>
              {loading ? <Loader size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <RefreshCw size={12} />}
              Refresh
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        {!activeStory ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Sparkles size={46} /></div>
            <h3>No story selected</h3>
            <p>Create or select a story to get adaptive writing guidance</p>
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}>
            <div className="loading-spinner" style={{ width: 34, height: 34 }} />
          </div>
        ) : (
          <>
            {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

            {guidance && (
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(320px, 0.85fr)', gap: 20 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <section className="card">
                    <SectionTitle icon={Drama} title="Character Arc Intelligence" />
                    {guidance.character_arcs.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Upload chapters to extract character arcs.</p>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                        {guidance.character_arcs.map(arc => (
                          <div key={arc.character} className="insight-panel">
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
                              <h4>{arc.character}</h4>
                              <span className={`tag ${arc.status === 'dead' ? 'tag-red' : 'tag-emerald'}`}>{arc.status}</span>
                            </div>
                            <Meta label="Emotional state" value={arc.emotional_state} />
                            <Meta label="Motivation" value={arc.motivation} />
                            <Meta label="Growth opportunity" value={arc.growth_opportunity} />
                            {arc.chapters.length > 0 && (
                              <div className="tag-list">
                                {arc.chapters.slice(0, 4).map(ch => <span className="tag tag-cyan" key={ch}>{ch}</span>)}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>

                  <InsightSection title="Scene Suggestion Engine" icon={Lightbulb} insights={guidance.scene_suggestions} />
                  <InsightSection title="Foreshadowing Opportunities" icon={Target} insights={guidance.foreshadowing} />
                </div>

                <aside style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <section className="card">
                    <SectionTitle icon={Brush} title="Style Adaptation" />
                    <p style={{ color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
                      {guidance.style_profile.voice_summary}
                    </p>
                    <Meta label="Pacing" value={guidance.style_profile.pacing} />
                    <Meta label="Dialogue style" value={guidance.style_profile.dialogue_style} />
                    <div className="tag-list">
                      {guidance.style_profile.tone_markers.map(marker => (
                        <span key={marker} className="tag tag-purple">{marker}</span>
                      ))}
                    </div>
                    <ul className="compact-list">
                      {guidance.style_profile.keep_consistent.map(item => <li key={item}>{item}</li>)}
                    </ul>
                  </section>

                  <section className="card">
                    <SectionTitle icon={Sparkles} title="Draft-Aware Suggestions" />
                    <div className="form-group">
                      <label className="form-label">Writing Goal</label>
                      <input
                        className="form-input"
                        value={goal}
                        onChange={e => setGoal(e.target.value)}
                        placeholder="e.g. escalate Aryan's conflict"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Draft Context</label>
                      <textarea
                        className="form-textarea"
                        value={draftContext}
                        onChange={e => setDraftContext(e.target.value)}
                        placeholder="Paste a rough scene idea or upcoming chapter notes..."
                        rows={6}
                      />
                    </div>
                    <button className="btn btn-primary" onClick={handleSuggest} disabled={suggesting}>
                      {suggesting ? <Loader size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Lightbulb size={14} />}
                      Suggest Scenes
                    </button>
                    {customSuggestions.length > 0 && (
                      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {customSuggestions.map(item => <InsightCard key={item.title} insight={item} />)}
                      </div>
                    )}
                  </section>

                  <section className="card">
                    <SectionTitle icon={Target} title="Universe Rules" />
                    {guidance.universe_rules.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No rules extracted yet. Upload worldbuilding-heavy chapters to populate this.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {guidance.universe_rules.map(rule => (
                          <div key={rule.id} className="rule-row">
                            <p>{rule.rule}</p>
                            {rule.source_chapter && <span>{rule.source_chapter}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </aside>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const SectionTitle: React.FC<{ icon: React.ElementType; title: string }> = ({ icon: Icon, title }) => (
  <h3 className="section-title" style={{ marginBottom: 16 }}>
    <Icon size={16} /> {title}
  </h3>
);

const Meta: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ marginBottom: 10 }}>
    <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.06em' }}>{label}</p>
    <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5 }}>{value}</p>
  </div>
);

const InsightSection: React.FC<{ title: string; icon: React.ElementType; insights: CreativeInsight[] }> = ({ title, icon, insights }) => (
  <section className="card">
    <SectionTitle icon={icon} title={title} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
      {insights.map(item => <InsightCard key={item.title} insight={item} />)}
    </div>
  </section>
);

const InsightCard: React.FC<{ insight: CreativeInsight }> = ({ insight }) => (
  <div className="insight-panel">
    <h4>{insight.title}</h4>
    <p>{insight.description}</p>
    {insight.evidence.length > 0 && (
      <div className="tag-list">
        {insight.evidence.slice(0, 3).map(evidence => (
          <span key={evidence} className="tag tag-amber">{evidence}</span>
        ))}
      </div>
    )}
  </div>
);

export default CreativePage;
