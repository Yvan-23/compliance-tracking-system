import { useState } from 'react';
import { Sparkles, X, Send, Loader2, MessageSquare, Database, Bot } from 'lucide-react';

const API_URL = 'http://localhost:8080/api/v1';

const getAuthHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('token')}`
});

export default function AIAssistant({ context = 'general', title = 'Compliance Assistant' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'I can search your compliance data — organizations, documents, submissions, and more. Try pasting a file hash or asking about an organization.', source: 'system' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, source: 'user' }]);
    setLoading(true);

    try {
      // First try our database-backed ComplianceAssistant
      const dbRes = await fetch(`${API_URL}/assistant/query`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ query: userMessage, maxResults: 5 })
      });
      const dbData = await dbRes.json();

      if (dbData.success && dbData.data?.answer) {
        const { answer, references } = dbData.data;
        let content = answer;
        if (references?.length > 0) {
          const refSummary = references.map(r => `  • [${r.type}] ${r.title} — ${r.summary?.slice(0, 200)}`).join('\n');
          content += `\n\n**References:**\n${refSummary}`;
        }
        setMessages(prev => [...prev, {
          role: 'assistant',
          content,
          source: 'database'
        }]);
      } else {
        // Fall back to Groq AI for general questions
        const aiRes = await fetch(`${API_URL}/ai/chat`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ message: userMessage, context })
        });
        const aiData = await aiRes.json();
        if (aiData.success && aiData.data?.response) {
          setMessages(prev => [...prev, { role: 'assistant', content: aiData.data.response, source: 'ai' }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: 'I could not find anything in the database and the AI service is unavailable. Try a different search term.', source: 'error' }]);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Service is currently unavailable. Please try again later.', source: 'error' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-[#005387] to-[#004570] rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform z-40"
      >
        <Sparkles className="w-6 h-6 text-white" />
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col z-50">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center">
                <Bot className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{title}</h3>
                <p className="text-xs text-gray-500">Searches your data + AI</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] p-3 rounded-xl ${
                  msg.role === 'user'
                    ? 'bg-primary-500 text-white'
                    : msg.source === 'database'
                      ? 'bg-green-50 border border-green-200 text-gray-800'
                      : 'bg-gray-100 text-gray-800'
                }`}>
                  <div className="flex items-center gap-1 mb-1">
                    {msg.source === 'database' && <Database className="w-3 h-3 text-green-600" />}
                    {msg.source === 'ai' && <Sparkles className="w-3 h-3 text-purple-600" />}
                    {msg.source === 'database' && <span className="text-[10px] font-medium text-green-600 uppercase">Data Match</span>}
                    {msg.source === 'ai' && <span className="text-[10px] font-medium text-purple-600 uppercase">AI</span>}
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-xl">
                  <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Search organizations, hashes, docs..."
                className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="p-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function AIInsightCard({ title, onAnalyze, loading: parentLoading }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/assistant/query`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ query: onAnalyze, maxResults: 5 })
      });
      const data = await response.json();
      if (data.success && data.data?.references?.length > 0) {
        const refs = data.data.references.map(r => `[${r.type}] ${r.title}: ${r.summary}`).join('\n');
        setResult(`Found ${data.data.references.length} result(s):\n${refs}`);
      } else {
        setResult('No matching data found in the database.');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setResult('Failed to query data.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary-50 to-purple-50 rounded-2xl p-6 border border-primary-100">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-primary-600" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="px-3 py-1.5 bg-primary-500 text-white text-sm rounded-lg hover:bg-primary-600 disabled:opacity-50 flex items-center gap-1"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Search
        </button>
      </div>

      {result && (
        <div className="mt-4 p-4 bg-white/60 rounded-xl">
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{result}</p>
        </div>
      )}
    </div>
  );
}
