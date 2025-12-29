
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UserForm from './components/UserForm';
import DietDashboard from './components/DietDashboard';
import LoadingState from './components/LoadingState';
import QuestionStep from './components/QuestionStep';
import ProgressTracker from './components/ProgressTracker'; // Yeni eklendi
import { UserData, DietPlan, WeightEntry } from './types';
import { analyzeAndAsk, generateFinalPlan } from './services/geminiService';

const App: React.FC = () => {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [dietPlan, setDietPlan] = useState<DietPlan | null>(null);
  const [pendingQuestions, setPendingQuestions] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProgressTracker, setShowProgressTracker] = useState(false); // Yeni state
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

  const handleFormSubmit = async (data: UserData) => {
    setLoading(true);
    setError(null);
    setUserData(data);
    setShowProgressTracker(false); // Form gönderildiğinde ilerleme takibini gizle
    try {
      const result = await analyzeAndAsk(data);
      if (result.type === 'questions' && result.questions) {
        setPendingQuestions(result.questions);
      } else if (result.plan) {
        setDietPlan(result.plan);
      }
    } catch (err: any) {
      setError(err.message || 'Analiz sırasında bir hata oluştu.');
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
      setError('Diyet planı oluşturulamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setUserData(null);
    setDietPlan(null);
    setPendingQuestions(null);
    setError(null);
    setShowProgressTracker(false); // Reset anında ilerleme takibini gizle
  };

  const toggleProgressTracker = () => {
    setShowProgressTracker(prev => !prev);
    if (!showProgressTracker) { // Eğer açılıyorsa diğer her şeyi gizle
      setUserData(null);
      setDietPlan(null);
      setPendingQuestions(null);
      setError(null);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header onReset={reset} onToggleProgressTracker={toggleProgressTracker} />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        {!userData && !loading && !showProgressTracker && (
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-bold text-green-800 mb-4">
                Kişiselleştirilmiş Yapay Zeka Diyetisyeniniz
              </h1>
              <p className="text-lg text-green-700 max-w-2xl mx-auto">
                Bilimsel temelli, kişiye özel beslenme programınızı interaktif bir şekilde oluşturun.
              </p>
            </div>
            <UserForm onSubmit={handleFormSubmit} />
          </div>
        )}

        {loading && <LoadingState />}

        {error && (
          <div className="max-w-2xl mx-auto bg-red-50 border border-red-200 p-6 rounded-2xl text-center">
            <i className="fas fa-exclamation-triangle text-red-500 text-3xl mb-4"></i>
            <p className="text-red-800 font-medium mb-4">{error}</p>
            <button onClick={reset} className="px-6 py-2 bg-red-600 text-white rounded-xl">Başa Dön</button>
          </div>
        )}

        {pendingQuestions && !loading && (
          <QuestionStep 
            questions={pendingQuestions} 
            onSubmit={handleQuestionsSubmit} 
            onCancel={reset}
          />
        )}

        {dietPlan && !loading && !showProgressTracker && (
          <DietDashboard 
            plan={dietPlan} 
            userData={userData!} 
            onReset={reset}
            weightHistory={weightHistory} // Pass weight history for potential use (e.g., target weight display)
          />
        )}

        {showProgressTracker && (
          <ProgressTracker 
            weightHistory={weightHistory} 
            setWeightHistory={setWeightHistory} 
          />
        )}
      </main>

      <footer className="py-6 text-center text-green-600 text-sm border-t border-green-100 mt-auto">
        <p>© 2024 NutriAI. Bu bir yapay zeka tavsiyesidir, tıbbi karar yerine geçmez.</p>
      </footer>
    </div>
  );
};

export default App;