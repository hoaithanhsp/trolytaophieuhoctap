import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { chatWithAI } from '../utils/geminiApi';
import { getSettings } from '../utils/storage';
import MathRenderer from '../components/MathRenderer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const SUGGESTED_PROMPTS = [
  'Gợi ý 5 câu hỏi trắc nghiệm Toán lớp 9 về phương trình bậc hai',
  'Tạo câu hỏi điền khuyết môn Tiếng Anh cho học sinh lớp 6',
  'Giải thích khái niệm quang hợp cho học sinh cấp 2',
  'Viết 3 câu hỏi nối cột về các sự kiện lịch sử Việt Nam',
];

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;

    const settings = getSettings();
    if (!settings.geminiApiKey) {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Vui lòng nhập API Key trong phần Cài đặt trước khi sử dụng trợ lý AI.',
        timestamp: new Date(),
      }]);
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatWithAI(msg);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Lỗi: ${err instanceof Error ? err.message : 'Không thể kết nối với AI'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => setMessages([]);

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Trợ lý AI</h2>
          <p className="text-slate-500 text-sm mt-1">Hỏi bất kỳ điều gì về giáo dục và bài tập</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="btn-raised btn-raised-white flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Xóa lịch sử
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl bg-white border border-slate-200/60 p-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-400 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-bold text-slate-700">Xin chào! Tôi là trợ lý AI</h3>
            <p className="text-slate-400 text-sm mt-1 max-w-md">
              Tôi có thể giúp bạn tạo câu hỏi, giải thích bài học, hoặc tư vấn về phương pháp giảng dạy.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6 w-full max-w-lg">
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => send(prompt)}
                  className="text-left px-4 py-3 rounded-xl bg-teal-50/50 hover:bg-teal-50 hover:text-teal-600 text-sm text-slate-600 transition-colors border border-teal-100/50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-400 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
                : 'bg-slate-50 text-slate-700'
              }`}>
              {msg.role === 'assistant' ? (
                <MathRenderer content={msg.content} className="whitespace-pre-wrap" />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-teal-600" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-emerald-400 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="px-4 py-3 rounded-2xl bg-slate-50 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />
              <span className="text-sm text-slate-400">Đang suy nghĩ...</span>
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      <div className="mt-4 flex gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Nhập câu hỏi của bạn..."
          className="flex-1 px-4 py-3 rounded-xl border border-slate-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none text-sm transition-all"
          disabled={loading}
        />
        <button
          onClick={() => send()}
          disabled={loading || !input.trim()}
          className="btn-raised btn-raised-teal px-5 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-teal-600 text-white disabled:opacity-50 transition-all"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
