import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { http } from '@/lib/http';
import { DialogShell } from '@/shared/components/dialog-shell';
import { AiRobotIcon } from '@/shared/ui/AiRobotIcon';
import {
  XIcon,
  FileTextIcon,
  RefreshCwIcon,
  PlusCircleIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SlidersIcon,
} from '@/shared/components/icons/AppIcons';
import { toast } from '@/shared/components/system-alert';

interface ReasoningStep {
  step: string;
  observation: string;
}

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  suggestedQuestions?: string[];
  reasoningSteps?: ReasoningStep[];
  toolsUsed?: string[];
}

interface KnowledgeSource {
  id: number;
  title: string;
  source_type: string;
  status: string;
  chunk_count: number;
  token_count: number;
  created_at: string;
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
  'أفكار بره الصندوق لزيادة الأرباح',
  'فرص تصريف البضاعة الراكدة',
  'شروط وسياسات المنشأة',
  'أكتر 5 منتجات مبيعاً',
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
        if (trimmed.includes('توصية زاد:') || trimmed.includes('الحل الابتكاري') || trimmed.includes('بره الصندوق')) {
          const content = trimmed.replace(/^\*\*توصية زاد:\*\*\s*/, '').replace(/^توصية:\s*/, '');
          return (
            <div
              key={idx}
              style={{
                margin: '8px 0 2px 0',
                padding: '9px 12px',
                borderRadius: '8px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRight: '3.5px solid #170e5e',
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
                توصية استراتيجية
              </span>
              <div>{renderInlineTokens(content)}</div>
            </div>
          );
        }

        // 2. Warning header (e.g. low stock warning or overdue installments)
        if (
          trimmed.includes('تنبيه الأقساط:') ||
          trimmed.includes('تنبيه مبكر:') ||
          trimmed.includes('أبرز الأصناف التي قاربت على النفاد:')
        ) {
          return (
            <div
              key={idx}
              style={{
                margin: '8px 0 3px 0',
                padding: '6px 10px',
                borderRadius: '6px',
                background: '#fff1f2',
                border: '1px solid #ffe4e6',
                borderRight: '3.5px solid #e11d48',
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
                تنبيه تشغيلي
              </span>
              <div>{renderInlineTokens(trimmed)}</div>
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
                fontSize: '13px',
                fontWeight: 800,
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
  const [activeTab, setActiveTab] = useState<'chat' | 'knowledge'>('chat');
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expandedReasoning, setExpandedReasoning] = useState<Record<string, boolean>>({});

  // Knowledge Base State
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('policy');
  const [docContent, setDocContent] = useState('');

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'أهلاً بك يا فندم! أنا **زاد AI**، مستشارك التنفيذي وشريكك التجاري.\nأنا متصل مباشرة بقاعدة بيانات نشاطك ومستودع المعرفة المرجعية.\nيمكنك استشارتي في مبيعاتك، تدفقات السيولة، مديونيات العملاء، أو طلب أفكار وحلول غير تقليدية لتعظيم الربحية وتصريف البضاعة الراكدة!',
      suggestedQuestions: [
        'ما موقف مبيعات وسيولة اليوم؟',
        'اقترح فكرة بره الصندوق لزيادة الأرباح',
        'من هم أكبر العملاء مديونية؟',
      ],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open && activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, open, activeTab]);

  // Query Knowledge Sources
  const { data: sources = [], isLoading: isLoadingSources, refetch: refetchSources } = useQuery<KnowledgeSource[]>({
    queryKey: ['ai-knowledge-sources'],
    queryFn: () => http<KnowledgeSource[]>('/api/ai-copilot/knowledge/sources'),
    enabled: open && activeTab === 'knowledge',
  });

  // Agent Chat Mutation
  const chatMutation = useMutation({
    mutationFn: (messageText: string) =>
      http<{
        sessionId: string;
        answer: string;
        reasoningSteps: ReasoningStep[];
        suggestedQuestions: string[];
        toolsUsed: string[];
      }>('/api/ai-copilot/agent/chat', {
        method: 'POST',
        body: JSON.stringify({ message: messageText, ...(sessionId ? { sessionId } : {}) }),
      }),
    onSuccess: (data) => {
      if (data.sessionId) setSessionId(data.sessionId);
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'ai',
          text: data.answer,
          suggestedQuestions: data.suggestedQuestions,
          reasoningSteps: data.reasoningSteps,
          toolsUsed: data.toolsUsed,
        },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: String(Date.now()),
          sender: 'ai',
          text: 'عذراً، حدث خطأ أثناء تحليل الاستعلام. يرجى إعادة المحاولة.',
        },
      ]);
    },
  });

  // Add Knowledge Source Mutation
  const addDocMutation = useMutation({
    mutationFn: () =>
      http('/api/ai-copilot/knowledge/sources', {
        method: 'POST',
        body: JSON.stringify({
          title: docTitle,
          sourceType: docType,
          rawText: docContent,
        }),
      }),
    onSuccess: () => {
      toast.success('تمت إضافة الوثيقة وتضمينها بنجاح في عقل زاد AI.');
      setDocTitle('');
      setDocContent('');
      setIsAddingDoc(false);
      refetchSources();
    },
    onError: () => {
      toast.error('فشل في حفظ الوثيقة، يرجى التأكد من ملء العنوان والمحتوى.');
    },
  });

  // Delete Knowledge Source Mutation
  const deleteDocMutation = useMutation({
    mutationFn: (id: number) =>
      http(`/api/ai-copilot/knowledge/sources/${id}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      toast.success('تم حذف الوثيقة من مستودع المعرفة.');
      refetchSources();
    },
  });

  // Auto-Index Catalog Mutation
  const autoIndexMutation = useMutation({
    mutationFn: () => http('/api/ai-copilot/knowledge/auto-index-products', { method: 'POST' }),
    onSuccess: () => {
      toast.success('تمت فهرسة كتالوج الأصناف تلقائياً وتحديث محرك البحث الدلالي.');
      refetchSources();
    },
    onError: () => {
      toast.error('حدث خطأ أثناء فهرسة الأصناف.');
    },
  });

  const handleSend = (textToSend?: string) => {
    const q = (textToSend || input).trim();
    if (!q || chatMutation.isPending) return;

    setMessages((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        sender: 'user',
        text: q,
      },
    ]);

    setInput('');
    chatMutation.mutate(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleReasoning = (messageId: string) => {
    setExpandedReasoning((prev) => ({
      ...prev,
      [messageId]: !prev[messageId],
    }));
  };

  const handleResetChat = () => {
    setSessionId(null);
    setMessages([
      {
        id: 'welcome_new',
        sender: 'ai',
        text: 'تم بدء جلسة محادثة جديدة. تفضل بسؤالي عن أي جانب في أرقامك أو سياساتك أو استراتيجيات البيع!',
        suggestedQuestions: ['فحص مبيعات اليوم', 'أفكار بره الصندوق لزيادة الأرباح'],
      },
    ]);
  };

  return (
    <DialogShell open={open} onClose={onClose} ariaLabel="مستشارك التنفيذي - زاد AI" width="min(820px, 95vw)">
      <style>{`
        .ai-chips-bar::-webkit-scrollbar {
          display: none !important;
        }
        .ai-chips-bar {
          -ms-overflow-style: none !important;
          scrollbar-width: none !important;
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: 'column', height: 'min(620px, 86vh)', maxHeight: '86vh' }} dir="rtl">
        {/* Header */}
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: '#f8fafc',
            borderRadius: '12px 12px 0 0',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #170e5e 0%, #2e1065 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(23,14,94,0.22)',
                border: '1px solid rgba(255,255,255,0.15)',
                flexShrink: 0,
              }}
            >
              <AiRobotIcon size={24} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '2px', minWidth: 0 }}>
              <div
                style={{
                  margin: 0,
                  fontSize: '14.5px',
                  fontWeight: 900,
                  color: '#0f172a',
                  lineHeight: '1.25',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>زاد AI</span>
                <span style={{ color: '#94a3b8', fontSize: '13px' }}>•</span>
                <span>المستشار التنفيذي الذكي</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '10.5px',
                  color: '#059669',
                  fontWeight: 700,
                  lineHeight: '1.2',
                }}
              >
                <span style={{ fontSize: '7px', lineHeight: 1, color: '#10b981' }}>●</span>
                <span>مستودع المعرفة (RAG) + أدوات ERP الحية</span>
              </div>
            </div>
          </div>

          {/* Navigation Symmetrical Tabs */}
          <div
            style={{
              display: 'flex',
              background: '#e2e8f0',
              padding: '3px',
              borderRadius: '8px',
              gap: '2px',
              boxSizing: 'border-box',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              style={{
                padding: '6px 14px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'chat' ? '#170e5e' : 'transparent',
                color: activeTab === 'chat' ? '#ffffff' : '#475569',
                boxSizing: 'border-box',
              }}
            >
              المستشار والمحادثة
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('knowledge')}
              style={{
                padding: '6px 14px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'knowledge' ? '#170e5e' : 'transparent',
                color: activeTab === 'knowledge' ? '#ffffff' : '#475569',
                boxSizing: 'border-box',
              }}
            >
              مستودع المعرفة (Chatbase)
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            style={{
              background: '#ffffff',
              border: '1.5px solid #cbd5e1',
              borderRadius: '9px',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0f172a',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <XIcon size={18} strokeWidth={2.4} />
          </button>
        </div>

        {/* Tab 1: Chat Assistant */}
        {activeTab === 'chat' && (
          <>
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
                const hasReasoning = isAi && m.reasoningSteps && m.reasoningSteps.length > 0;
                const isReasoningOpen = !!expandedReasoning[m.id];

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
                        padding: isAi ? '14px 18px' : '10px 16px',
                        borderRadius: isAi ? '14px 14px 14px 2px' : '14px 14px 2px 14px',
                        background: isAi ? '#f8fafc' : '#170e5e',
                        color: isAi ? '#1e293b' : '#ffffff',
                        border: isAi ? '1px solid #e2e8f0' : 'none',
                        fontSize: '13px',
                        lineHeight: 1.6,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                      }}
                    >
                      {/* Collapsible Reasoning & Tools Box */}
                      {hasReasoning && (
                        <div style={{ marginBottom: '10px' }}>
                          <button
                            type="button"
                            onClick={() => toggleReasoning(m.id)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              borderRadius: '6px',
                              padding: '3px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            <SlidersIcon size={13} />
                            <span>استدعاء الأدوات وتحليل البيانات ({m.reasoningSteps?.length} خطوات)</span>
                            {isReasoningOpen ? <ChevronUpIcon size={13} /> : <ChevronDownIcon size={13} />}
                          </button>

                          {isReasoningOpen && (
                            <div
                              style={{
                                marginTop: '6px',
                                padding: '8px 10px',
                                background: '#f1f5f9',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                fontSize: '11.5px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '4px',
                              }}
                            >
                              {m.reasoningSteps?.map((rs, idx) => (
                                <div key={idx} style={{ color: '#334155' }}>
                                  <strong style={{ color: '#0f172a' }}>{rs.step}:</strong> {rs.observation}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

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
                            disabled={chatMutation.isPending}
                            style={{
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              borderRadius: '16px',
                              padding: '4px 11px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              boxSizing: 'border-box',
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

              {chatMutation.isPending && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6366f1', fontSize: '12.5px', padding: '6px 8px' }}>
                  <AiRobotIcon size={18} />
                  <span style={{ fontWeight: 700 }}>زاد AI يراجع الأدوات ويبحث في البيانات ويفكر في الحل الأنسب...</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Shortcut Chips Bar */}
            <div
              className="ai-chips-bar"
              style={{
                padding: '8px 16px',
                background: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                borderTop: '1px solid #e2e8f0',
              }}
            >
              <button
                type="button"
                onClick={handleResetChat}
                title="بدء جلسة جديدة"
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '16px',
                  padding: '4px 9px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#475569',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  flexShrink: 0,
                }}
              >
                <RefreshCwIcon size={12} />
                <span>جلسة جديدة</span>
              </button>

              {QUICK_SUGGESTIONS.map((text, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSend(text)}
                  disabled={chatMutation.isPending}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '18px',
                    padding: '5px 12px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    color: '#1e293b',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    flexShrink: 0,
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
                placeholder="اسأل زاد أي شيء عن أرقامك، مبيعاتك، مخزونك، أو اطلب استشارة بره الصندوق..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={chatMutation.isPending}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #cbd5e1',
                  fontSize: '13px',
                  background: '#ffffff',
                  outline: 'none',
                }}
              />

              <button
                type="button"
                onClick={() => handleSend()}
                disabled={!input.trim() || chatMutation.isPending}
                style={{
                  background: input.trim() && !chatMutation.isPending ? '#170e5e' : '#cbd5e1',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '9px 18px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: input.trim() && !chatMutation.isPending ? 'pointer' : 'not-allowed',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>إرسال</span>
              </button>
            </div>
          </>
        )}

        {/* Tab 2: Knowledge Base / Chatbase RAG */}
        {activeTab === 'knowledge' && (
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '18px',
              background: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            {/* Top Banner */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                padding: '14px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                  مستودع المعرفة والوثائق (Chatbase RAG Engine)
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                  ارفع لوائح شركتك، شروط الضمان، أو الكتالوجات لتدريب زاد AI عليها والإجابة منها بدقة.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => autoIndexMutation.mutate()}
                  disabled={autoIndexMutation.isPending}
                  style={{
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1e40af',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <RefreshCwIcon size={14} />
                  <span>{autoIndexMutation.isPending ? 'جاري الفهرسة...' : 'فهرسة الأصناف تلقائياً'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsAddingDoc(!isAddingDoc)}
                  style={{
                    background: '#170e5e',
                    border: 'none',
                    color: '#ffffff',
                    borderRadius: '8px',
                    padding: '7px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <PlusCircleIcon size={14} />
                  <span>{isAddingDoc ? 'إلغاء' : 'إضافة وثيقة / لائحة'}</span>
                </button>
              </div>
            </div>

            {/* Add Document Form */}
            {isAddingDoc && (
              <div
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #cbd5e1',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ fontSize: '13.5px', fontWeight: 800, color: '#0f172a' }}>
                  إضافة مستند أو لائحة جديدة للمستودع الدلالي
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      عنوان المستند / اللائحة
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: سياسة الائتمان وفترات السماح للشركات"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12.5px',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      نوع المحتوى
                    </label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        fontSize: '12.5px',
                        background: '#ffffff',
                        boxSizing: 'border-box',
                      }}
                    >
                      <option value="policy">لائحة وسياسة عمل</option>
                      <option value="catalog">كتالوج ومواصفات أصناف</option>
                      <option value="manual">دليل تشغيل وإرشادات</option>
                      <option value="contract">شروط تعاقدية وضمان</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                    النص الكامل أو محتوى الوثيقة
                  </label>
                  <textarea
                    rows={5}
                    placeholder="الصق نص اللائحة أو المواصفات هنا ليتم تقطيعه وتضمينه شعاعياً في قاعدة البيانات..."
                    value={docContent}
                    onChange={(e) => setDocContent(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '12.5px',
                      lineHeight: 1.5,
                      boxSizing: 'border-box',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setIsAddingDoc(false)}
                    style={{
                      padding: '7px 16px',
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      cursor: 'pointer',
                    }}
                  >
                    إلغاء
                  </button>
                  <button
                    type="button"
                    onClick={() => addDocMutation.mutate()}
                    disabled={!docTitle.trim() || !docContent.trim() || addDocMutation.isPending}
                    style={{
                      padding: '7px 18px',
                      background: '#170e5e',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {addDocMutation.isPending ? 'جاري التضمين...' : 'حفظ وتضمين في الـ AI'}
                  </button>
                </div>
              </div>
            )}

            {/* Sources List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>
                المستندات والكتالوجات المفهرسة حالياً ({sources.length})
              </div>

              {isLoadingSources ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  جاري تحميل مصادر المعرفة...
                </div>
              ) : sources.length === 0 ? (
                <div
                  style={{
                    background: '#ffffff',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '10px',
                    padding: '32px 16px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '13px',
                  }}
                >
                  لا توجد وثائق مدربة حتى الآن. اضغط على "إضافة وثيقة" لرفع لوائحك، أو "فهرسة الأصناف تلقائياً" ليقرأ زاد كتالوج متجرك فوراً!
                </div>
              ) : (
                sources.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '8px',
                          background: '#eff6ff',
                          color: '#1e40af',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <FileTextIcon size={18} />
                      </div>

                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a' }}>{s.title}</div>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '3px', fontSize: '11px', color: '#64748b' }}>
                          <span style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: '4px' }}>
                            {s.source_type === 'catalog_auto' ? 'كتالوج تلقائي' : s.source_type}
                          </span>
                          <span>•</span>
                          <span>{s.chunk_count} فقرة دلالية</span>
                          <span>•</span>
                          <span style={{ color: '#059669', fontWeight: 700 }}>جاهز ومفهرس</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteDocMutation.mutate(s.id)}
                      disabled={deleteDocMutation.isPending}
                      title="حذف الوثيقة"
                      style={{
                        background: '#fff1f2',
                        border: '1px solid #ffe4e6',
                        color: '#be123c',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <TrashIcon size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </DialogShell>
  );
}
