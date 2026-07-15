
import React, { useState, useRef, useEffect } from 'react';
import { DietPlan, UserData, Meal, WeightEntry } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { saveDietPlan, updateDietPlan } from '../services/firebase';

interface DietDashboardProps {
  plan: DietPlan;
  userData: UserData;
  onReset: () => void;
  weightHistory: WeightEntry[];
  planId?: string;
  onUpdatePlan?: (updatedPlan: DietPlan) => void;
}

const DietDashboard: React.FC<DietDashboardProps> = ({ plan, userData, onReset, weightHistory, planId, onUpdatePlan }) => {
  const [activeDay, setActiveDay] = useState(0);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [favoriteMeals, setFavoriteMeals] = useState<Set<string>>(new Set());
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedId, setSharedId] = useState<string | null>(planId || null);
  const [copySuccess, setCopySuccess] = useState(false);

  const [hasDietitianWarningAcknowledged, setHasDietitianWarningAcknowledged] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [pendingEditMeal, setPendingEditMeal] = useState<Meal | null>(null);
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [formMeal, setFormMeal] = useState<Meal | null>(null);
  
  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [formGeneral, setFormGeneral] = useState<{
    summary: string;
    dailyCalories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);
  const [pendingGeneralEdit, setPendingGeneralEdit] = useState(false);

  const handleEditMealClick = (meal: Meal) => {
    if (!hasDietitianWarningAcknowledged) {
      setPendingEditMeal(meal);
      setShowWarningModal(true);
    } else {
      setEditingMeal(meal);
      setFormMeal({
        ...meal,
        ingredients: meal.ingredients || [],
        alternatives: meal.alternatives || []
      });
    }
  };

  const handleEditGeneralClick = () => {
    if (!hasDietitianWarningAcknowledged) {
      setPendingGeneralEdit(true);
      setShowWarningModal(true);
    } else {
      setIsEditingGeneral(true);
      setFormGeneral({
        summary: plan.summary || '',
        dailyCalories: plan.dailyCalories || 0,
        protein: plan.macros?.protein || 0,
        carbs: plan.macros?.carbs || 0,
        fat: plan.macros?.fat || 0
      });
    }
  };

  const handleConfirmWarning = () => {
    setHasDietitianWarningAcknowledged(true);
    setShowWarningModal(false);
    if (pendingEditMeal) {
      setEditingMeal(pendingEditMeal);
      setFormMeal({
        ...pendingEditMeal,
        ingredients: pendingEditMeal.ingredients || [],
        alternatives: pendingEditMeal.alternatives || []
      });
      setPendingEditMeal(null);
    } else if (pendingGeneralEdit) {
      setIsEditingGeneral(true);
      setFormGeneral({
        summary: plan.summary || '',
        dailyCalories: plan.dailyCalories || 0,
        protein: plan.macros?.protein || 0,
        carbs: plan.macros?.carbs || 0,
        fat: plan.macros?.fat || 0
      });
      setPendingGeneralEdit(false);
    }
  };

  const handleSaveMeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMeal) return;

    const updatedMeal: Meal = {
      ...formMeal,
      calories: Number(formMeal.calories) || 0,
      protein: Number(formMeal.protein) || 0,
      carbs: Number(formMeal.carbs) || 0,
      fat: Number(formMeal.fat) || 0,
    };

    const updatedPlan: DietPlan = {
      ...plan,
      weeklyPlan: plan.weeklyPlan.map(dayPlan => ({
        ...dayPlan,
        meals: dayPlan.meals.map(m => m.id === updatedMeal.id ? updatedMeal : m)
      }))
    };

    if (onUpdatePlan) {
      onUpdatePlan(updatedPlan);
    }

    if (sharedId) {
      try {
        await updateDietPlan(sharedId, userData, updatedPlan);
      } catch (error) {
        console.error("Firestore update failed:", error);
      }
    }

    setEditingMeal(null);
    setFormMeal(null);
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formGeneral) return;

    const updatedPlan: DietPlan = {
      ...plan,
      summary: formGeneral.summary,
      dailyCalories: Number(formGeneral.dailyCalories) || 0,
      macros: {
        protein: Number(formGeneral.protein) || 0,
        carbs: Number(formGeneral.carbs) || 0,
        fat: Number(formGeneral.fat) || 0
      }
    };

    if (onUpdatePlan) {
      onUpdatePlan(updatedPlan);
    }

    if (sharedId) {
      try {
        await updateDietPlan(sharedId, userData, updatedPlan);
      } catch (error) {
        console.error("Firestore update failed:", error);
      }
    }

    setIsEditingGeneral(false);
    setFormGeneral(null);
  };
  
  const dashboardRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const downloadMenuRef = useRef<HTMLDivElement>(null);

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
    const handleClickOutside = (event: MouseEvent) => {
      // FIX: Corrected typo from downloadMenu-ref to downloadMenuRef
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadOptions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);


  useEffect(() => {
    localStorage.setItem('favoriteMeals', JSON.stringify(Array.from(favoriteMeals)));
  }, [favoriteMeals]);

  useEffect(() => {
    if (planId) {
      setSharedId(planId);
    }
  }, [planId]);

  useEffect(() => {
    if (!sharedId && userData && plan) {
      const autoShare = async () => {
        try {
          const id = await saveDietPlan(userData, plan);
          setSharedId(id);
        } catch (error) {
          console.error("Auto share failed:", error);
        }
      };
      autoShare();
    }
  }, [sharedId, userData, plan]);

  const toggleExpandMeal = (mealId: string) => {
    setExpandedMeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mealId)) newSet.delete(mealId); else newSet.add(mealId);
      return newSet;
    });
  };

  const toggleFavoriteMeal = (mealId: string) => {
    setFavoriteMeals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(mealId)) newSet.delete(mealId); else newSet.add(mealId);
      return newSet;
    });
  };

  const calculateMacroPercentages = () => {
    const macros = plan.macros || { protein: 0, carbs: 0, fat: 0 };
    const protein = macros.protein || 0;
    const carbs = macros.carbs || 0;
    const fat = macros.fat || 0;
    const totalMacroCalories = (protein * 4) + (carbs * 4) + (fat * 9);
    if (totalMacroCalories === 0) return [];

    return [
      { name: 'Protein', value: ((protein * 4) / totalMacroCalories) * 100, color: '#10b981' },
      { name: 'Karbonhidrat', value: ((carbs * 4) / totalMacroCalories) * 100, color: '#3b82f6' },
      { name: 'Yağ', value: ((fat * 9) / totalMacroCalories) * 100, color: '#f59e0b' },
    ].filter(item => item.value > 0);
  };
  
  const downloadFile = (filename: string, content: string, mimeType: string) => {
    // Add UTF-8 BOM for correct character encoding, especially on Windows
    const bom = '\uFEFF';
    const blob = new Blob([bom + content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const formatMealToTxt = (meal: Meal): string => {
    let content = `Tarif: ${meal.dish}\n========================================\n\n${meal.description}\n\n`;
    if (meal.prepTime) content += `Hazırlık Süresi: ${meal.prepTime}\n`;
    if (meal.servings) content += `Porsiyon: ${meal.servings}\n\n`;
    if (meal.ingredients?.length) {
      content += `Malzemeler:\n${meal.ingredients.map(ing => `- ${ing}`).join('\n')}\n\n`;
    }
    if (meal.alternatives?.length) {
      content += `Alternatifler:\n${meal.alternatives.map(alt => `- ${alt}`).join('\n')}\n\n`;
    }
    content += `Besin Değerleri (Yaklaşık):\n- Kalori: ${meal.calories} kcal\n- Protein: ${meal.protein} g\n- Karbonhidrat: ${meal.carbs} g\n- Yağ: ${meal.fat} g\n`;
    return content;
  };

  const handleDownloadRecipeTxt = (meal: Meal) => {
    const content = formatMealToTxt(meal);
    const filename = `tarif_${meal.dish.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.txt`;
    downloadFile(filename, content, 'text/plain');
  };

  const handleDownloadRecipeJson = (meal: Meal) => {
    const content = JSON.stringify(meal, null, 2);
    const filename = `tarif_${meal.dish.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
    downloadFile(filename, content, 'application/json');
  };
  
  const formatPlanToTxt = (plan: DietPlan): string => {
    let content = `NutriAI Kişiselleştirilmiş Diyet Planı\n========================================\n\n`;
    content += `ÖZET: ${plan.summary || ''}\n\n`;
    const macros = plan.macros || { protein: 0, carbs: 0, fat: 0 };
    content += `GÜNLÜK HEDEFLER:\n- Kalori: ${plan.dailyCalories || 0} kcal\n- Protein: ${macros.protein || 0} g\n- Karbonhidrat: ${macros.carbs || 0} g\n- Yağ: ${macros.fat || 0} g\n\n`;
    content += `DİYET PLANI DETAYLARI:\n----------------------------------------\n\n`;
    const weeklyPlan = plan.weeklyPlan || [];
    weeklyPlan.forEach(day => {
      content += `--- ${day.day.toUpperCase()} ---\n`;
      day.meals.forEach(meal => {
        content += `\n  [${meal.time}] ${meal.dish} (~${meal.calories} kcal)\n`;
        content += `    Açıklama: ${meal.description}\n`;
        if (meal.ingredients?.length) {
          content += `    Malzemeler:\n${meal.ingredients.map(ing => `      - ${ing}`).join('\n')}\n`;
        }
        if (meal.alternatives?.length) {
          content += `    Alternatifler:\n${meal.alternatives.map(alt => `      - ${alt}`).join('\n')}\n`;
        }
      });
      content += `\n`;
    });
    content += `GENEL TAVSİYELER:\n----------------------------------------\n`;
    plan.tips.forEach(tip => { content += `- ${tip}\n`; });
    return content;
  };

  const handleDownloadPlanTxt = () => {
    const content = formatPlanToTxt(plan);
    downloadFile(`NutriAI_Diyet_Plani.txt`, content, 'text/plain');
  };

  const handleDownloadPlanJson = () => {
    // Export both userData and plan for full import functionality
    const exportedData = { userData, plan };
    const content = JSON.stringify(exportedData, null, 2);
    downloadFile(`NutriAI_Diyet_Plani.json`, content, 'application/json');
  };
  
  const handleDownloadShoppingList = () => {
    const list = generateShoppingList();
    const content = `Haftalık Alışveriş Listesi\n========================================\n\n${list.join('\n')}`;
    downloadFile('alisveris_listesi.txt', content, 'text/plain');
  };

  const handleShare = async () => {
    if (sharedId) {
      copyToClipboard(`${window.location.origin}/ID/${sharedId}`);
      return;
    }

    setIsSharing(true);
    try {
      const id = await saveDietPlan(userData, plan);
      setSharedId(id);
      copyToClipboard(`${window.location.origin}/ID/${id}`);
    } catch (error) {
      console.error("Plan paylaşılamadı:", error);
      alert("Plan paylaşılırken bir hata oluştu.");
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const macroData = calculateMacroPercentages();
  const weeklyPlan = plan.weeklyPlan || [];
  const currentDay = weeklyPlan[activeDay] || { day: `Gün ${activeDay + 1}`, meals: [] };
  const currentMeals = currentDay.meals || [];
  const totalDayCalories = currentMeals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const element = dashboardRef.current;
    if (!element) { setIsGeneratingPdf(false); return; }
    const opt = { margin: 10, filename: `NutriAI_Diyet_Plani_${userData.age}yas.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    // @ts-ignore
    await html2pdf().set(opt).from(element).save();
    setIsGeneratingPdf(false);
  };

  const bmr = Math.round(10 * userData.weight + 6.25 * userData.height - 5 * userData.age + (userData.gender === 'male' ? 5 : -161));

  const generateShoppingList = () => {
      const ingredientsMap: { [key: string]: { [key: string]: number } } = {};
      const pantryStaples = ['tuz', 'karabiber', 'su', 'zeytinyağı', 'baharatlar', 'pul biber', 'nane', 'kekik', 'kimyon', 'salça', 'ketçap', 'mayonez', 'tereyağı', 'margarin', 'sıvı yağ'];
      const prepWords = /doğranmış|rendelenmiş|küp küp|haşlanmış|dilimlenmiş|az miktarda|isteğe bağlı|kızartılmış|eritilmiş|yakılmış|ıslatılmış/g;
      
      const unitMap: { [key: string]: string[] } = {
          'g': ['g', 'gram'],
          'kg': ['kg', 'kilogram'],
          'ml': ['ml', 'mililitre'],
          'adet': ['adet'],
          'su bardağı': ['su bardağı', 'bardak'],
          'yemek kaşığı': ['yemek kaşığı', 'kaşık'],
          'çay kaşığı': ['çay kaşığı'],
          'dilim': ['dilim'],
          'kase': ['kase'],
          'avuç': ['avuç'],
          'kutu': ['kutu'],
          'demet': ['demet'],
          'diş': ['diş']
      };

      const wordToNum: { [key: string]: number } = {
        'bir': 1, 'iki': 2, 'üç': 3, 'dört': 4, 'beş': 5, 'altı': 6, 'yedi': 7, 'sekiz': 8, 'dokuz': 9, 'on': 10,
        'yarım': 0.5, 'çeyrek': 0.25
      };

      plan.weeklyPlan.forEach(dayPlan => {
          dayPlan.meals.forEach(meal => {
              if (!meal.ingredients) return;

              meal.ingredients.forEach(ing => {
                  let text = ing.toLowerCase().trim();
                  
                  // Parse quantity and unit
                  let quantity = 1;
                  let unit = 'adet';
                  let name = text;

                  const numMatch = text.match(/^(\d+(?:\.\d+)?|bir|iki|üç|dört|beş|yarım|çeyrek)\s+/);
                  if (numMatch) {
                      const numStr = numMatch[1];
                      quantity = wordToNum[numStr] || parseFloat(numStr);
                      text = text.substring(numMatch[0].length);
                  }

                  let unitFound = false;
                  for (const standardUnit in unitMap) {
                      for (const alias of unitMap[standardUnit]) {
                          if (text.startsWith(alias + ' ')) {
                              unit = standardUnit;
                              text = text.substring(alias.length).trim();
                              unitFound = true;
                              break;
                          }
                      }
                      if (unitFound) break;
                  }
                  
                  name = text.replace(prepWords, '').replace(/için/g, '').trim().replace(/\s\s+/g, ' ');

                  if (!name || pantryStaples.includes(name) || pantryStaples.some(staple => name.includes(staple))) {
                      return; // Skip if it's a pantry staple or empty
                  }
                  
                  // Aggregate
                  if (!ingredientsMap[name]) {
                      ingredientsMap[name] = {};
                  }
                  if (!ingredientsMap[name][unit]) {
                      ingredientsMap[name][unit] = 0;
                  }
                  ingredientsMap[name][unit] += quantity;
              });
          });
      });

      // Format the list
      const formattedList: string[] = [];
      Object.keys(ingredientsMap).sort().forEach(name => {
          Object.keys(ingredientsMap[name]).forEach(unit => {
              const totalQuantity = ingredientsMap[name][unit];
              // Capitalize first letter of the name
              const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
              formattedList.push(`${totalQuantity} ${unit} ${capitalizedName}`);
          });
      });

      return formattedList;
  };


  const shoppingList = generateShoppingList();
  const allFavoriteMeals = (plan.weeklyPlan || []).flatMap(d => (d.meals || []).filter(m => favoriteMeals.has(m.id)));

  return (
    <div className="space-y-8 animate-in fade-in duration-700" ref={dashboardRef}>
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-green-50 flex flex-col md:flex-row gap-8 relative overflow-hidden">
          <div className="flex-1 relative z-10">
            {sharedId ? (
              <div className="mb-6 p-3 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-800 animate-in fade-in duration-300 no-print">
                <div className="flex items-center gap-2 truncate">
                  <i className="fas fa-link text-emerald-600 shrink-0"></i>
                  <span className="font-bold shrink-0 text-emerald-700">Paylaşım Linki:</span>
                  <span className="font-mono text-emerald-900 truncate select-all">{window.location.origin}/ID/{sharedId}</span>
                </div>
                <button 
                  onClick={() => copyToClipboard(`${window.location.origin}/ID/${sharedId}`)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shrink-0 flex items-center gap-1.5 active:scale-95 text-[11px]"
                >
                  <i className="fas fa-copy"></i>
                  {copySuccess ? 'Kopyalandı' : 'Kopyala'}
                </button>
              </div>
            ) : (
              <div className="mb-6 p-3 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between gap-3 text-xs text-gray-500 animate-in fade-in duration-300 no-print">
                <div className="flex items-center gap-2">
                  <i className="fas fa-spinner fa-spin text-emerald-600"></i>
                  <span>Paylaşım linki oluşturuluyor...</span>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-extrabold text-green-950 tracking-tight">Plan Özetiniz</h2>
              <button 
                onClick={handleEditGeneralClick}
                className="px-4 py-2 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all flex items-center gap-1.5 no-print animate-in fade-in duration-300"
              >
                <i className="fas fa-edit text-[10px]"></i> Hedefleri Düzenle
              </button>
            </div>
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
                    <Pie data={macroData} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none">
                      {macroData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]} />
                 </PieChart>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={macroData} cx="50%" cy="50%" innerRadius={65} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none">
                      {macroData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="flex justify-center gap-4 text-[10px] font-bold mt-4"> 
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> P</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500"></span> C</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500"></span> F</span>
            </div>
          </div>
        </div>
        <div className="bg-[#064e3b] text-white p-8 rounded-[2rem] shadow-xl shadow-green-900/10">
          <h3 className="text-2xl font-black mb-6 flex items-center gap-3"><i className="fas fa-lightbulb text-amber-400"></i> Tavsiyeler</h3>
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
      {allFavoriteMeals.length > 0 && (
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-green-50 animate-in fade-in duration-500">
          <h3 className="text-2xl font-black text-emerald-950 mb-6 flex items-center gap-3"><i className="fas fa-star text-yellow-500"></i> Favori Öğünleriniz</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allFavoriteMeals.map(meal => (
               <div key={meal.id} className="bg-yellow-50/30 p-6 rounded-2xl border border-yellow-100 relative">
                  <h4 className="text-lg font-bold text-yellow-900 mb-1">{meal.dish}</h4>
                  <p className="text-sm text-yellow-800 line-clamp-2">{meal.description}</p>
                  <button onClick={() => toggleFavoriteMeal(meal.id)} className="absolute top-4 right-4 text-yellow-500 hover:text-yellow-600 transition" aria-label="Favorilerden Kaldır">
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
          {(plan.weeklyPlan || []).map((day, idx) => (
            <button key={idx} onClick={() => setActiveDay(idx)} className={`px-8 py-3.5 rounded-2xl font-bold whitespace-nowrap transition-all duration-300 ${activeDay === idx ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 ring-4 ring-emerald-500/10 scale-105' : 'text-emerald-700 hover:bg-emerald-50'}`} aria-current={activeDay === idx ? 'page' : undefined}>
              {day.day}
            </button>
          ))}
        </div>

        <div className="p-8 md:p-12">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 gap-4">
            <h3 className="text-3xl font-black text-emerald-950">{currentDay.day || `Gün ${activeDay + 1}`} Menüsü</h3>
            <div className="flex flex-wrap gap-3 items-center">
              <span className="bg-emerald-100/80 text-emerald-800 px-6 py-2.5 rounded-2xl text-sm font-black border border-emerald-200 dashed border-dashed">
                {totalDayCalories} Toplam Kalori
              </span>
              <div ref={downloadMenuRef} className="relative inline-block text-left no-print">
                <button onClick={() => setShowDownloadOptions(prev => !prev)} type="button" className="inline-flex justify-center items-center w-full rounded-2xl border border-gray-200 shadow-sm px-4 py-3 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500">
                  <i className="fas fa-download mr-2"></i> İndir
                  <i className="fas fa-chevron-down -mr-1 ml-2 h-5 w-5 text-xs"></i>
                </button>
                {showDownloadOptions && (
                  <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1">
                      <button onClick={() => { handleDownloadPDF(); setShowDownloadOptions(false); }} disabled={isGeneratingPdf} className="text-gray-700 disabled:opacity-50 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                        {isGeneratingPdf ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-file-pdf mr-2 text-red-500"></i>} Plan (PDF)
                      </button>
                      <button onClick={() => { handleDownloadPlanTxt(); setShowDownloadOptions(false); }} className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                        <i className="fas fa-file-alt mr-2 text-blue-500"></i> Plan (Metin)
                      </button>
                      <button onClick={() => { handleDownloadPlanJson(); setShowDownloadOptions(false); }} className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                        <i className="fas fa-file-code mr-2 text-purple-500"></i> Plan (JSON)
                      </button>
                       <button onClick={() => { handleDownloadShoppingList(); setShowDownloadOptions(false); }} className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 border-t mt-1 pt-1">
                        <i className="fas fa-shopping-basket mr-2 text-orange-500"></i> Alışveriş Listesi
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setShowShoppingList(true)} className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-2xl shadow-lg shadow-blue-100 transition-all active:scale-95 no-print" title="Alışveriş Listesini Görüntüle">
                <i className="fas fa-shopping-basket"></i>
              </button>
              <button 
                onClick={handleShare} 
                disabled={isSharing}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl shadow-lg transition-all active:scale-95 no-print font-bold ${sharedId ? 'bg-green-600 hover:bg-green-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white disabled:opacity-50`}
                title="Planı Paylaş"
              >
                {isSharing ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : sharedId ? (
                  <i className="fas fa-link"></i>
                ) : (
                  <i className="fas fa-share-alt"></i>
                )}
                {copySuccess ? 'Kopyalandı!' : sharedId ? 'Linki Kopyala' : 'Planı Paylaş'}
              </button>
            </div>
            
            {/* Paylaşım Linki Gösterge Paneli */}
            {sharedId && (
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 duration-300 no-print">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                    <i className="fas fa-link"></i>
                  </div>
                  <div>
                    <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">Plan Erişim Linkiniz</p>
                    <p className="text-sm font-mono text-emerald-800 break-all">{window.location.origin}/ID/{sharedId}</p>
                  </div>
                </div>
                <button 
                  onClick={() => copyToClipboard(`${window.location.origin}/ID/${sharedId}`)}
                  className="px-4 py-2 bg-white text-emerald-600 border border-emerald-200 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-colors shrink-0"
                >
                  {copySuccess ? 'Kopyalandı' : 'Kopyala'}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {currentMeals.map((meal) => (
              <div key={meal.id} className="group bg-emerald-50/20 p-8 rounded-[2rem] border border-transparent hover:border-emerald-100 hover:bg-white transition-all duration-500 hover:shadow-xl hover:shadow-emerald-900/5">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-[10px] font-black text-emerald-700 rounded-md uppercase tracking-widest mb-1.5 inline-block">{meal.time}</span>
                    <h4 className="text-xl font-extrabold text-emerald-950 group-hover:text-emerald-600 transition-colors leading-tight">{meal.dish}</h4>
                  </div>
                  <div className="text-right shrink-0 flex items-center gap-2">
                    <div>
                      <span className="text-2xl font-black text-emerald-900 leading-none">{meal.calories}</span>
                      <span className="text-[10px] block font-bold text-emerald-400 uppercase tracking-tighter">kcal</span>
                    </div>
                    <button onClick={() => toggleFavoriteMeal(meal.id)} className={`text-xl transition ${favoriteMeals.has(meal.id) ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`} aria-label={favoriteMeals.has(meal.id) ? 'Favorilerden Kaldır' : 'Favorilere Ekle'}>
                      <i className={`fas fa-star ${favoriteMeals.has(meal.id) ? 'fa-solid' : 'fa-regular'}`}></i>
                    </button>
                  </div>
                </div>
                <p className="text-sm font-medium text-emerald-800/70 mb-8 leading-relaxed">{meal.description}</p>
                <div className="mt-6 border-t border-emerald-100/50 pt-6 flex items-center justify-between no-print">
                  {(meal.prepTime || meal.servings || meal.ingredients?.length || meal.alternatives?.length) ? (
                    <button onClick={() => toggleExpandMeal(meal.id)} className="text-emerald-600 font-bold flex items-center gap-2 hover:text-emerald-800 transition" aria-expanded={expandedMeals.has(meal.id)} aria-controls={`recipe-details-${meal.id}`}>
                      Tarif Detayları <i className={`fas fa-chevron-${expandedMeals.has(meal.id) ? 'up' : 'down'} text-xs`}></i>
                    </button>
                  ) : (
                    <span className="text-xs text-emerald-600/40 font-bold">Tarif bilgisi yok</span>
                  )}
                  <button 
                    onClick={() => handleEditMealClick(meal)} 
                    className="text-amber-600 hover:text-amber-800 font-bold flex items-center gap-1.5 transition"
                  >
                    <i className="fas fa-edit text-xs"></i> Düzenle
                  </button>
                </div>
                {expandedMeals.has(meal.id) && (meal.prepTime || meal.servings || meal.ingredients?.length || meal.alternatives?.length) && (
                  <div id={`recipe-details-${meal.id}`} className="mt-4 space-y-3 text-sm text-emerald-800 animate-in fade-in slide-in-from-top-2 duration-300">
                    {meal.prepTime && <p><strong>Hazırlık Süresi:</strong> {meal.prepTime}</p>}
                    {meal.servings && <p><strong>Porsiyon:</strong> {meal.servings}</p>}
                    {meal.ingredients?.length && <div><p className="font-bold mb-1">Malzemeler:</p><ul className="list-disc list-inside pl-2 space-y-0.5">{meal.ingredients.map((ing, idx) => <li key={idx}>{ing}</li>)}</ul></div>}
                    {meal.alternatives?.length && <div><p className="font-bold mb-1">Alternatifler:</p><ul className="list-disc list-inside pl-2 space-y-0.5">{meal.alternatives.map((alt, idx) => <li key={idx}>{alt}</li>)}</ul></div>}
                    <div className="mt-4 pt-4 border-t border-emerald-100 flex items-center gap-3">
                      <span className="text-xs font-bold text-emerald-600">Tarifi İndir:</span>
                      <button onClick={() => handleDownloadRecipeTxt(meal)} className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-lg hover:bg-blue-200 transition" title="Metin olarak indir"><i className="fas fa-file-alt mr-1"></i> TXT</button>
                      <button onClick={() => handleDownloadRecipeJson(meal)} className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-lg hover:bg-purple-200 transition" title="JSON olarak indir"><i className="fas fa-file-code mr-1"></i> JSON</button>
                    </div>
                  </div>
                )}
                <div className="flex gap-8 border-t border-emerald-100/50 pt-6 mt-8">
                  <div className="flex flex-col"><span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">P</span><span className="text-base font-black text-emerald-950">{meal.protein}g</span></div>
                  <div className="flex flex-col"><span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">C</span><span className="text-base font-black text-emerald-950">{meal.carbs}g</span></div>
                  <div className="flex flex-col"><span className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">F</span><span className="text-base font-black text-emerald-950">{meal.fat}g</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 pb-12 no-print">
        <button onClick={onReset} className="flex items-center gap-2 text-emerald-600 font-extrabold hover:text-emerald-800 transition-all hover:scale-105"><i className="fas fa-redo"></i> Bilgileri Güncelle ve Yeniden Oluştur</button>
      </div>

      {showShoppingList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300 no-print" onClick={() => setShowShoppingList(false)}>
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="shopping-list-title">
            <h3 id="shopping-list-title" className="text-2xl font-bold text-emerald-950 mb-6 flex items-center gap-3"><i className="fas fa-shopping-basket text-blue-500"></i> Alışveriş Listesi</h3>
            <ul className="space-y-2 text-emerald-800">
              {shoppingList.map((item, index) => (
                <li key={index} className="flex items-start">
                  <input type="checkbox" className="mr-3 mt-1 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" id={`shopping-item-${index}`} />
                  <label htmlFor={`shopping-item-${index}`} className="flex-1">{item}</label>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setShowShoppingList(false)} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition">Kapat</button>
              <button onClick={() => { handleDownloadShoppingList(); setShowShoppingList(false);}} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition">Listeyi İndir</button>
            </div>
          </div>
        </div>
      )}

      {/* Diyetisyen Uyarı Modalı */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 no-print">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full border border-amber-100 relative animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-600 mb-6 mx-auto">
              <i className="fas fa-exclamation-triangle text-2xl"></i>
            </div>
            <h3 className="text-xl font-extrabold text-amber-950 mb-3 text-center">⚠️ Profesyonel Diyetisyen Uyarısı</h3>
            <p className="text-sm text-amber-900/80 leading-relaxed mb-6 text-center font-semibold">
              Bu düzenleme paneli ve diyet planı değişiklik özellikleri yalnızca profesyonel diyetisyenler ve beslenme uzmanları tarafından kullanılmalıdır.
            </p>
            <p className="text-xs text-amber-800/70 leading-relaxed mb-8 text-center bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
              Diyetisyen gözetimi veya onayı olmadan diyet üzerinde yapılacak bilinçsiz değişiklikler, kalori/makro dengesizlikleri yaratarak sağlık riskleri oluşturabilir. Bu aracı uzman gözetiminde kullandığınızı onaylıyor musunuz?
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowWarningModal(false); setPendingEditMeal(null); setPendingGeneralEdit(false); }}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all text-sm"
              >
                Vazgeç
              </button>
              <button 
                onClick={handleConfirmWarning}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-200 text-sm"
              >
                Evet, Onaylıyorum
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Öğün Düzenleme Modalı */}
      {editingMeal && formMeal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 no-print" onClick={() => { setEditingMeal(null); setFormMeal(null); }}>
          <div className="bg-white rounded-[2rem] max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-amber-600 uppercase tracking-widest block mb-1">Diyetisyen Düzenleme Paneli</span>
                <h3 className="text-2xl font-black text-emerald-950">Öğünü Düzenle</h3>
              </div>
              <button onClick={() => { setEditingMeal(null); setFormMeal(null); }} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSaveMeal} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-emerald-900 mb-1.5">Yemek / Tarif Adı</label>
                  <input 
                    type="text" 
                    required
                    value={formMeal.dish}
                    onChange={(e) => setFormMeal({ ...formMeal, dish: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-emerald-950"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-emerald-900 mb-1.5">Öğün Zamanı / Saati</label>
                  <input 
                    type="text" 
                    required
                    value={formMeal.time}
                    onChange={(e) => setFormMeal({ ...formMeal, time: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-emerald-950"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-emerald-900 mb-1.5">Açıklama / Hazırlanış Özeti</label>
                <textarea 
                  required
                  rows={3}
                  value={formMeal.description}
                  onChange={(e) => setFormMeal({ ...formMeal, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-emerald-950 resize-none"
                />
              </div>

              {/* Nutrients Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                <div>
                  <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">Kalori (kcal)</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={formMeal.calories}
                    onChange={(e) => setFormMeal({ ...formMeal, calories: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-950"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">Protein (g)</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={formMeal.protein}
                    onChange={(e) => setFormMeal({ ...formMeal, protein: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-950"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">Karbonhidrat (g)</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={formMeal.carbs}
                    onChange={(e) => setFormMeal({ ...formMeal, carbs: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-950"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-amber-600 uppercase tracking-wider mb-1">Yağ (g)</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={formMeal.fat}
                    onChange={(e) => setFormMeal({ ...formMeal, fat: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-emerald-900 mb-1.5">Hazırlık Süresi (Örn: 15 dk)</label>
                  <input 
                    type="text" 
                    value={formMeal.prepTime || ''}
                    onChange={(e) => setFormMeal({ ...formMeal, prepTime: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-emerald-950"
                    placeholder="Belirtilmemiş"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-emerald-900 mb-1.5">Porsiyon (Örn: 1 porsiyon)</label>
                  <input 
                    type="text" 
                    value={formMeal.servings || ''}
                    onChange={(e) => setFormMeal({ ...formMeal, servings: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-emerald-950"
                    placeholder="Belirtilmemiş"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-emerald-900 mb-1">Malzemeler (Her satıra bir tane)</label>
                <span className="text-[10px] text-gray-400 block mb-1.5">Malzemeleri alt alta yazın</span>
                <textarea 
                  rows={4}
                  value={(formMeal.ingredients || []).join('\n')}
                  onChange={(e) => setFormMeal({ ...formMeal, ingredients: e.target.value.split('\n') })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-semibold font-mono text-sm text-emerald-950"
                  placeholder="Örn: 2 adet yumurta&#10;1 dilim süzme peynir"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-emerald-900 mb-1">Alternatifler (Her satıra bir tane)</label>
                <span className="text-[10px] text-gray-400 block mb-1.5">Alternatifleri alt alta yazın</span>
                <textarea 
                  rows={3}
                  value={(formMeal.alternatives || []).join('\n')}
                  onChange={(e) => setFormMeal({ ...formMeal, alternatives: e.target.value.split('\n') })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-semibold font-mono text-sm text-emerald-950"
                  placeholder="Örn: 1 kase yulaf ezmesi&#10;3 adet ceviz içi"
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white pb-2">
                <button 
                  type="button"
                  onClick={() => { setEditingMeal(null); setFormMeal(null); }}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all text-sm"
                >
                  Kapat
                </button>
                <button 
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-200 text-sm"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Genel Hedefler Düzenleme Modalı */}
      {isEditingGeneral && formGeneral && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 no-print" onClick={() => { setIsEditingGeneral(false); setFormGeneral(null); }}>
          <div className="bg-white rounded-[2rem] max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs font-black text-amber-600 uppercase tracking-widest block mb-1">Diyetisyen Düzenleme Paneli</span>
                <h3 className="text-2xl font-black text-emerald-950">Genel Hedefleri Düzenle</h3>
              </div>
              <button onClick={() => { setIsEditingGeneral(false); setFormGeneral(null); }} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSaveGeneral} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-emerald-900 mb-1.5">Plan Özeti</label>
                <textarea 
                  required
                  rows={4}
                  value={formGeneral.summary}
                  onChange={(e) => setFormGeneral({ ...formGeneral, summary: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-emerald-950 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-emerald-900 mb-1.5">Günlük Hedef Kalori (kcal)</label>
                <input 
                  type="number" 
                  required
                  min={0}
                  value={formGeneral.dailyCalories}
                  onChange={(e) => setFormGeneral({ ...formGeneral, dailyCalories: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-950"
                />
              </div>

              <div className="grid grid-cols-3 gap-4 p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
                <div>
                  <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">Protein (g)</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={formGeneral.protein}
                    onChange={(e) => setFormGeneral({ ...formGeneral, protein: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-950"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">Karbonhidrat (g)</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={formGeneral.carbs}
                    onChange={(e) => setFormGeneral({ ...formGeneral, carbs: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-950"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-amber-600 uppercase tracking-wider mb-1">Yağ (g)</label>
                  <input 
                    type="number" 
                    required
                    min={0}
                    value={formGeneral.fat}
                    onChange={(e) => setFormGeneral({ ...formGeneral, fat: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-bold text-emerald-950"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => { setIsEditingGeneral(false); setFormGeneral(null); }}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all text-sm"
                >
                  Kapat
                </button>
                <button 
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-200 text-sm"
                >
                  Kaydet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DietDashboard;
