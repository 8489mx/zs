import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { DialogShell } from '@/shared/components/dialog-shell';
import { Button } from '@/shared/ui/button';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  suggestedQuestions?: string[];
}

interface AiBusinessCopilotModalProps {
  open: boolean;
  onClose: () => void;
}

export function AiBusinessCopilotModal({ open, onClose }: AiBusinessCopilotModalProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'أهلاً بك يا فندم! أنا **زاد AI**، مستشارك الذكي في المنظومة.\nيمكنك سؤالي عن مبيعاتك وأرباحك اليوم، النواقص في المخزن، ديون العملاء، أو طلب تحليلات فورية لأداء نشاطك!',
      suggestedQuestions: [
        'كسبت كام النهاردة؟',
        'مين أكتر عملاء عليهم فلوس؟',
        'ايه نواقص المخزن الحرجة؟',
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
    }
  }, [messages, open]);

  const askMutation = useMutation({
    mutationFn: (question: string) =>
      http<{ answer: string; suggestedQuestions?: string[] }>('/api/ai-copilot/ask', {
        method: 'POST',
        body: JSON.stringify({ question }),
      }),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'ai',
          text: data.answer,
          suggestedQuestions: data.suggestedQuestions,
        },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'ai',
          text: 'عذراً، حدث خطأ أثناء الاستعلام. يرجى المحاولة مرة أخرى.',
        },
      ]);
    },
  });

  const handleSend = (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q || askMutation.isPending) return;

    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: 'user',
        text: q,
      },
    ]);

    setInput('');
    askMutation.mutate(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <DialogShell open={open} onClose={onClose} ariaLabel="مستشارك الذكي - زاد AI" width="620px">
      <div style={{ display: 'flex', flexDirection: 'column', height: '560px', maxHeight: '80vh' }} dir="rtl">
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            borderRadius: '12px 12px 0 0',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: '#170e5e',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
              }}
            >
              🤖
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 900, color: '#0f172a' }}>
                زاد AI • مستشارك الذكي
              </h3>
              <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}>
                ● متصل بقاعدة بيانات منشأتك مباشرة
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: '18px', color: '#64748b', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Messages Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            background: '#ffffff',
          }}
        >
          {messages.map((m) => {
            const isAi = m.sender === 'ai';
            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isAi ? 'flex-start' : 'flex-end',
                }}
              >
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: isAi ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
                    background: isAi ? '#f8fafc' : '#170e5e',
                    color: isAi ? '#1e293b' : '#ffffff',
                    border: isAi ? '1px solid #e2e8f0' : 'none',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    whiteSpace: 'pre-line',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  {m.text}
                </div>

                {/* Suggested Questions Pills */}
                {isAi && m.suggestedQuestions && m.suggestedQuestions.length > 0 && (
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {m.suggestedQuestions.map((sq, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleSend(sq)}
                        disabled={askMutation.isPending}
                        style={{
                          background: '#eff6ff',
                          border: '1px solid #bfdbfe',
                          color: '#1d4ed8',
                          borderRadius: '16px',
                          padding: '4px 10px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        💡 {sq}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {askMutation.isPending && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '12px', padding: '8px' }}>
              <span>🤖 زاد AI يحلل بياناتك الآن...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #e2e8f0',
            background: '#f8fafc',
            display: 'flex',
            gap: '8px',
            borderRadius: '0 0 12px 12px',
          }}
        >
          <input
            type="text"
            placeholder="اسأل زاد أي شيء عن أرقامك، مبيعاتك، أو مخزونك..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={askMutation.isPending}
            style={{
              flex: 1,
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              background: '#ffffff',
              outline: 'none',
            }}
          />

          <Button
            variant="primary"
            onClick={() => handleSend()}
            disabled={!input.trim() || askMutation.isPending}
            style={{ background: '#170e5e', padding: '8px 16px', fontSize: '13px', fontWeight: 800 }}
          >
            إرسال
          </Button>
        </div>
      </div>
    </DialogShell>
  );
}
