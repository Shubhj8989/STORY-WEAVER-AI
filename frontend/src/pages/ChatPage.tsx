import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, BookOpen, Loader } from 'lucide-react';
import { useStory } from '../context/StoryContext';
import { sendChatMessage } from '../api/client';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  sources?: string[];
}

const EXAMPLE_QUESTIONS = [
  "Who is the main character?",
  "What happened in the first chapter?",
  "Describe the relationships between characters",
  "What is the main conflict of the story?",
  "What locations appear in the story?",
  "Who are the antagonists?",
];

const ChatPage: React.FC = () => {
  const { activeStory } = useStory();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Reset chat when story changes
    setMessages([]);
    if (activeStory) {
      setMessages([{
        id: 'welcome',
        role: 'ai',
        content: `Hi! I'm your Story-Weaver AI assistant for **${activeStory.title}**. I have access to all the chapters you've uploaded.\n\nAsk me anything about the characters, plot, relationships, locations, or world rules. My answers are grounded in your actual story content.`,
        sources: [],
      }]);
    }
  }, [activeStory?.id]);

  const handleSend = async () => {
    if (!input.trim() || !activeStory || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages
        .filter(m => m.role !== 'ai' || m.id !== 'welcome')
        .reduce<{ user: string; assistant: string }[]>((acc, m, i, arr) => {
          if (m.role === 'user' && arr[i + 1]?.role === 'ai') {
            acc.push({ user: m.content, assistant: arr[i + 1].content });
          }
          return acc;
        }, []);

      const res = await sendChatMessage({
        story_id: activeStory.id,
        message: userMsg.content,
        history,
      });

      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: res.data.answer,
        sources: res.data.sources,
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const renderContent = (text: string) => {
    // Simple bold markdown
    return text.split('\n').map((line, i) => (
      <span key={i}>
        {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        )}
        {i < text.split('\n').length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div>
      <div className="page-header">
        <h2>AI Story Chat</h2>
        <p>Ask anything about your story — powered by Groq + RAG</p>
      </div>

      {!activeStory ? (
        <div className="page-body">
          <div className="empty-state">
            <div className="empty-state-icon">💬</div>
            <h3>No story selected</h3>
            <p>Create or select a story to start chatting</p>
          </div>
        </div>
      ) : (
        <div className="chat-container">
          {/* Messages */}
          <div className="chat-messages">
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'var(--gradient-purple)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px', boxShadow: 'var(--shadow-glow)'
                }}>
                  <Bot size={28} color="white" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Story Assistant Ready</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
                  Upload chapters first, then ask me about {activeStory.title}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {EXAMPLE_QUESTIONS.map(q => (
                    <button
                      key={q}
                      onClick={() => setInput(q)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 12 }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map(msg => (
              <div key={msg.id} className={`chat-message ${msg.role === 'user' ? 'user' : 'ai'} fade-in`}>
                <div className={`chat-avatar ${msg.role === 'user' ? 'user' : 'ai'}`}>
                  {msg.role === 'user' ? <User size={14} color="white" /> : <Bot size={14} color="white" />}
                </div>
                <div>
                  <div className="chat-bubble">
                    {renderContent(msg.content)}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="chat-sources">
                      {msg.sources.map(s => (
                        <span key={s} style={{
                          fontSize: 10, padding: '2px 8px',
                          background: 'rgba(6,182,212,0.1)',
                          border: '1px solid rgba(6,182,212,0.3)',
                          borderRadius: 10, color: 'var(--accent-cyan)',
                          display: 'flex', alignItems: 'center', gap: 3
                        }}>
                          <BookOpen size={9} /> {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="chat-message ai fade-in">
                <div className="chat-avatar ai">
                  <Bot size={14} color="white" />
                </div>
                <div className="chat-bubble" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div className="loading-dots">
                    <span /><span /><span />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Searching story...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-area">
            {messages.length === 1 && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                {EXAMPLE_QUESTIONS.slice(0, 4).map(q => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    style={{
                      padding: '4px 12px', borderRadius: 20, border: '1px solid var(--border)',
                      background: 'var(--bg-card)', color: 'var(--text-secondary)',
                      fontSize: 11, cursor: 'pointer', transition: 'all 0.2s'
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            <div className="chat-input-row">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Ask anything about "${activeStory.title}"...`}
                rows={1}
              />
              <button
                className="btn btn-primary"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                style={{ flexShrink: 0, height: 48 }}
              >
                {loading ? <Loader size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Send size={16} />}
              </button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
              Shift+Enter for new line · Enter to send · Answers are grounded in your uploaded chapters
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;
