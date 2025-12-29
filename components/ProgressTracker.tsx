
import React, { useState } from 'react';
import { WeightEntry } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ProgressTrackerProps {
  weightHistory: WeightEntry[];
  setWeightHistory: React.Dispatch<React.SetStateAction<WeightEntry[]>>;
}

const ProgressTracker: React.FC<ProgressTrackerProps> = ({ weightHistory, setWeightHistory }) => {
  const [currentWeight, setCurrentWeight] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date().toISOString().split('T')[0]);

  const addWeightEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentWeight && currentDate) {
      const newEntry: WeightEntry = {
        date: currentDate,
        weight: parseFloat(currentWeight),
      };
      setWeightHistory(prev => {
        // Remove existing entry for the same date if any, then add new one
        const filteredHistory = prev.filter(entry => entry.date !== newEntry.date);
        const updatedHistory = [...filteredHistory, newEntry].sort((a, b) => a.date.localeCompare(b.date));
        return updatedHistory;
      });
      setCurrentWeight('');
    }
  };

  const deleteWeightEntry = (date: string) => {
    setWeightHistory(prev => prev.filter(entry => entry.date !== date));
  };

  const chartData = weightHistory.map(entry => ({
    date: entry.date,
    weight: entry.weight,
  }));

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <h2 className="text-4xl md:text-5xl font-bold text-green-800 mb-8 text-center">
        <i className="fas fa-chart-line text-green-500 mr-3"></i> İlerleme Takibi
      </h2>
      <p className="text-lg text-green-700 max-w-2xl mx-auto text-center mb-10">
        Kilo bilgilerinizi kaydedin ve zaman içindeki değişiminizi grafik üzerinde takip edin.
      </p>

      <div className="bg-white p-8 rounded-3xl shadow-xl border border-green-50 space-y-8 mb-8">
        <h3 className="text-2xl font-bold text-green-900 flex items-center gap-2">
          <i className="fas fa-plus-circle text-green-500"></i> Yeni Kilo Girişi
        </h3>
        <form onSubmit={addWeightEntry} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label htmlFor="weight" className="block text-sm font-semibold text-green-700 mb-1">Kilo (kg)</label>
            <input
              type="number"
              id="weight"
              value={currentWeight}
              onChange={(e) => setCurrentWeight(e.target.value)}
              required
              min="20"
              max="300"
              step="0.1"
              className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none transition"
              placeholder="75.5"
            />
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-semibold text-green-700 mb-1">Tarih</label>
            <input
              type="date"
              id="date"
              value={currentDate}
              onChange={(e) => setCurrentDate(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-xl border border-green-100 focus:ring-2 focus:ring-green-500 outline-none transition"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2.5 rounded-xl font-bold hover:bg-green-700 shadow-lg shadow-green-200 transition-all"
            >
              Kaydet <i className="fas fa-save ml-2"></i>
            </button>
          </div>
        </form>
      </div>

      {weightHistory.length > 0 ? (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-green-50">
          <h3 className="text-2xl font-bold text-green-900 flex items-center gap-2 mb-6">
            <i className="fas fa-chart-area text-blue-500"></i> Kilo Gelişim Grafiği
          </h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0f2f1" />
                <XAxis dataKey="date" tickFormatter={(dateStr) => new Date(dateStr).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })} />
                <YAxis unit="kg" domain={['auto', 'auto']} />
                <Tooltip />
                <Line type="monotone" dataKey="weight" stroke="#10b981" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <h3 className="text-2xl font-bold text-green-900 flex items-center gap-2 mt-12 mb-6">
            <i className="fas fa-history text-orange-500"></i> Geçmiş Kayıtlar
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white rounded-xl shadow-inner">
              <thead>
                <tr className="bg-green-50 text-green-700 text-left text-sm font-semibold uppercase tracking-wider">
                  <th className="py-3 px-6 rounded-tl-xl">Tarih</th>
                  <th className="py-3 px-6">Kilo (kg)</th>
                  <th className="py-3 px-6 rounded-tr-xl text-right">Aksiyon</th>
                </tr>
              </thead>
              <tbody>
                {weightHistory.map((entry, index) => (
                  <tr key={entry.date} className="border-b border-green-50 last:border-b-0 hover:bg-green-50/50">
                    <td className="py-3 px-6 font-medium text-green-900">{new Date(entry.date).toLocaleDateString('tr-TR')}</td>
                    <td className="py-3 px-6 text-green-800">{entry.weight} kg</td>
                    <td className="py-3 px-6 text-right">
                      <button 
                        onClick={() => deleteWeightEntry(entry.date)} 
                        className="text-red-500 hover:text-red-700 transition"
                        aria-label={`Sil: ${entry.date} ${entry.weight}kg`}
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-green-50 text-center text-green-700">
          <i className="fas fa-chart-line text-green-400 text-5xl mb-4"></i>
          <p className="text-lg font-medium">Henüz bir kilo kaydınız bulunmuyor. İlk girişinizi yapın!</p>
        </div>
      )}
    </div>
  );
};

export default ProgressTracker;