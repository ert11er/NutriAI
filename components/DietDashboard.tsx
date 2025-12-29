
import React, { useState, useRef, useEffect } from 'react';
import { DietPlan, UserData, Meal, WeightEntry } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface DietDashboardProps {
  plan: DietPlan;
  userData: UserData;
  onReset: () => void;
  weightHistory: WeightEntry[];
}

const DietDashboard: React.FC<DietDashboardProps> = ({ plan, userData, onReset, weightHistory }) => {
  const [activeDay, setActiveDay] = useState(0);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [favoriteMeals, setFavoriteMeals] = useState<Set<string>>(new Set()); // Stores meal IDs
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false); // New state for PDF generation
  
  const dashboardRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null); // Ref for chart container to get dimensions

  useEffect(() => {
    try {
      const storedFavorites = localStorage.getItem('favoriteMeals');
      if (storedFavorites) {
        setFavoriteMeals(new Set(JSON.parse(storedFavorites)));
      }
    } catch (e) {
      console.error("Failed to load favorite meals from localStorage", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('favoriteMeals', JSON.stringify(Array.from(favoriteMeals)));
  }, [favoriteMeals]);

  const toggleExpandMeal = (mealId: string) => {
    setExpandedMeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mealId)) {
        newSet.delete(mealId);
      } else {
        newSet.add(mealId);
      }
      return newSet;
    });
  };

  const toggleFavoriteMeal = (mealId: string) => {
    setFavoriteMeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mealId)) {
        newSet.delete(mealId);
      } else {
        newSet.add(mealId);
      }
      return newSet;
    });
  };

  const calculateMacroPercentages = () => {
    const totalMacroCalories = (plan.macros.protein * 4) + (plan.macros.carbs * 4) + (plan.macros.fat * 9);
    if (totalMacroCalories === 0) return [];

    return [
      { name: 'Protein', value: ((plan.macros.protein * 4) / totalMacroCalories) * 100, color: '#10b981' }, // emerald-500
      { name: 'Karbonhidrat', value: ((plan.macros.carbs * 4) / totalMacroCalories) * 100, color: '#3b82f6' }, // blue-500
      { name: 'Yağ', value: ((plan.macros.fat * 9) / totalMacroCalories) * 100, color: '#f59e0b' }, // amber-500
    ].filter(item => item.value > 0); // Filter out zero values for cleaner chart
  };

  const macroData = calculateMacroPercentages();

  const currentDay = plan.weeklyPlan[activeDay];
  
  // Fix for NaN calculation: Ensure values are numbers
  const totalDayCalories = currentDay.meals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true); // Start PDF generation mode

    // Use requestAnimationFrame to ensure the DOM has updated
    // before html2pdf attempts to capture the content.
    // A double rAF is sometimes more robust for React state updates.
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const element = dashboardRef.current;
    if (!element) {
      setIsGeneratingPdf(false);
      return;
    }
    
    // Get actual dimensions of the chart container just before PDF generation
    // Fallback to a reasonable default if ref is not yet available or dimensions are 0
    const chartWidth = chartContainerRef.current?.offsetWidth || 192; 
    const chartHeight = chartContainerRef.current?.offsetHeight || 192;

    const opt = {
      margin: 10,
      filename: `NutriAI_Diyet_Plani_${userData.age}yas.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true,
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    // @ts-ignore
    await html2pdf().set(opt).from(element).save();

    setIsGeneratingPdf(false); // End PDF generation mode
  };

  const bmr = Math.round(10 * userData.weight + 6.25 * userData.height - 5 * userData.age + (userData.gender === 'male' ? 5 : -161));

  const generateShoppingList = () => {
    const allIngredients: Record<string, number> = {}; // { "item (unit)": quantity }
    plan.weeklyPlan.forEach(dayPlan => {
      dayPlan.meals.forEach(meal => {
        if (meal.ingredients) {
          meal.ingredients.forEach(ingredient => {
            // Simple parsing for now: assumes "2 adet elma" or "100g tavuk"
            const match = ingredient.match(/(\d+(?:\.\d+)?)\s*(kg|g|adet|ml|lt|kase|bardak|yemek kaşığı|çay kaşığı)?\s*(.*)/i);
            if (match) {
              const quantity = parseFloat(match[1]) || 1;
              const unit = (match[2] || '').toLowerCase(); // Ensure unit is lowercase or empty
              const item = match[3].trim().toLowerCase();
              
              const key = `${item}${unit ? ` (${unit})` : ''}`; // Combine item and unit for uniqueness
              allIngredients[key] = (allIngredients[key] || 0) + quantity;
            } else {
              const item = ingredient.trim().toLowerCase();
              allIngredients[item] = (allIngredients[item] || 0) + 1; // Default to 1 if no quantity
            }
          });
        }
      });
    });

    // Format for display (simple list, can be categorized later)
    return Object.entries(allIngredients)
      .map(([item, quantity]) => {
        // If the item key contains a unit, reformat it for better readability
        const match = item.match(/(.*)\s+\((.*)\)$/); // Match "item (unit)"
        if (match) {
          const formattedUnit = match[2]; // Use existing unit from key
          return `${quantity} ${formattedUnit}${formattedUnit ? ' ' : ''}${match[1]}`;
        }
        return `${quantity} ${item}`;
      })
      .sort();
  };

  const shoppingList = generateShoppingList();

  const allFavoriteMeals = plan.weeklyPlan.flatMap(dayPlan =>
    dayPlan.meals.filter(meal => favoriteMeals.has(meal.id))
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700" ref={dashboardRef}>
      {/* Overview Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-green-50 flex flex-col md:flex-row gap-8 relative overflow-hidden">
          <div className="flex-1 relative z-10">
            <h2 className="text-3xl font-extrabold text-green-950 mb-4 tracking-tight">Plan Özetiniz</h2>
            <p className="text-green-800/80 leading-relaxed font-medium mb-8">{plan.summary}</p>
            
            <div className="flex flex-wrap gap-4">
              <div className="bg-emerald-50/50 px-6 py-4 rounded-2xl border border-emerald-100 flex flex-col min-w-[140px]">
                <span className="text-[10px] text-emerald-600 font-extrabold uppercase tracking-widest mb-1">Günlük Kalori</span>
                <span className="text-2xl font-black text-emerald-900">{plan.dailyCalories} kcal</span>
              </div>
              <div className="bg-blue-50/50 px-6 py-4 rounded-2xl border border-blue-100 flex flex-col min-w-[140px]">
                <span className="text-[10px] text-blue-600 font-extrabold uppercase tracking-widest mb-1">Bazal Metabolizma</span>
                <span className="text-2xl font-black text-blue-900">~{bmr} kcal</span>
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-56 flex flex-col items-center justify-center relative z-10">
            <div className="w-full h-48" ref={chartContainerRef}>
              {isGeneratingPdf && chartContainerRef.current ? (
                 <PieChart width={chartContainerRef.current.offsetWidth} height={chartContainerRef.current.offsetHeight}>
                    <Pie
                      data={macroData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {macroData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]} />
                 </PieChart>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={macroData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={8}
                      dataKey="value"
                      stroke="none"
                    >
                      {macroData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* Custom Legend (visible in PDF) */}
            <div className="flex justify-center gap-4 text-[10px] font-bold mt-4"> 
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> P</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> C</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> F</span>
            </div>
          </div>
        </div>

        <div className="bg-[#064e3b] text-white p-8 rounded-[2rem] shadow-xl shadow-green-900/10">
          <h3 className="text-2xl font-black mb-6 flex items-center gap-3">
            <i className="fas fa-lightbulb text-amber-400"></i> Tavsiyeler
          </h3>
          <ul className="space-y-4">
            {(plan.tips || []).slice(0, 5).map((tip, i) => (
              <li key={i} className="flex gap-4 text-sm font-medium text-emerald-50/90 leading-snug">
                <i className="fas fa-check-circle text-emerald-400 mt-0.5 text-base shrink-0"></i>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Favorite Meals Section */}
      {allFavoriteMeals.length > 0 && (
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-green-50 animate-in fade-in duration-500">
          <h3 className="text-2xl font-black text-emerald-950 mb-6 flex items-center gap-3">
            <i className="fas fa-star text-yellow-500"></i> Favori Öğünleriniz
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allFavoriteMeals.map(meal => (
               <div key={meal.id} className="bg-yellow-50/30 p-6 rounded-2xl border border-yellow-100 relative">
                  <h4 className="text-lg font-bold text-yellow-900 mb-1">{meal.dish}</h4>
                  <p className="text-sm text-yellow-800 line-clamp-2">{meal.description}</p>
                  <button 
                    onClick={() => toggleFavoriteMeal(meal.id)}
                    className="absolute top-4 right-4 text-yellow-500 hover:text-yellow-600 transition"
                    aria-label="Favorilerden Kaldır"
                  >
                    <i className="fas fa-star"></i>
                  </button>
               </div>
            ))}
          </div>
        </div>
      )}


      {/* Daily Selection */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-green-50 overflow-hidden">
        <div className="flex overflow-x-auto p-5 gap-3 border-b border-green-50 scrollbar-hide no-print">
          {plan.weeklyPlan.map((day, idx) => (
            <button
              key={idx}
              onClick={() => setActiveDay(idx)}
              className={`px-8 py-3.5 rounded-2xl font-bold whitespace-nowrap transition-all duration-300 ${
                activeDay === idx 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 ring-4 ring-emerald-500/10 scale-105' 
                : 'text-emerald-700 hover:bg-emerald-50'
              }`}
              aria-current={activeDay === idx ? 'page' : undefined}
            >
              {day.day}
            </button>
          ))}
        </div>

        <div className="p-8 md:p-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
            <h3 className="text-3xl font-black text-emerald-950">{currentDay.day} Menüsü</h3>
            <div className="flex flex-wrap gap-3">
              <span className="bg-emerald-100/80 text-emerald-800 px-6 py-2.5 rounded-2xl text-sm font-black border border-emerald-200 dashed border-dashed">
                {totalDayCalories} Toplam Kalori
              </span>
              <button 
                onClick={handleDownloadPDF}
                className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-2xl shadow-lg shadow-emerald-100 transition-all active:scale-95 no-print flex items-center justify-center gap-2"
                title="PDF Olarak İndir"
                aria-label="Diyet planını PDF olarak indir"
                disabled={isGeneratingPdf} // Disable button while generating
              >
                {isGeneratingPdf ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-file-pdf"></i>}
                {isGeneratingPdf ? 'Oluşturuluyor...' : ''}
              </button>
              <button 
                onClick={() => setShowShoppingList(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-95 no-print"
                title="Alışveriş Listesi Oluştur"
                aria-label="Alışveriş Listesi Oluştur"
              >
                <i className="fas fa-shopping-basket"></i>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {currentDay.meals.map((meal, i) => (
              <div key={meal.id || `${currentDay.day}-${meal.time}-${i}`} className="group bg-emerald-50/20 p-8 rounded-[2rem] border border-transparent hover:border-emerald-100 hover:bg-white transition-all duration-500 hover:shadow-xl hover:shadow-emerald-900/5">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                       <span className="px-2 py-0.5 bg-emerald-100 text-[10px] font-black text-emerald-700 rounded-md uppercase tracking-widest">{meal.time}</span>
                    </div>
                    <h4 className="text-xl font-extrabold text-emerald-950 group-hover:text-emerald-600 transition-colors leading-tight">{meal.dish}</h4>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2"> {/* Align items for fav button */}
                    <div>
                      <span className="text-2xl font-black text-emerald-900 leading-none">{meal.calories}</span>
                      <span className="text-[10px] block font-bold text-emerald-400 uppercase tracking-tighter">kcal</span>
                    </div>
                    <button 
                      onClick={() => toggleFavoriteMeal(meal.id)}
                      className={`text-xl transition ${favoriteMeals.has(meal.id) ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
                      aria-label={favoriteMeals.has(meal.id) ? 'Favorilerden Kaldır' : 'Favorilere Ekle'}
                    >
                      <i className={`fas fa-star ${favoriteMeals.has(meal.id) ? 'fa-solid' : 'fa-regular'}`}></i>
                    </button>
                  </div>
                </div>
                <p className="text-sm font-medium text-emerald-800/70 mb-8 leading-relaxed">
                  {meal.description}
                </p>
                
                {/* Recipe Details */}
                {(meal.prepTime || meal.servings || (meal.ingredients && meal.ingredients.length > 0) || (meal.alternatives && meal.alternatives.length > 0)) && (
                  <div className="mt-6 border-t border-emerald-100/50 pt-6">
                    <button 
                      onClick={() => toggleExpandMeal(meal.id)}
                      className="text-emerald-600 font-bold flex items-center gap-2 hover:text-emerald-800 transition"
                      aria-expanded={expandedMeals.has(meal.id)}
                      aria-controls={`recipe-details-${meal.id}`}
                    >
                      Tarif Detayları <i className={`fas fa-chevron-${expandedMeals.has(meal.id) ? 'up' : 'down'} text-xs`}></i>
                    </button>
                    {expandedMeals.has(meal.id) && (
                      <div id={`recipe-details-${meal.id}`} className="mt-4 space-y-3 text-sm text-emerald-800 animate-in fade-in slide-in-from-top-2 duration-300">
                        {meal.prepTime && <p><strong>Hazırlık Süresi:</strong> {meal.prepTime}</p>}
                        {meal.servings && <p><strong>Porsiyon:</strong> {meal.servings}</p>}
                        {meal.ingredients && meal.ingredients.length > 0 && (
                          <div>
                            <p className="font-bold mb-1">Malzemeler:</p>
                            <ul className="list-disc list-inside pl-2 space-y-0.5">
                              {meal.ingredients.map((ing, idx) => <li key={idx}>{ing}</li>)}
                            </ul>
                          </div>
                        )}
                        {meal.alternatives && meal.alternatives.length > 0 && (
                          <div>
                            <p className="font-bold mb-1">Alternatifler:</p>
                            <ul className="list-disc list-inside pl-2 space-y-0.5">
                              {meal.alternatives.map((alt, idx) => <li key={idx}>{alt}</li>)}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-8 border-t border-emerald-100/50 pt-6 mt-8">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">P</span>
                    <span className="text-base font-black text-emerald-950">{meal.protein}g</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">C</span>
                    <span className="text-base font-black text-emerald-950">{meal.carbs}g</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">F</span>
                    <span className="text-base font-black text-emerald-950">{meal.fat}g</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 pb-12 no-print">
        <button 
          onClick={onReset}
          className="flex items-center gap-2 text-emerald-600 font-extrabold hover:text-emerald-800 transition-all hover:scale-105"
        >
          <i className="fas fa-redo"></i> Bilgileri Güncelle ve Yeniden Oluştur
        </button>
      </div>

      {/* Shopping List Modal */}
      {showShoppingList && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300 no-print"
          onClick={() => setShowShoppingList(false)}
        >
          <div 
            className="bg-white p-8 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="shopping-list-title"
          >
            <h3 id="shopping-list-title" className="text-2xl font-bold text-emerald-950 mb-6 flex items-center gap-3">
              <i className="fas fa-shopping-basket text-blue-500"></i> Alışveriş Listesi
            </h3>
            <ul className="list-disc list-inside space-y-2 text-emerald-800">
              {shoppingList.map((item, index) => (
                <li key={index} className="flex items-center">
                  <input type="checkbox" className="mr-3 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" id={`shopping-item-${index}`} />
                  <label htmlFor={`shopping-item-${index}`}>{item}</label>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex justify-end gap-3">
              <button 
                onClick={() => setShowShoppingList(false)} 
                className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
              >
                Kapat
              </button>
              <button 
                onClick={() => window.print()} 
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition"
              >
                Listeyi Yazdır
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DietDashboard;