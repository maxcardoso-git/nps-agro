'use client';

import { useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRequiredSession } from '@/hooks/use-required-session';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  function_called?: string;
  timestamp: Date;
}

const SUGGESTIONS = [
  'Qual é o NPS geral da campanha?',
  'Quais são os temas mais mencionados pelos detratores?',
  'Como está a aderência ao roteiro?',
  'Compare o NPS por segmento',
  'Quais regiões têm o menor NPS?',
  'O que os promotores elogiam?',
];

export default function ChatPage() {
  const { session } = useRequiredSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session!.access_token}`,
          'x-tenant-id': session!.user.tenant_id,
        },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) throw new Error('Erro na API');

      const body = await res.json();
      const data = body?.data || body;

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.reply || 'Sem resposta.',
        function_called: data.function_called,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Erro ao consultar a IA. Tente novamente.', timestamp: new Date() }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }), 100);
    }
  };

  return (
    <div className="flex h-[calc(100vh-120px)] flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-slate-900">AI Chat</h1>
        <p className="text-sm text-slate-500">Faça perguntas sobre os resultados das campanhas NPS</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="mb-6 text-center">
              <span className="mb-2 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-3xl">🤖</span>
              <h2 className="mt-2 text-lg font-semibold text-slate-700">Como posso ajudar?</h2>
              <p className="text-sm text-slate-500">Pergunte sobre NPS, temas, detratores, regiões, segmentos...</p>
            </div>
            <div className="grid max-w-lg gap-2 md:grid-cols-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-left text-sm text-slate-600 transition hover:border-primary hover:bg-primary/5"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-800'}`}>
              {msg.role === 'assistant' && msg.function_called && (
                <div className="mb-2 flex items-center gap-1 text-[10px] text-slate-400">
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 font-mono">{msg.function_called}</span>
                  <span>consultado</span>
                </div>
              )}
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
              <p className={`mt-1 text-[10px] ${msg.role === 'user' ? 'text-white/60' : 'text-slate-400'}`}>
                {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-500">
              <span className="inline-flex gap-1">
                <span className="animate-bounce">●</span>
                <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
                <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
          placeholder="Pergunte sobre os resultados das campanhas..."
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          disabled={loading}
        />
        <Button onClick={() => sendMessage(input)} disabled={loading || !input.trim()} className="px-6">
          Enviar
        </Button>
      </div>
    </div>
  );
}
