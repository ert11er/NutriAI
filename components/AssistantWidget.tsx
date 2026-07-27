import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { DietPlan, UserData } from '../types';
import { translations } from '../src/translations';
import { updateDietPlan } from '../services/firebase';

interface ProposedEdit {
  id: string;
  title: string;
  description: string;
  newPlan: DietPlan;
  status: 'pending' | 'approved' | 'rejected';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  proposedEdit?: ProposedEdit | null;
}

interface AssistantWidgetProps {
  plan: DietPlan | null;
  userData: UserData | null;
  onUpdatePlan: (updatedPlan: DietPlan) => void;
  planId?: string;
}

export const AssistantWidget: React.FC<AssistantWidgetProps> = ({
  plan,
  userData,
  onUpdatePlan,
  planId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lang, setLang] = useState<'tr' | 'en'>(
    () => (localStorage.getItem('lang') as 'tr' | 'en') || 'tr'
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = (key: any) => {
    const section = translations[lang];
    return (section as any)[key] || key;
  };

  useEffect(() => {
    const handleLanguageChange = () => {
      setLang((localStorage.getItem('lang') as 'tr' | 'en') || 'tr');
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const [messages, setMessages] = useState<Message[]>([]);

  // Initialize welcome message once
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          text: t('assistantWelcome'),
          timestamp: new Date(),
        },
      ]);
    }
  }, [lang]);

  // Scroll to bottom when messages change or drawer opens
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isLoading]);

  const handleSend = async (customText?: string) => {
    const messageText = customText || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      text: messageText,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    if (!customText) setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, text: m.text })),
          plan,
          userData,
          lang,
        }),
      });

      if (!res.ok) {
        throw new Error('Server error');
      }

      const data = await res.json();

      let proposedEditObj: ProposedEdit | null = null;
      if (data.proposedEdit && data.proposedEdit.newPlan) {
        proposedEditObj = {
          id: Date.now().toString() + '_edit',
          title: data.proposedEdit.title || (lang === 'tr' ? 'Plan Düzenleme Teklifi' : 'Plan Edit Proposal'),
          description: data.proposedEdit.description || '',
          newPlan: data.proposedEdit.newPlan,
          status: 'pending',
        };
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        text: data.message || (lang === 'tr' ? 'Yanıt oluşturulamadı.' : 'Could not generate response.'),
        timestamp: new Date(),
        proposedEdit: proposedEditObj,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error contacting AI assistant:', error);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'assistant',
          text:
            lang === 'tr'
              ? 'Üzgünüm, şu an bağlantıda bir sorun oluştu. Lütfen tekrar deneyin.'
              : 'Sorry, a connection error occurred. Please try again.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveEdit = async (messageId: string, proposedEdit: ProposedEdit) => {
    // Apply changes to parent state
    onUpdatePlan(proposedEdit.newPlan);

    // If planId exists, sync to Firestore
    if (planId && userData) {
      try {
        await updateDietPlan(planId, userData, proposedEdit.newPlan);
      } catch (e) {
        console.error('Failed to update plan in Firestore:', e);
      }
    }

    // Mark edit as approved in local message state
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.proposedEdit) {
          return {
            ...msg,
            proposedEdit: { ...msg.proposedEdit, status: 'approved' },
          };
        }
        return msg;
      })
    );

    // Add confirmation message
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        text:
          lang === 'tr'
            ? '✅ Teklifi onayladınız. Diyet planınız başarıyla güncellendi!'
            : '✅ You approved the proposal. Your diet plan has been updated!',
        timestamp: new Date(),
      },
    ]);
  };

  const handleRejectEdit = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.proposedEdit) {
          return {
            ...msg,
            proposedEdit: { ...msg.proposedEdit, status: 'rejected' },
          };
        }
        return msg;
      })
    );

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        role: 'assistant',
        text:
          lang === 'tr'
            ? '❌ Teklif reddedildi. Planınızda hiçbir değişiklik yapılmadı.'
            : '❌ Proposal rejected. No changes were made to your plan.',
        timestamp: new Date(),
      },
    ]);
  };

  const quickPrompts = lang === 'tr' ? [
    'Bugünkü öğünlerim neler?',
    'Salı kahvaltısını yulaf yap',
    'Günlük kalorimi 100 kcal artır',
    'Vejetaryen alternatif öner'
  ] : [
    "What are my meals today?",
    "Change Tuesday breakfast to oatmeal",
    "Increase daily calories by 100",
    "Suggest vegetarian swap"
  ];

  return createPortal(
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] no-print flex flex-col items-end pointer-events-none">
      <div className="pointer-events-auto flex flex-col items-end max-w-[calc(100vw-2rem)]">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-[calc(100vw-2rem)] sm:w-96 md:w-[380px] h-[460px] max-h-[calc(100vh-100px)] bg-white rounded-3xl shadow-2xl border border-emerald-100 flex flex-col overflow-hidden mb-3"
            >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 flex items-center justify-between shadow-md">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white font-black">
                  <i className="fas fa-robot text-lg"></i>
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">{t('assistantTitle')}</h3>
                  <div className="flex items-center space-x-1.5 text-xs text-emerald-100 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                    <span className="font-medium text-[11px]">{t('assistantBadge')}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label="Close Assistant"
              >
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scroll-smooth">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : 'bg-white text-slate-800 border border-slate-100 rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* Proposed Edit Consent Box */}
                    {msg.proposedEdit && (
                      <div className="mt-3.5 p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl text-slate-800">
                        <div className="flex items-center space-x-2 text-amber-800 font-bold text-xs mb-1.5 uppercase tracking-wide">
                          <i className="fas fa-bolt text-amber-500"></i>
                          <span>{msg.proposedEdit.title || t('assistantProposalTitle')}</span>
                        </div>
                        <p className="text-xs text-slate-700 font-medium mb-3">
                          {msg.proposedEdit.description}
                        </p>

                        {msg.proposedEdit.status === 'pending' && (
                          <div className="flex items-center space-x-2 pt-1">
                            <button
                              onClick={() => handleApproveEdit(msg.id, msg.proposedEdit!)}
                              className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center space-x-1.5"
                            >
                              <i className="fas fa-check text-xs"></i>
                              <span>{t('assistantApprove')}</span>
                            </button>
                            <button
                              onClick={() => handleRejectEdit(msg.id)}
                              className="py-2 px-3 bg-slate-200 hover:bg-slate-300 active:scale-95 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center space-x-1"
                            >
                              <i className="fas fa-times text-xs"></i>
                              <span>{t('assistantReject')}</span>
                            </button>
                          </div>
                        )}

                        {msg.proposedEdit.status === 'approved' && (
                          <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-bold bg-emerald-100/80 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                            <i className="fas fa-check-circle"></i>
                            <span>{t('assistantApproved')}</span>
                          </div>
                        )}

                        {msg.proposedEdit.status === 'rejected' && (
                          <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-bold bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200">
                            <i className="fas fa-ban"></i>
                            <span>{t('assistantRejected')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 px-1">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 text-slate-500 rounded-2xl rounded-bl-none p-3 shadow-sm flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce [animation-delay:0.4s]"></div>
                    <span className="text-xs text-emerald-700 font-medium ml-1">
                      {lang === 'tr' ? 'NutriAI düşünüyor...' : 'NutriAI is thinking...'}
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            <div className="px-3 py-2 bg-white border-t border-slate-100 overflow-x-auto whitespace-nowrap scrollbar-hide flex space-x-2">
              {quickPrompts.map((qp, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(qp)}
                  disabled={isLoading}
                  className="px-2.5 py-1 text-[11px] font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200/60 transition-colors flex-none disabled:opacity-50"
                >
                  {qp}
                </button>
              ))}
            </div>

            {/* Input Footer */}
            <div className="p-3 bg-white border-t border-slate-100 flex items-center space-x-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={t('assistantPlaceholder')}
                disabled={isLoading}
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all placeholder:text-slate-400"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-40 text-white flex items-center justify-center transition-all shadow-md shadow-emerald-200"
              >
                <i className="fas fa-paper-plane text-xs"></i>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button (FAB) */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.92 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative group w-14 h-14 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white rounded-full shadow-2xl flex items-center justify-center border-2 border-white ring-4 ring-emerald-500/20 transition-all cursor-pointer mr-2 mb-2 sm:mr-0 sm:mb-0"
        aria-label="Toggle AI Assistant"
      >
        <div className="relative flex items-center justify-center text-white">
          <i className={`fas ${isOpen ? 'fa-times' : 'fa-robot'} text-xl transition-transform duration-200`}></i>
          {!isOpen && (
            <>
              <span className="absolute -top-2 -right-2 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-emerald-800 animate-ping"></span>
              <span className="absolute -top-2 -right-2 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-emerald-800"></span>
            </>
          )}
        </div>
      </motion.button>
    </div>
  </div>,
  document.body
);
};

export default AssistantWidget;
