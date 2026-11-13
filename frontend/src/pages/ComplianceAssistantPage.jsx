import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Bot, User, Loader2, FileText, Building2, Sparkles, Scale, CheckCircle, FileCheck, Hash, Landmark, AlertTriangle, AlertCircle, Clock } from 'lucide-react';

const API_URL = 'http://localhost:8080/api/v1';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

const SUGGESTIONS = [
  'Show me all organizations',
  'Find documents about compliance status',
  'What regulations are in the ICT sector?',
  'Show expired submissions',
  'Which organizations have pending compliance records?',
];

const typeConfig = {
  'Organization': { icon: Building2, color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100', path: '/organizations' },
  'Requirement': { icon: FileText, color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100', path: '/requirements' },
  'Regulation': { icon: Scale, color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100', path: '/regulations' },
  'Compliance Record': { icon: CheckCircle, color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100', path: '/compliance' },
  'Submission': { icon: Send, color: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100', path: '/submissions' },
  'Evidence': { icon: FileCheck, color: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100', path: '/evidence' },
};

const defaultConfig = { icon: Hash, color: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100', path: '/' };

function formatAnswer(text) {
  const lines = text.split('\n');
  const elements = [];
  let inList = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (inList) { inList = false; elements.push(<div key={`sp-${i}`} className="h-2" />); }
      else { elements.push(<div key={`sp-${i}`} className="h-2" />); }
      continue;
    }

    if (trimmed.startsWith('⚠️')) {
      elements.push(
        <div key={i} className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl my-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <span className="text-sm text-red-800">{trimmed.replace('⚠️', '').trim()}</span>
        </div>
      );
      continue;
    }

    if (trimmed.startsWith('⏳')) {
      elements.push(
        <div key={i} className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl my-2">
          <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span className="text-sm text-amber-800">{trimmed.replace('⏳', '').trim()}</span>
        </div>
      );
      continue;
    }

    if (trimmed.startsWith('📝')) {
      elements.push(
        <div key={i} className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl my-2">
          <FileText className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
          <span className="text-sm text-blue-800">{trimmed.replace('📝', '').trim()}</span>
        </div>
      );
      continue;
    }

    if (trimmed.startsWith('**Tip:**')) {
      elements.push(
        <div key={i} className="flex items-start gap-2 p-3 bg-gray-50 border border-gray-200 rounded-xl my-2">
          <Sparkles className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
          <span className="text-sm text-gray-600">{trimmed.replace('**Tip:**', '').trim()}</span>
        </div>
      );
      continue;
    }

    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      elements.push(
        <div key={i} className="font-semibold text-gray-800 text-sm">{trimmed.replace(/\*\*/g, '')}</div>
      );
      continue;
    }

    const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
    const formatted = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} className="font-semibold text-gray-800">{part.slice(2, -2)}</strong>;
      }
      return part;
    });

    if (trimmed.startsWith('• ') || trimmed.startsWith('- ')) {
      const text = trimmed.replace(/^[•-]\s*/, '');
      elements.push(
        <div key={i} className="flex items-start gap-2 ml-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#005387] mt-2 shrink-0" />
          <span className="text-sm text-gray-700">{text}</span>
        </div>
      );
    } else {
      elements.push(<div key={i} className="text-sm text-gray-700">{formatted}</div>);
    }
  }

  return elements;
}

export default function ComplianceAssistantPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am your Compliance Assistant. Ask me anything about organizations, regulations, requirements, compliance records, submissions, or evidence documents.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    const query = (text || input).trim();
    if (!query || loading) return;
    if (!text) setInput('');

    setMessages(prev => [...prev, { role: 'user', text: query }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/assistant/query`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ query, maxResults: 10 })
      });
      const data = await res.json();

      if (data.success) {
        const answer = data.data.answer;
        const refs = data.data.references || [];
        setMessages(prev => [...prev, { role: 'assistant', text: answer, refs }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I could not process that query. Please try again.' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error connecting to the server. Please make sure the backend is running.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col p-8 pt-6">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold text-gray-900">Compliance Assistant</h1>
        <p className="text-sm text-gray-500 mt-1 font-light">Natural language search across all compliance data and documents</p>
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-soft border border-gray-100 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, i) => {
            const Icon = msg.role === 'assistant' ? Bot : User;
            return (
              <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-[#005387]/10 border border-[#005387]/20 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-[#005387]" />
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-1' : ''}`}>
                  <div className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-[#005387] text-white rounded-br-md'
                      : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-bl-md'
                  }`}>
                    {msg.role === 'assistant' ? formatAnswer(msg.text) : (
                      <div className="whitespace-pre-wrap">{msg.text}</div>
                    )}
                  </div>
                  {msg.refs && msg.refs.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-gray-500 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3" />
                        References ({msg.refs.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {msg.refs.map((ref, j) => {
                          const cfg = typeConfig[ref.type] || defaultConfig;
                          const RefIcon = cfg.icon;
                          return (
                            <button
                              key={j}
                              onClick={() => navigate(cfg.path)}
                              title={ref.summary}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer transition-all ${cfg.color}`}
                            >
                              <RefIcon className="w-3.5 h-3.5" />
                              <span className="truncate max-w-[180px]">{ref.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-4 h-4 text-gray-500" />
                  </div>
                )}
              </div>
            );
          })}

          {messages.length === 1 && (
            <div className="text-center py-6">
              <p className="text-xs text-gray-400 mb-3">Try asking:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-[#005387]/10 border border-[#005387]/20 flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 text-[#005387]" />
              </div>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-md px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                  <span className="text-sm text-gray-400">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-gray-100 p-4 bg-gray-50/50">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about organizations, documents, submissions..."
              rows={1}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#005387]/20 text-sm resize-none"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="px-5 py-3 bg-[#005387] text-white rounded-xl hover:bg-[#004570] disabled:opacity-50 flex items-center gap-2 font-medium text-sm transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
