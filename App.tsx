
import React, { useState, useEffect } from 'react';
import { Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import Header from './components/Header';
import UserForm from './components/UserForm';
import DietDashboard from './components/DietDashboard';
import LoadingState from './components/LoadingState';
import QuestionStep from './components/QuestionStep';
import { UserData, DietPlan, WeightEntry } from './types';
import { analyzeAndAsk, generateFinalPlan } from './services/geminiService';
import { getDietPlan } from './services/firebase';
import { translations } from './src/translations';

const Home: React.FC = () => {
  const { planId } = useParams<{ planId?: string }>();
  const navigate = useNavigate();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [pendingQuestions, setPendingQuestions] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputPlanId, setInputPlanId] = useState('');

  const [lang, setLang] = useState<'tr' | 'en'>(() => (localStorage.getItem('lang') as 'tr' | 'en') || 'tr');
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
  
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>(() => {
    try {
      const storedHistory = localStorage.getItem('weightHistory');
      return storedHistory ? JSON.parse(storedHistory) : [];
    } catch (e) {
      console.error("Failed to parse weight history from localStorage", e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('weightHistory', JSON.stringify(weightHistory));
  }, [weightHistory]);

  // Load plan from Firebase if planId is present
  useEffect(() => {
    const loadPlan = async () => {
      if (planId) {
        setLoading(true);
        setError(null);
        try {
          const result = await getDietPlan(planId);
          if (result) {
            setUserData(result.userData);
            setDietPlan(result.plan);
          } else {
            setError(t('notFound'));
          }
        } catch (err: any) {
          setError(t('loadError'));
        } finally {
          setLoading(false);
        }
      }
    };
    loadPlan();
  }, [planId, lang]);

  // Sadece diyet akışını sıfırlayan fonksiyon
  const clearDietFlow = () => {
    setUserData(null);
    setDietPlan(null);
    setPendingQuestions(null);
    setError(null);
    setLoading(false);
    if (planId) navigate('/');
  };

  // Tam sıfırlama (Logo veya Yeni Plan tıklandığında)
  const handleFullReset = () => {
    clearDietFlow();
  };

  const handleGetPlanById = () => {
    if (inputPlanId.trim().length === 10) {
      navigate(`/ID/${inputPlanId.trim()}`);
    }
  };

  const handleFormSubmit = async (data: UserData) => {
    setLoading(true);
    setError(null);
    setUserData(data);
    try {
      const result = await analyzeAndAsk(data);
      if (result.type === 'questions' && result.questions) {
        setPendingQuestions(result.questions);
      } else if (result.plan) {
        setDietPlan(result.plan);
      }
    } catch (err: any) {
      setError(err.message || t('loadError'));
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionsSubmit = async (answers: Record<string, string>) => {
    if (!userData) return;
    setLoading(true);
    try {
      const plan = await generateFinalPlan(userData, answers);
      setDietPlan(plan);
      setPendingQuestions(null);
    } catch (err: any) {
      setError(t('loadError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header 
        onReset={handleFullReset} 
      />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* Form Görünümü: Hiçbir veri yoksa ve yükleme yapılmıyorsa */}
            {!userData && !loading && !dietPlan && !pendingQuestions && (
              <motion.div 
                key="home"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-4xl mx-auto"
              >
                <div className="text-center mb-10">
                  <h1 className="text-4xl md:text-5xl font-bold text-green-800 mb-4">
                    {t('heroTitle')}
                  </h1>
                  <p className="text-lg text-green-700 max-w-2xl mx-auto">
                    {t('heroSubtitle')}
                  </p>
                </div>

                {/* Plan Kod Girişi */}
                <div className="max-w-md mx-auto mb-12 bg-white p-6 rounded-2xl shadow-sm border border-green-100">
                  <h2 className="text-sm font-bold text-green-800 mb-3 uppercase tracking-wider text-center">{t('haveCode')}</h2>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder={t('codePlaceholder')}
                      value={inputPlanId}
                      onChange={(e) => setInputPlanId(e.target.value)}
                      maxLength={10}
                      className="flex-grow px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none font-mono uppercase"
                    />
                    <button 
                      onClick={handleGetPlanById}
                      disabled={inputPlanId.length !== 10}
                      className="px-6 py-2 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all disabled:opacity-50 disabled:grayscale active:scale-95"
                    >
                      {t('getPlan')}
                    </button>
                  </div>
                </div>

                <UserForm onSubmit={handleFormSubmit} />
              </motion.div>
            )}

            {loading && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <LoadingState />
              </motion.div>
            )}

            {error && (
              <motion.div 
                key="error"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="max-w-2xl mx-auto bg-red-50 border border-red-200 p-6 rounded-2xl text-center"
              >
                <i className="fas fa-exclamation-triangle text-red-500 text-3xl mb-4"></i>
                <p className="text-red-800 font-medium mb-4">{error}</p>
                <button onClick={handleFullReset} className="px-6 py-2 bg-red-600 text-white rounded-xl active:scale-95">{t('backToHome')}</button>
              </motion.div>
            )}

            {pendingQuestions && !loading && (
              <motion.div 
                key="questions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <QuestionStep 
                  questions={pendingQuestions} 
                  onSubmit={handleQuestionsSubmit} 
                  onCancel={handleFullReset}
                />
              </motion.div>
            )}

            {dietPlan && !loading && (
              <motion.div 
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <DietDashboard 
                  plan={dietPlan} 
                  userData={userData!} 
                  onReset={handleFullReset}
                  weightHistory={weightHistory}
                  planId={planId}
                  onUpdatePlan={(updatedPlan) => setDietPlan(updatedPlan)}
                />
              </motion.div>
            )}
          </AnimatePresence>
      </main>

      <footer className="py-6 text-center text-green-600 text-sm border-t border-green-100 mt-auto no-print">
        <p>{t('footerNote')}</p>
      </footer>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/ID/:planId" element={<Home />} />
    </Routes>
  );
};

export default App;
