
import React, { useState } from 'react';

interface QuestionStepProps {
  questions: string[];
  onSubmit: (answers: Record<string, string>) => void;
  onCancel: () => void;
}

const QuestionStep: React.FC<QuestionStepProps> = ({ questions, onSubmit, onCancel }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(answers);
  };

  return (
    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500">
      <div className="bg-white p-8 rounded-3xl shadow-xl border border-green-50">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg shadow-green-200">
            <i className="fas fa-robot"></i>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-green-900">Harika Bilgiler!</h2>
            <p className="text-green-600">Planını mükemmelleştirmek için birkaç detay daha sorabilir miyim?</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {questions.map((question, idx) => (
            <div key={idx} className="space-y-2">
              <label className="block text-sm font-bold text-green-800 ml-1">
                {question}
              </label>
              <textarea
                required
                className="w-full px-4 py-3 rounded-2xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none transition min-h-[100px] bg-green-50/30"
                placeholder="Yanıtınızı buraya yazın..."
                onChange={(e) => setAnswers(prev => ({ ...prev, [question]: e.target.value }))}
              />
            </div>
          ))}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-4 rounded-2xl font-bold text-green-700 bg-green-50 hover:bg-green-100 transition"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              className="flex-[2] bg-green-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-700 shadow-xl shadow-green-200 transition-all"
            >
              Planı Tamamla <i className="fas fa-arrow-right ml-2"></i>
            </button>
          </div>
        </form>
      </div>
      
      <p className="text-center text-green-500 text-sm mt-6 italic">
        "Bu detaylar porsiyonları ve yemek türlerini yaşam tarzınıza daha iyi uydurmamı sağlayacak."
      </p>
    </div>
  );
};

export default QuestionStep;