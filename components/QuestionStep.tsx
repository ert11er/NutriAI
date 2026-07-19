
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { translations } from '../src/translations';

interface QuestionStepProps {
  questions: string[];
  onSubmit: (answers: Record<string, string>) => void;
  onCancel: () => void;
}

const QuestionStep: React.FC<QuestionStepProps> = ({ questions, onSubmit, onCancel }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [lang, setLang] = useState<'tr' | 'en'>(() => (localStorage.getItem('lang') as 'tr' | 'en') || 'tr');

  const t = (key: keyof typeof translations.tr) => {
    return translations[lang][key] || key;
  };

  useEffect(() => {
    const handleLanguageChange = () => {
      setLang((localStorage.getItem('lang') as 'tr' | 'en') || 'tr');
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(answers);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
      className="max-w-2xl mx-auto"
    >
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-green-50">
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-4 mb-8"
        >
          <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-green-200">
            <i className="fas fa-robot"></i>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-green-900">{t('questionsTitle')}</h2>
            <p className="text-green-600">{t('questionsSubtitle')}</p>
          </div>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence mode="popLayout">
            {questions.map((question, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * idx }}
                className="space-y-2"
              >
                <label className="block text-sm font-bold text-green-800 ml-1 border-b-2 border-dashed border-blue-400 pb-1 mb-2 inline-block">
                  {question}
                </label>
                <textarea
                  required
                  className="w-full px-4 py-3 rounded-2xl border-2 border-dashed border-blue-400 focus:ring-2 focus:ring-blue-500 outline-none transition min-h-[100px] bg-white"
                  placeholder={t('questionPlaceholder')}
                  onChange={(e) => setAnswers(prev => ({ ...prev, [question]: e.target.value }))}
                />
              </motion.div>
            ))}
          </AnimatePresence>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="flex gap-4 pt-4"
          >
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-4 rounded-2xl font-bold text-green-700 bg-green-50 hover:bg-green-100 transition active:scale-95"
            >
              {t('questionCancel')}
            </button>
            <button
              type="submit"
              className="flex-[2] bg-green-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-700 shadow-xl shadow-green-200 transition-all active:scale-95"
            >
              {t('questionComplete')} <i className="fas fa-arrow-right ml-2"></i>
            </button>
          </motion.div>
        </form>
      </div>
      
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-center text-green-500 text-sm mt-6 italic"
      >
        "{t('questionNote')}"
      </motion.p>
    </motion.div>
  );
};

export default QuestionStep;