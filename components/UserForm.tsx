
import React, { useState } from 'react';
import { UserData } from '../types';

interface UserFormProps {
  onSubmit: (data: UserData) => void;
}

const UserForm: React.FC<UserFormProps> = ({ onSubmit }) => {
  const [formData, setFormData] = useState<Partial<UserData>>({
    gender: 'male',
    activityLevel: 'moderate',
    goal: 'maintain',
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
    if (formData.age && formData.weight && formData.height) {
      onSubmit(formData as UserData);
    }
  };

  const dietaryOptions = ["Vegan", "Vejetaryen", "Glutensiz", "Laktozsuz", "Ketojenik", "Düşük Karbonhidrat", "Akdeniz Diyeti"];

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl shadow-xl shadow-green-900/5 border border-green-50/50 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Basic Stats */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-green-900 flex items-center gap-2">
            <i className="fas fa-user-circle text-green-500"></i> Kişisel Bilgiler
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-green-700 mb-1">Yaş</label>
              <input 
                type="number" name="age" required min="1" max="120"
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition"
                placeholder="25"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-green-700 mb-1">Cinsiyet</label>
              <select 
                name="gender" onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none"
              >
                <option value="male">Erkek</option>
                <option value="female">Kadın</option>
                <option value="other">Diğer</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-green-700 mb-1">Kilo (kg)</label>
              <input 
                type="number" name="weight" required min="20" max="300" step="0.1"
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none"
                placeholder="70"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-green-700 mb-1">Boy (cm)</label>
              <input 
                type="number" name="height" required min="100" max="250"
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
            <i className="fas fa-bullseye text-green-500"></i> Hedef ve Yaşam Tarzı
          </h3>
          
          <div>
            <label className="block text-sm font-semibold text-green-700 mb-1">Aktivite Seviyesi</label>
            <select 
              name="activityLevel" onChange={handleChange}
              className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="sedentary">Hareketsiz (Masa başı iş)</option>
              <option value="light">Az Hareketli (Haftada 1-2 gün spor)</option>
              <option value="moderate">Orta Hareketli (Haftada 3-5 gün spor)</option>
              <option value="active">Çok Hareketli (Haftada 6-7 gün spor)</option>
              <option value="very_active">Profesyonel Sporcu / Fiziksel İş</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-green-700 mb-1">Beslenme Hedefi</label>
            <select 
              name="goal" onChange={handleChange}
              className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none"
            >
              <option value="lose">Kilo Vermek</option>
              <option value="maintain">Kiloyu Korumak</option>
              <option value="gain">Kas/Kilo Almak</option>
            </select>
          </div>
        </div>
      </div>

      {/* Preferences & Restrictions */}
      <div className="space-y-6 pt-4 border-t border-green-50">
        <h3 className="text-xl font-bold text-green-900 flex items-center gap-2">
          <i className="fas fa-cookie-bite text-green-500"></i> Tercihler ve Kısıtlamalar
        </h3>
        
        <div>
          <label className="block text-sm font-semibold text-green-700 mb-3">Beslenme Tipi</label>
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
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-green-700 mb-1 flex items-center gap-2">
              <i className="fas fa-skull-crossbones text-red-400 text-xs"></i> Alerjiler
            </label>
            <input 
              type="text"
              name="allergies"
              onChange={handleChange}
              placeholder="Örn: Yer fıstığı, çilek..."
              className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none transition"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-green-700 mb-1 flex items-center gap-2">
              <i className="fas fa-thumbs-down text-orange-400 text-xs"></i> Sevmediğim Yiyecekler
            </label>
            <input 
              type="text"
              name="dislikedFoods"
              onChange={handleChange}
              placeholder="Örn: Bamya, ciğer..."
              className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-green-700 mb-1">Kronik Rahatsızlıklar</label>
            <textarea 
              name="medicalConditions"
              onChange={handleChange}
              placeholder="Örn: İnsülin direnci..."
              className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none min-h-[80px]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-green-700 mb-1 flex items-center gap-2">
              <i className="fas fa-comment-dots text-blue-500 text-xs"></i> Ek Mesaj / Özel İstekler
            </label>
            <textarea 
              name="extraNotes"
              onChange={handleChange}
              placeholder="Örn: Ekonomik bir liste olsun, öğle yemeğini dışarıda yiyeceğim, pratik tarifler olsun..."
              className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none min-h-[80px]"
            />
          </div>
        </div>
      </div>

      <button 
        type="submit"
        className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-700 shadow-xl shadow-green-200 transition-all hover:-translate-y-1"
      >
        Özel Diyet Listemi Oluştur <i className="fas fa-magic ml-2"></i>
      </button>
    </form>
  );
};

export default UserForm;