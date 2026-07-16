
import React, { useState, useEffect } from 'react';
import { UserData } from '../types';
import { translations } from '../src/translations';

interface UserFormProps {
  onSubmit: (data: UserData) => void;
}

const UserForm: React.FC<UserFormProps> = ({ onSubmit }) => {
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

  const [formData, setFormData] = useState<Partial<UserData>>({
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'maintain',
    duration: '1_week',
    restrictions: [],
    allergies: '',
    dislikedFoods: '',
    medicalConditions: '',
    extraNotes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRestrictionToggle = (restriction: string) => {
    setFormData(prev => {
      const current = prev.restrictions || [];
      if (current.includes(restriction)) {
        return { ...prev, restrictions: current.filter(r => r !== restriction) };
      }
      return { ...prev, restrictions: [...current, restriction] };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData as UserData);
  };

  const dietaryOptions = ["Vegan", "Vejetaryen", "Glutensiz", "Laktozsuz", "Ketojenik", "Düşük Karbonhidrat", "Akdeniz Diyeti"];

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl shadow-green-900/5 border border-green-50/50 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Basic Stats */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-green-900 flex items-center gap-2">
            <i className="fas fa-user-circle text-green-500"></i> {t('personalInfo')}
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-green-700 mb-1">{t('age')}</label>
              <input 
                type="number" name="age" min="1" max="120"
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                placeholder="25"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-green-700 mb-1">{t('gender')}</label>
              <select 
                name="gender" onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none"
              >
                <option value="male">{t('genderMale')}</option>
                <option value="female">{t('genderFemale')}</option>
                <option value="other">{t('genderOther')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-green-700 mb-1">{t('weight')}</label>
              <input 
                type="number" name="weight" min="20" max="300" step="0.1"
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="70"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-green-700 mb-1">{t('height')}</label>
              <input 
                type="number" name="height" min="100" max="250"
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="175"
              />
            </div>
          </div>
        </div>

        {/* Goals and Activity */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-green-900 flex items-center gap-2">
            <i className="fas fa-bullseye text-green-500"></i> {t('goalAndLifestyle')}
          </h3>
          
          <div>
            <label className="block text-sm font-semibold text-green-700 mb-1">{t('activityLevel')}</label>
            <select 
              name="activityLevel" onChange={handleChange}
              className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="sedentary">{t('activitySedentary')}</option>
              <option value="light">{t('activityLight')}</option>
              <option value="moderate">{t('activityModerate')}</option>
              <option value="active">{t('activityActive')}</option>
              <option value="very_active">{t('activityVeryActive')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-green-700 mb-1">{t('nutritionGoal')}</label>
            <select 
              name="goal" onChange={handleChange}
              className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="lose">{t('goalLose')}</option>
              <option value="maintain">{t('goalMaintain')}</option>
              <option value="gain">{t('goalGain')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-green-700 mb-1">{t('dietDuration')}</label>
            <select 
              name="duration" value={formData.duration || '1_week'} onChange={handleChange}
              className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none font-medium"
            >
              <option value="5_days">{t('duration5Days')}</option>
              <option value="1_week">{t('duration1Week')}</option>
              <option value="2_weeks">{t('duration2Weeks')}</option>
              <option value="1_month">{t('duration1Month')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Preferences & Restrictions */}
      <div className="space-y-6 pt-4 border-t border-green-50">
        <h3 className="text-xl font-bold text-green-900 flex items-center gap-2">
          <i className="fas fa-cookie-bite text-green-500"></i> {t('preferencesAndRestrictions')}
        </h3>
        
        <div>
          <label className="block text-sm font-semibold text-green-700 mb-3">{t('dietType')}</label>
          <div className="flex flex-wrap gap-2">
            {dietaryOptions.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => handleRestrictionToggle(opt)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  formData.restrictions?.includes(opt) 
                  ? 'bg-green-600 text-white shadow-lg shadow-green-200' 
                  : 'bg-green-50 text-green-700 hover:bg-green-100'
                }`}
              >
                {t(opt)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-green-700 mb-1 flex items-center gap-2">
              <i className="fas fa-skull-crossbones text-red-400 text-xs"></i> {t('allergies')}
            </label>
            <input 
              type="text"
              name="allergies"
              onChange={handleChange}
              placeholder={t('allergiesPlaceholder')}
              className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-green-700 mb-1 flex items-center gap-2">
              <i className="fas fa-thumbs-down text-orange-400 text-xs"></i> {t('dislikedFoods')}
            </label>
            <input 
              type="text"
              name="dislikedFoods"
              onChange={handleChange}
              placeholder={t('dislikedPlaceholder')}
              className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-green-700 mb-1">{t('chronicConditions')}</label>
            <textarea 
              name="medicalConditions"
              onChange={handleChange}
              placeholder={t('chronicPlaceholder')}
              className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none min-h-[80px]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-green-700 mb-1 flex items-center gap-2">
              <i className="fas fa-comment-dots text-blue-500 text-xs"></i> {t('extraNotes')}
            </label>
            <textarea 
              name="extraNotes"
              onChange={handleChange}
              placeholder={t('extraNotesPlaceholder')}
              className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none min-h-[80px]"
            />
          </div>
        </div>
      </div>

      <button 
        type="submit"
        className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-700 shadow-xl shadow-green-200 transition-all hover:-translate-y-1"
      >
        {t('createDietPlan')} <i className="fas fa-magic ml-2"></i>
      </button>
    </form>
  );
};

export default UserForm;