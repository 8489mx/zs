import React, { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { DialogShell } from '@/shared/components/dialog-shell';
import { AiRobotIcon } from '@/shared/ui/AiRobotIcon';

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

const QUICK_SUGGESTIONS = [
  'كسبت كام النهاردة؟',
  'فلوس الخزينة والدرج الحالية',
  'ايه نواقص المخزن الحرجة؟',
  'مين أكتر عملاء عليهم فلوس؟',
  'مستحقات وفواتير الموردين',
  'صرفنا كام مصاريف النهاردة؟',
  'أكتر 5 منتجات مبيعاً',
  'ازاي أزود أرباحي النهاردة؟',
];

function renderInlineTokens(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      const inner = part.slice(2, -2).trim();
      const isCriticalStock =
        inner === '0' ||
        inner === '-1' ||
        inner.startsWith('-') ||
        inner.includes(' 0 ') ||
        inner.startsWith('0 ') ||
        inner.includes('0 قطعة') ||
        inner.includes('0 صنف');

      return (
        <strong
          key={idx}
          style={{
            fontWeight: 800,
            color: isCriticalStock ? '#dc2626' : '#0f172a',
            ...(isCriticalStock
              ? {
                  background: '#fee2e2',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  display: 'inline-block',
                }
              : {}),
          }}
        >
          {inner}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function renderFormattedContent(text: string) {
  const lines = text.split('\n');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} style={{ height: '4px' }} />;
        }

        // 1. Recommendation box
        if (trimmed.includes('💡') || trimmed.startsWith('💡') || trimmed.includes('توصية زاد:')) {
          const content = trimmed.replace(/^💡\s*/, '').replace(/^\*\*توصية زاد:\*\*\s*/, '');
          return (
            <div
              key={idx}
              style={{
                margin: '8px 0 2px 0',
                padding: '9px 12px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRight: '3px solid #170e5e',
                color: '#334155',
                fontSize: '12.5px',
                lineHeight: 1.6,
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  background: '#eff6ff',
                  color: '#1e40af',
                  padding: '1px 7px',
                  borderRadius: '4px',
                  flexShrink: 0,
                }}
              >
                توصية
              </span>
              <div>{renderInlineTokens(content)}</div>
            </div>
          );
        }

        // 2. Warning header (e.g. low stock warning or overdue installments)
        if (
          trimmed.includes('⚠️') ||
          trimmed.startsWith('⚠️') ||
          trimmed.includes('تنبيه الأقساط:') ||
          trimmed.includes('أبرز الأصناف التي قاربت على النفاد:')
        ) {
          const content = trimmed.replace(/^⚠️\s*/, '');
          return (
            <div
              key={idx}
              style={{
                margin: '8px 0 3px 0',
                padding: '6px 10px',
                borderRadius: '6px',
                background: '#fff1f2',
                border: '1px solid #ffe4e6',
                borderRight: '3px solid #e11d48',
                color: '#be123c',
                fontWeight: 800,
                fontSize: '12.5px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  background: '#fee2e2',
                  color: '#9f1239',
                  padding: '1px 6px',
                  borderRadius: '4px',
                  flexShrink: 0,
                }}
              >
                تنبيه
              </span>
              <div>{renderInlineTokens(content)}</div>
            </div>
          );
        }

        // 3. Main Topic Header (bold title ending with colon)
        const isTopicHeader = /^\*\*[^*]+:\*\*/.test(trimmed);
        if (isTopicHeader) {
          return (
            <div
              key={idx}
              style={{
                margin: '6px 0 4px 0',
                paddingBottom: '4px',
                borderBottom: '1px solid #f1f5f9',
                color: '#0f172a',
                fontSize: '13.5px',
                fontWeight: 900,
              }}
            >
              {renderInlineTokens(trimmed)}
            </div>
          );
        }

        // 4. Numbered item for low stock or ranking
        const isNumberedItem = /^\d+\.\s*/.test(trimmed);
        if (isNumberedItem) {
          return (
            <div
              key={idx}
              style={{
                padding: '4px 8px',
                margin: '1px 0',
                borderRadius: '6px',
                background: '#f8fafc',
                fontSize: '12.5px',
                lineHeight: 1.5,
                color: '#334155',
              }}
            >
              {renderInlineTokens(trimmed)}
            </div>
          );
        }

        // 5. Normal bullet point or paragraph
        return (
          <div
            key={idx}
            style={{
              lineHeight: 1.6,
              color: '#334155',
              fontSize: '13px',
              paddingRight: trimmed.startsWith('-') ? '6px' : '0',
            }}
          >
            {renderInlineTokens(trimmed)}
          </div>
        );
      })}
    </div>
  );
}

export function AiBusinessCopilotModal({ open, onClose }: AiBusinessCopilotModalProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'أهلاً بك يا فندم! أنا **زاد AI**، مستشارك الذكي في المنظومة.\nيمكنك سؤالي عن مبيعاتك وأرباحك اليوم، النواقص في المخزن، ديون العملاء، فواتير الموردين والمصاريف، أو طلب تحليلات فورية لأداء نشاطك!',
      suggestedQuestions: [
        'كسبت كام النهاردة؟',
        'فلوس الخزينة والدرج الحالية',
        'مين أكتر عملاء عليهم فلوس؟',
        'ايه نواقص المخزن الحرجة؟',
        'مستحقات وفواتير الموردين',
        'صرفنا كام مصاريف النهاردة؟',
        'ازاي أزود أرباحي النهاردة؟',
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
    <DialogShell open={open} onClose={onClose} ariaLabel="مستشارك الذكي - زاد AI" width="640px">
      <style>{`
        .ai-chips-bar::-webkit-scrollbar {
          display: none !important;
        }
        .ai-chips-bar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', height: '580px', maxHeight: '82vh' }} dir="rtl">
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
                width: '38px',
                height: '38px',
                borderRadius: '11px',
                background: 'linear-gradient(135deg, #170e5e 0%, #2e1065 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(23,14,94,0.25)',
                border: '1px solid rgba(255,255,255,0.1)',
                flexShrink: 0,
              }}
            >
              <AiRobotIcon size={24} />
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
            style={{
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              width: '30px',
              height: '30px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              color: '#64748b',
              cursor: 'pointer',
            }}
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
            gap: '14px',
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
                    maxWidth: '92%',
                    padding: isAi ? '12px 16px' : '10px 16px',
                    borderRadius: isAi ? '14px 14px 14px 2px' : '14px 14px 2px 14px',
                    background: isAi ? '#f8fafc' : '#170e5e',
                    color: isAi ? '#1e293b' : '#ffffff',
                    border: isAi ? '1px solid #e2e8f0' : 'none',
                    fontSize: '13px',
                    lineHeight: 1.6,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  {isAi ? renderFormattedContent(m.text) : m.text}
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
                          padding: '4px 11px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {sq}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {askMutation.isPending && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', fontSize: '12.5px', padding: '6px 8px' }}>
              <AiRobotIcon size={18} />
              <span style={{ fontWeight: 700 }}>زاد AI يحلل بياناتك الآن...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Shortcut Chips Bar */}
        <div
          className="ai-chips-bar"
          style={{
            padding: '8px 16px 10px 16px',
            background: '#f8fafc',
            display: 'flex',
            gap: '6px',
            overflowX: 'auto',
            whiteSpace: 'nowrap',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          {QUICK_SUGGESTIONS.map((text, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(text)}
              disabled={askMutation.isPending}
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '18px',
                padding: '5px 12px',
                fontSize: '11.5px',
                fontWeight: 700,
                color: '#1e293b',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                flexShrink: 0,
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#170e5e';
                e.currentTarget.style.color = '#170e5e';
                e.currentTarget.style.background = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#cbd5e1';
                e.currentTarget.style.color = '#1e293b';
                e.currentTarget.style.background = '#ffffff';
              }}
            >
              <span>{text}</span>
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: '10px 16px 14px 16px',
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
              padding: '9px 14px',
              borderRadius: '10px',
              border: '1.5px solid #cbd5e1',
              fontSize: '13px',
              background: '#ffffff',
              outline: 'none',
              transition: 'border-color 0.15s ease',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#170e5e';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={!input.trim() || askMutation.isPending}
            style={{
              background: input.trim() && !askMutation.isPending ? '#170e5e' : '#cbd5e1',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              padding: '9px 18px',
              fontSize: '13px',
              fontWeight: 800,
              cursor: input.trim() && !askMutation.isPending ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: input.trim() && !askMutation.isPending ? '0 2px 6px rgba(23,14,94,0.2)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <span>إرسال</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>
    </DialogShell>
  );
}
