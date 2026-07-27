
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DietPlan, UserData, Meal, WeightEntry } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { saveDietPlan, updateDietPlan } from '../services/firebase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { translations } from '../src/translations';

interface DietDashboardProps {
  plan: DietPlan;
  userData: UserData;
  onReset: () => void;
  weightHistory: WeightEntry[];
  planId?: string;
  onUpdatePlan?: (updatedPlan: DietPlan) => void;
}

const DietDashboard: React.FC<DietDashboardProps> = ({ plan, userData, onReset, weightHistory, planId, onUpdatePlan }) => {
  const [lang, setLang] = useState<'tr' | 'en'>(() => (localStorage.getItem('lang') as 'tr' | 'en') || 'tr');
  const t = (key: keyof typeof translations.tr) => translations[lang][key];

  const translateDay = (dayStr: string, index?: number) => {
    if (!dayStr) return '';
    const cleanDay = dayStr.trim().toLowerCase();
    
    // 1. Match digits (Day 1, Gün 2, etc.)
    const match = cleanDay.match(/\d+/);
    if (match) {
      const num = match[0];
      return lang === 'en' ? `Day ${num}` : `${num}. Gün`;
    }

    // 2. Map day names to standard indices (0-6)
    const dayMapping: Record<string, number> = {
      // Turkish
      'pazartesi': 0, 'pzt': 0, 'paza': 0,
      'salı': 1, 'sal': 1,
      'çarşamba': 2, 'çar': 2, 'carsamba': 2, 'car': 2,
      'perşembe': 3, 'per': 3, 'persembe': 3,
      'cuma': 4, 'cum': 4,
      'cumartesi': 5, 'cts': 5, 'cumartesı': 5,
      'pazar': 6, 'paz': 6,

      // English
      'monday': 0, 'mon': 0,
      'tuesday': 1, 'tue': 1, 'tu': 1,
      'wednesday': 2, 'wed': 2, 'wedr': 2, 'wedn': 2, 'wednes': 2,
      'thursday': 3, 'thu': 3, 'th': 3, 'thur': 3, 'thurs': 3,
      'friday': 4, 'fri': 4,
      'saturday': 5, 'sat': 5, 'sa': 5,
      'sunday': 6, 'sun': 6, 'su': 6
    };

    let dayIndex: number | undefined = undefined;
    for (const [key, val] of Object.entries(dayMapping)) {
      if (cleanDay === key || cleanDay.startsWith(key) || key.startsWith(cleanDay)) {
        dayIndex = val;
        break;
      }
    }

    // Fallback to loop index if provided
    if (dayIndex === undefined && typeof index === 'number') {
      dayIndex = index % 7;
    }

    if (dayIndex !== undefined) {
      const standardDaysTr = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
      const standardDaysEn = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      return lang === 'en' ? standardDaysEn[dayIndex] : standardDaysTr[dayIndex];
    }

    // Fallback
    const translation = (translations[lang] as any)[dayStr.trim()];
    if (translation) {
      return translation;
    }

    return dayStr;
  };

  useEffect(() => {
    const handleLanguageChange = () => {
      setLang((localStorage.getItem('lang') as 'tr' | 'en') || 'tr');
    };
    window.addEventListener('languageChange', handleLanguageChange);
    return () => window.removeEventListener('languageChange', handleLanguageChange);
  }, []);

  const [activeDay, setActiveDay] = useState(0);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const [favoriteMeals, setFavoriteMeals] = useState<Set<string>>(new Set());
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [sharedId, setSharedId] = useState<string | null>(planId || null);
  const [copySuccess, setCopySuccess] = useState(false);

  const [localWeightHistory, setLocalWeightHistory] = useState<WeightEntry[]>(() => {
    if (weightHistory && weightHistory.length > 0) return weightHistory;
    try {
      const stored = localStorage.getItem('weightHistory');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to parse weight history from localStorage", e);
    }
    if (userData && userData.weight) {
      const todayStr = new Date().toISOString().split('T')[0];
      return [{ date: todayStr, weight: Number(userData.weight) }];
    }
    return [];
  });

  const [newWeight, setNewWeight] = useState<string>('');
  const [newWeightDate, setNewWeightDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (weightHistory && weightHistory.length > 0) {
      setLocalWeightHistory(weightHistory);
    }
  }, [weightHistory]);

  const handleAddWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const wNum = parseFloat(newWeight);
    if (isNaN(wNum) || wNum <= 0) return;
    const dateStr = newWeightDate || new Date().toISOString().split('T')[0];

    const updated = [...localWeightHistory];
    const existingIdx = updated.findIndex(item => item.date === dateStr);
    if (existingIdx >= 0) {
      updated[existingIdx] = { date: dateStr, weight: wNum };
    } else {
      updated.push({ date: dateStr, weight: wNum });
    }
    updated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setLocalWeightHistory(updated);
    try {
      localStorage.setItem('weightHistory', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
    setNewWeight('');
  };

  const handleDeleteWeight = (dateStr: string) => {
    const updated = localWeightHistory.filter(item => item.date !== dateStr);
    setLocalWeightHistory(updated);
    try {
      localStorage.setItem('weightHistory', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

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

    const updatedWeeklyPlan = plan.weeklyPlan.map(dayPlan => ({
      ...dayPlan,
      meals: dayPlan.meals.map(m => m.id === updatedMeal.id ? updatedMeal : m)
    }));

    // Calculate sum of active day's meals for updated macros & daily calories
    const activeMeals = updatedWeeklyPlan[activeDay]?.meals || [];
    const newTotalProtein = activeMeals.reduce((sum, m) => sum + (Number(m.protein) || 0), 0);
    const newTotalCarbs = activeMeals.reduce((sum, m) => sum + (Number(m.carbs) || 0), 0);
    const newTotalFat = activeMeals.reduce((sum, m) => sum + (Number(m.fat) || 0), 0);
    const newTotalCalories = activeMeals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);

    const updatedPlan: DietPlan = {
      ...plan,
      dailyCalories: newTotalCalories > 0 ? newTotalCalories : plan.dailyCalories,
      macros: {
        protein: newTotalProtein,
        carbs: newTotalCarbs,
        fat: newTotalFat,
      },
      weeklyPlan: updatedWeeklyPlan
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

  const weeklyPlan = plan.weeklyPlan || [];
  const rawCurrentDay = weeklyPlan[activeDay] || { day: '', meals: [] };
  const currentDay = {
    ...rawCurrentDay,
    day: translateDay(rawCurrentDay.day, activeDay) || (lang === 'en' ? `Day ${activeDay + 1}` : `${activeDay + 1}. Gün`)
  };
  const currentMeals = currentDay.meals || [];
  const totalDayCalories = currentMeals.reduce((sum, m) => sum + (Number(m.calories) || 0), 0);
  const totalDayProtein = currentMeals.reduce((sum, m) => sum + (Number(m.protein) || 0), 0);
  const totalDayCarbs = currentMeals.reduce((sum, m) => sum + (Number(m.carbs) || 0), 0);
  const totalDayFat = currentMeals.reduce((sum, m) => sum + (Number(m.fat) || 0), 0);

  const effectiveProtein = totalDayProtein > 0 ? totalDayProtein : (plan.macros?.protein || 0);
  const effectiveCarbs = totalDayCarbs > 0 ? totalDayCarbs : (plan.macros?.carbs || 0);
  const effectiveFat = totalDayFat > 0 ? totalDayFat : (plan.macros?.fat || 0);
  const effectiveDailyCalories = totalDayCalories > 0 ? totalDayCalories : (plan.dailyCalories || 0);

  const calculateMacroPercentages = () => {
    const protein = effectiveProtein;
    const carbs = effectiveCarbs;
    const fat = effectiveFat;
    const totalMacroCalories = (protein * 4) + (carbs * 4) + (fat * 9);
    if (totalMacroCalories === 0) return [];

    return [
      { name: t('protein'), value: ((protein * 4) / totalMacroCalories) * 100, color: '#10b981' },
      { name: t('carbs'), value: ((carbs * 4) / totalMacroCalories) * 100, color: '#3b82f6' },
      { name: t('fat'), value: ((fat * 9) / totalMacroCalories) * 100, color: '#f59e0b' },
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
    content += `GÜNLÜK HEDEFLER:\n- Kalori: ${effectiveDailyCalories} kcal\n- Protein: ${effectiveProtein} g\n- Karbonhidrat: ${effectiveCarbs} g\n- Yağ: ${effectiveFat} g\n\n`;
    content += `DİYET PLANI DETAYLARI:\n----------------------------------------\n\n`;
    const weeklyPlan = plan.weeklyPlan || [];
    weeklyPlan.forEach((day, idx) => {
      content += `--- ${translateDay(day.day, idx).toUpperCase()} ---\n`;
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

  const handleDownloadPlanXlsx = () => {
    const isTr = lang === 'tr';
    const wb = XLSX.utils.book_new();

    // 1. Weekly Meals Sheet
    const mealRows: any[] = [];
    const weeklyPlan = plan.weeklyPlan || [];
    weeklyPlan.forEach((day, idx) => {
      const dayName = translateDay(day.day, idx) || (isTr ? `${idx + 1}. Gün` : `Day ${idx + 1}`);
      (day.meals || []).forEach(meal => {
        mealRows.push({
          [isTr ? 'Gün' : 'Day']: dayName,
          [isTr ? 'Öğün Zamanı' : 'Time']: meal.time || '',
          [isTr ? 'Yemek Adı' : 'Dish']: meal.dish || '',
          [isTr ? 'Kalori (kcal)' : 'Calories (kcal)']: Number(meal.calories) || 0,
          [isTr ? 'Protein (g)' : 'Protein (g)']: Number(meal.protein) || 0,
          [isTr ? 'Karbonhidrat (g)' : 'Carbs (g)']: Number(meal.carbs) || 0,
          [isTr ? 'Yağ (g)' : 'Fat (g)']: Number(meal.fat) || 0,
          [isTr ? 'Açıklama' : 'Description']: meal.description || '',
          [isTr ? 'Malzemeler' : 'Ingredients']: (meal.ingredients || []).join(', '),
          [isTr ? 'Alternatifler' : 'Alternatives']: (meal.alternatives || []).join(', '),
        });
      });
    });

    const wsMeals = XLSX.utils.json_to_sheet(mealRows);
    wsMeals['!cols'] = [
      { wch: 15 },
      { wch: 15 },
      { wch: 25 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 10 },
      { wch: 40 },
      { wch: 40 },
      { wch: 30 },
    ];
    XLSX.utils.book_append_sheet(wb, wsMeals, isTr ? 'Haftalık Plan' : 'Weekly Plan');

    // 2. Summary Sheet
    const summaryRows = [
      { [isTr ? 'Parametre' : 'Parameter']: isTr ? 'Günlük Hedef Kalori' : 'Daily Calories Goal', [isTr ? 'Değer' : 'Value']: `${effectiveDailyCalories} kcal` },
      { [isTr ? 'Parametre' : 'Parameter']: isTr ? 'Günlük Protein' : 'Daily Protein', [isTr ? 'Değer' : 'Value']: `${effectiveProtein} g` },
      { [isTr ? 'Parametre' : 'Parameter']: isTr ? 'Günlük Karbonhidrat' : 'Daily Carbs', [isTr ? 'Değer' : 'Value']: `${effectiveCarbs} g` },
      { [isTr ? 'Parametre' : 'Parameter']: isTr ? 'Günlük Yağ' : 'Daily Fat', [isTr ? 'Değer' : 'Value']: `${effectiveFat} g` },
      { [isTr ? 'Parametre' : 'Parameter']: isTr ? 'Plan Özeti' : 'Plan Summary', [isTr ? 'Değer' : 'Value']: plan.summary || '' },
    ];
    (plan.tips || []).forEach((tip, i) => {
      summaryRows.push({
        [isTr ? 'Parametre' : 'Parameter']: `${isTr ? 'Tavsiye' : 'Tip'} ${i + 1}`,
        [isTr ? 'Değer' : 'Value']: tip
      });
    });

    const wsSummary = XLSX.utils.json_to_sheet(summaryRows);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, isTr ? 'Özet ve Hedefler' : 'Summary & Goals');

    // 3. Shopping List Sheet
    const shoppingListItems = generateShoppingList();
    const shoppingRows = shoppingListItems.map(item => ({
      [isTr ? 'Alınacak Malzeme' : 'Shopping Item']: item
    }));
    const wsShopping = XLSX.utils.json_to_sheet(shoppingRows);
    wsShopping['!cols'] = [{ wch: 40 }];
    XLSX.utils.book_append_sheet(wb, wsShopping, isTr ? 'Alışveriş Listesi' : 'Shopping List');

    XLSX.writeFile(wb, `NutriAI_Diyet_Plani.xlsx`);
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
  const barData = [
    { name: t('protein'), grams: effectiveProtein, fill: '#10b981' },
    { name: t('carbs'), grams: effectiveCarbs, fill: '#3b82f6' },
    { name: t('fat'), grams: effectiveFat, fill: '#f59e0b' },
  ];

  const handleDownloadPDF = async () => {
    setIsGeneratingPdf(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const element = document.getElementById('print-friendly-plan');
    if (!element) { setIsGeneratingPdf(false); return; }
    
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 1.0);
    
    const imgWidth = 190;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    let heightLeft = imgHeight;
    let position = 10;
    
    pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - 20); // Accounting for margins
    
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    
    pdf.save(`NutriAI_Diyet_Plani_${userData.age}yas.pdf`);
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7 }}
      className="space-y-8" 
      ref={dashboardRef}
    >
       
       <div id="print-friendly-plan" className="absolute -left-[9999px] top-0 w-[210mm] bg-white p-8 print:static print:block print:w-full print:bg-white">
         <h1 className="text-4xl font-black text-emerald-950 mb-6">{t('printPlan')}</h1>
         <div className="mb-8 p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
           <h2 className="text-xl font-bold mb-2 text-emerald-900">{t('summary')}</h2>
           <p className="text-emerald-800 leading-relaxed">{plan.summary}</p>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm font-bold">
             <p className="text-emerald-900">{t('dailyCalories')}: {effectiveDailyCalories} kcal</p>
             <p className="text-emerald-900">{t('protein')}: {effectiveProtein} g</p>
             <p className="text-emerald-900">{t('carbs')}: {effectiveCarbs} g</p>
             <p className="text-emerald-900">{t('fat')}: {effectiveFat} g</p>
           </div>
         </div>
         <div className="space-y-8">
           {(plan.weeklyPlan || []).map((day, dIdx) => (
             <div key={dIdx} className="break-inside-avoid border-b pb-6">
               <h2 className="text-2xl font-black text-emerald-900 mb-4">{translateDay(day.day, dIdx)}</h2>
               <div className="grid grid-cols-2 gap-4">
                  {day.meals.map((meal, mIdx) => (
                    <div key={mIdx} className="border p-4 rounded-xl bg-gray-50">
                       <h3 className="font-bold text-lg text-emerald-950">{meal.dish}</h3>
                       <p className="text-sm text-gray-600 mb-1 font-medium">{meal.time} • {meal.calories} kcal</p>
                       <p className="text-sm text-gray-800">{meal.description}</p>
                    </div>
                  ))}
               </div>
             </div>
           ))}
         </div>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 xl:gap-8">
        <div className="lg:col-span-2 bg-white p-6 md:p-8 xl:p-10 rounded-[2.5rem] shadow-sm border border-green-50 flex flex-col xl:flex-row gap-8 xl:gap-10 relative overflow-hidden">
          <div className="flex-1 relative z-10">
            {sharedId ? (
              <div className="mb-8 p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl flex items-center justify-between gap-4 text-xs text-emerald-800 animate-in fade-in duration-300 no-print">
                <div className="flex items-center gap-3 truncate">
                  <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm border border-emerald-100 shrink-0">
                    <i className="fas fa-link text-emerald-600"></i>
                  </div>
                  <div className="flex flex-col truncate">
                    <span className="font-black text-emerald-700 uppercase tracking-wider text-[10px]">{t('shareLink')}</span>
                    <span className="font-mono text-emerald-900 truncate select-all">{window.location.origin}/ID/{sharedId}</span>
                  </div>
                </div>
                <button 
                  onClick={() => copyToClipboard(`${window.location.origin}/ID/${sharedId}`)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shrink-0 flex items-center gap-2 active:scale-95 text-xs shadow-sm"
                >
                  <i className="fas fa-copy"></i>
                  {copySuccess ? t('copied') : t('copy')}
                </button>
              </div>
            ) : (
              <div className="mb-8 p-4 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between gap-4 text-xs text-gray-500 animate-in fade-in duration-300 no-print">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 shrink-0">
                    <i className="fas fa-spinner fa-spin text-emerald-600"></i>
                  </div>
                  <span className="font-bold">{t('generatingShareLink')}</span>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <h2 className="text-3xl md:text-4xl font-black text-green-950 tracking-tight">{t('planSummary')}</h2>
              <div className="flex items-center gap-3 no-print">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button onClick={() => { setLang('tr'); localStorage.setItem('lang', 'tr'); window.dispatchEvent(new CustomEvent('languageChange')); }} className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${lang === 'tr' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>TR</button>
                  <button onClick={() => { setLang('en'); localStorage.setItem('lang', 'en'); window.dispatchEvent(new CustomEvent('languageChange')); }} className={`px-3 py-1.5 text-xs font-black rounded-lg transition-all ${lang === 'en' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>EN</button>
                </div>
                <button 
                  onClick={handleEditGeneralClick}
                  className="px-5 py-2.5 text-xs font-black text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all flex items-center gap-2 no-print shadow-sm shadow-amber-100/50"
                >
                  <i className="fas fa-edit"></i> {t('editGoals')}
                </button>
              </div>
            </div>
            <p className="text-green-800/80 leading-relaxed font-medium text-lg mb-10">{plan.summary}</p>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-emerald-50/50 px-5 py-4 rounded-2xl border border-emerald-100 flex flex-col group hover:bg-emerald-50 transition-colors">
                <span className="text-[10px] text-emerald-600 font-black uppercase tracking-wider mb-1">{t('dailyCalories')}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-emerald-950">{effectiveDailyCalories}</span>
                  <span className="text-xs font-bold text-emerald-600">kcal</span>
                </div>
              </div>
              <div className="bg-emerald-50/30 px-5 py-4 rounded-2xl border border-emerald-100/70 flex flex-col group hover:bg-emerald-50/60 transition-colors">
                <span className="text-[10px] text-emerald-700 font-black uppercase tracking-wider mb-1">{t('protein')}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-emerald-950">{effectiveProtein}</span>
                  <span className="text-xs font-bold text-emerald-600">g</span>
                </div>
              </div>
              <div className="bg-blue-50/30 px-5 py-4 rounded-2xl border border-blue-100/70 flex flex-col group hover:bg-blue-50/60 transition-colors">
                <span className="text-[10px] text-blue-700 font-black uppercase tracking-wider mb-1">{t('carbs')}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-blue-950">{effectiveCarbs}</span>
                  <span className="text-xs font-bold text-blue-600">g</span>
                </div>
              </div>
              <div className="bg-amber-50/30 px-5 py-4 rounded-2xl border border-amber-100/70 flex flex-col group hover:bg-amber-50/60 transition-colors">
                <span className="text-[10px] text-amber-700 font-black uppercase tracking-wider mb-1">{t('fat')}</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-black text-amber-950">{effectiveFat}</span>
                  <span className="text-xs font-bold text-amber-600">g</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="w-full xl:w-80 2xl:w-96 flex flex-col items-center justify-center relative z-10 gap-10 bg-slate-50/30 p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shrink-0">
            <div className="w-full h-56" ref={chartContainerRef}>
              {isGeneratingPdf && chartContainerRef.current ? (
                 <PieChart width={chartContainerRef.current.offsetWidth} height={chartContainerRef.current.offsetHeight}>
                    <Pie data={macroData} cx="50%" cy="50%" innerRadius={75} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none">
                      {macroData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]} />
                 </PieChart>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={macroData} cx="50%" cy="50%" innerRadius={75} outerRadius={100} paddingAngle={8} dataKey="value" stroke="none">
                      {macroData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            
            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={11} fontWeight="bold" axisLine={false} tickLine={false} />
                  <YAxis fontSize={11} fontWeight="bold" axisLine={false} tickLine={false} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} />
                  <Bar dataKey="grams" name={lang === 'tr' ? 'Gram' : 'Grams'} radius={[6, 6, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex justify-center gap-6 text-xs font-black tracking-widest mt-2"> 
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200"></span> PROTEİN</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-blue-500 shadow-sm shadow-blue-200"></span> KARB</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-200"></span> YAĞ</span>
            </div>
          </div>
        </div>
        <div className="bg-[#064e3b] text-white p-8 md:p-10 rounded-[2.5rem] shadow-xl shadow-green-900/10 flex flex-col">
          <h3 className="text-2xl font-black mb-8 flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-400 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-400/20 text-emerald-950">
              <i className="fas fa-lightbulb text-xl"></i>
            </div>
            {t('recommendations')}
          </h3>
          <ul className="space-y-6 flex-1">
            {(plan.tips || []).slice(0, 6).map((tip, i) => (
              <li key={i} className="flex gap-5 text-sm md:text-base font-medium text-emerald-50/90 leading-relaxed group">
                <i className="fas fa-check-circle text-emerald-400 mt-1 text-lg shrink-0 group-hover:scale-110 transition-transform"></i>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {allFavoriteMeals.length > 0 && (
        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-green-50 animate-in fade-in duration-500">
          <h3 className="text-2xl font-black text-emerald-950 mb-6 flex items-center gap-3"><i className="fas fa-star text-yellow-500"></i> {t('favoriteMeals')}</h3>
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

      {/* Weight Progress Chart Card */}
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-emerald-100/80 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 shadow-sm">
                <i className="fas fa-weight text-lg"></i>
              </div>
              <h3 className="text-2xl font-black text-emerald-950 tracking-tight">{t('weightProgress')}</h3>
            </div>
            <p className="text-sm text-slate-500 mt-1 font-medium">
              {lang === 'tr' ? 'Kilonuzu düzenli kaydederek gelişiminizi grafik üzerinde takip edin.' : 'Log your weight regularly to track your progress on the line chart.'}
            </p>
          </div>

          {/* Stat Badges if data exists */}
          {localWeightHistory.length > 0 && (
            <div className="flex flex-wrap gap-3 items-center">
              <div className="bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 text-xs font-bold text-emerald-900">
                <span className="text-emerald-600 block text-[10px] uppercase font-black">{lang === 'tr' ? 'Son Kilo' : 'Latest Weight'}</span>
                <span className="text-lg font-black">{localWeightHistory[localWeightHistory.length - 1].weight} kg</span>
              </div>
              {localWeightHistory.length > 1 && (
                <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100 text-xs font-bold text-blue-900">
                  <span className="text-blue-600 block text-[10px] uppercase font-black">{lang === 'tr' ? 'Toplam Değişim' : 'Total Change'}</span>
                  <span className={`text-lg font-black ${
                    localWeightHistory[localWeightHistory.length - 1].weight - localWeightHistory[0].weight < 0 
                      ? 'text-emerald-600' 
                      : localWeightHistory[localWeightHistory.length - 1].weight - localWeightHistory[0].weight > 0 
                      ? 'text-amber-600' 
                      : 'text-slate-600'
                  }`}>
                    {(localWeightHistory[localWeightHistory.length - 1].weight - localWeightHistory[0].weight).toFixed(1)} kg
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Line Chart */}
          <div className="lg:col-span-2 bg-slate-50/50 p-4 sm:p-6 rounded-2xl border border-slate-100">
            {localWeightHistory.length > 0 ? (
              <div className="w-full h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={localWeightHistory} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="date" fontSize={11} fontWeight="bold" stroke="#64748b" tickLine={false} />
                    <YAxis domain={['dataMin - 1', 'dataMax + 1']} fontSize={11} fontWeight="bold" stroke="#64748b" tickLine={false} unit=" kg" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      labelStyle={{ fontWeight: 'bold', color: '#0f172a' }}
                      formatter={(value: number) => [`${value} kg`, t('weightKg')]} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="weight" 
                      name={t('weightKg')} 
                      stroke="#10b981" 
                      strokeWidth={3} 
                      dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#ffffff' }} 
                      activeDot={{ r: 8, fill: '#059669' }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <i className="fas fa-chart-line text-4xl mb-3 text-emerald-300"></i>
                <p className="font-bold text-sm text-slate-600">{t('noWeightHistory')}</p>
              </div>
            )}
          </div>

          {/* Form to add weight */}
          <div className="bg-emerald-50/40 p-6 rounded-2xl border border-emerald-100/80 flex flex-col justify-between no-print">
            <div>
              <h4 className="text-base font-extrabold text-emerald-950 mb-4 flex items-center gap-2">
                <i className="fas fa-plus-circle text-emerald-600"></i> {t('addWeight')}
              </h4>
              <form onSubmit={handleAddWeight} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">{t('weightKg')}</label>
                  <input 
                    type="number" 
                    step="0.1" 
                    placeholder="Örn: 72.5" 
                    value={newWeight} 
                    onChange={(e) => setNewWeight(e.target.value)} 
                    required 
                    className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-emerald-800 mb-1">{t('dateLabel')}</label>
                  <input 
                    type="date" 
                    value={newWeightDate} 
                    onChange={(e) => setNewWeightDate(e.target.value)} 
                    required 
                    className="w-full px-4 py-2.5 rounded-xl border border-emerald-200 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800 text-sm"
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-sm transition-all shadow-md shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-2"
                >
                  <i className="fas fa-check"></i> {t('addWeight')}
                </button>
              </form>
            </div>

            {/* History Table List */}
            {localWeightHistory.length > 0 && (
              <div className="mt-6 pt-4 border-t border-emerald-200/60">
                <span className="text-[11px] font-black uppercase text-emerald-800 tracking-wider mb-2 block">
                  {lang === 'tr' ? 'Son Kayıtlar' : 'Recent Entries'}
                </span>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {localWeightHistory.slice(-5).reverse().map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-white px-3 py-1.5 rounded-lg border border-emerald-100 text-xs font-medium text-slate-700">
                      <span className="font-mono text-slate-500">{item.date}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-emerald-950">{item.weight} kg</span>
                        <button 
                          type="button" 
                          onClick={() => handleDeleteWeight(item.date)} 
                          className="text-slate-300 hover:text-red-500 transition-colors"
                          title={lang === 'tr' ? 'Sil' : 'Delete'}
                        >
                          <i className="fas fa-trash-alt text-[10px]"></i>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Selection */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-green-50 overflow-hidden">
        <div className="flex overflow-x-auto p-4 md:p-6 gap-3 border-b border-green-50 scrollbar-hide no-print bg-slate-50/50">
          {(plan.weeklyPlan || []).map((day, idx) => (
            <button key={idx} onClick={() => setActiveDay(idx)} className={`px-8 py-4 rounded-2xl font-black text-sm whitespace-nowrap transition-all duration-300 ${activeDay === idx ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-200 ring-4 ring-emerald-600/10 scale-105' : 'text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900'}`} aria-current={activeDay === idx ? 'page' : undefined}>
              {translateDay(day.day, idx)}
            </button>
          ))}
        </div>

        <div className="p-8 md:p-12">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-12 gap-6">
            <h3 className="text-4xl font-black text-emerald-950 tracking-tight">{currentDay.day || (lang === 'tr' ? `${activeDay + 1}. Gün` : `Day ${activeDay + 1}`)} {t('menu')}</h3>
            <div className="flex flex-wrap gap-3 sm:gap-4 items-center">
              <div ref={downloadMenuRef} className="relative inline-block text-left no-print">
                <button onClick={() => setShowDownloadOptions(prev => !prev)} type="button" className="inline-flex justify-center items-center w-full rounded-2xl border-2 border-slate-100 shadow-sm px-6 py-3.5 bg-white text-sm font-black text-slate-700 hover:bg-slate-50 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500">
                  <i className="fas fa-download mr-3 text-emerald-600"></i> {t('download')}
                  <i className="fas fa-chevron-down ml-3 text-[10px] text-slate-400"></i>
                </button>
                {showDownloadOptions && (
                  <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                    <div className="py-1">
                      <button onClick={() => { handleDownloadPDF(); setShowDownloadOptions(false); }} disabled={isGeneratingPdf} className="text-gray-700 disabled:opacity-50 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                        {isGeneratingPdf ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-file-pdf mr-2 text-red-500"></i>} {t('pdf')}
                      </button>
                      <button onClick={() => { handleDownloadPlanXlsx(); setShowDownloadOptions(false); }} className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                        <i className="fas fa-file-excel mr-2 text-emerald-600"></i> {t('excel')}
                      </button>
                      <button onClick={() => { handleDownloadPlanTxt(); setShowDownloadOptions(false); }} className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                        <i className="fas fa-file-alt mr-2 text-blue-500"></i> {t('txt')}
                      </button>
                      <button onClick={() => { handleDownloadPlanJson(); setShowDownloadOptions(false); }} className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">
                        <i className="fas fa-file-code mr-2 text-purple-500"></i> {t('json')}
                      </button>
                       <button onClick={() => { handleDownloadShoppingList(); setShowDownloadOptions(false); }} className="text-gray-700 block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 border-t mt-1 pt-1">
                        <i className="fas fa-shopping-basket mr-2 text-orange-500"></i> {t('shoppingList')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setShowShoppingList(true)} className="bg-blue-600 hover:bg-blue-700 text-white w-12 h-12 flex items-center justify-center rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-95 no-print" title={t('shoppingList')}>
                <i className="fas fa-shopping-basket"></i>
              </button>
              <button 
                onClick={handleDownloadPDF} 
                className="flex items-center gap-3 px-8 py-3.5 rounded-2xl shadow-xl transition-all active:scale-95 no-print font-black text-sm bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
                title={t('print')}
              >
                <i className="fas fa-print"></i>
                {t('print')}
              </button>
              <button 
                onClick={handleShare} 
                disabled={isSharing}
                className={`flex items-center gap-3 px-8 py-3.5 rounded-2xl shadow-xl transition-all active:scale-95 no-print font-black text-sm ${sharedId ? 'bg-green-600 hover:bg-green-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white disabled:opacity-50`}
                title={t('share')}
              >
                {isSharing ? (
                  <i className="fas fa-spinner fa-spin"></i>
                ) : sharedId ? (
                  <i className="fas fa-link"></i>
                ) : (
                  <i className="fas fa-share-alt"></i>
                )}
                {copySuccess ? t('copied') : sharedId ? t('copyLink') : t('share')}
              </button>
            </div>
            

          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <AnimatePresence mode="wait">
              <motion.div 
                key={activeDay}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 col-span-full"
              >
                {currentMeals.map((meal, index) => (
                  <motion.div 
                    key={meal.id} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="group bg-emerald-50/20 p-8 rounded-[2rem] border border-transparent hover:border-emerald-100 hover:bg-white transition-all duration-500 hover:shadow-xl hover:shadow-emerald-900/5"
                  >
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
                        <button onClick={() => toggleFavoriteMeal(meal.id)} className={`text-xl transition ${favoriteMeals.has(meal.id) ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`} aria-label={favoriteMeals.has(meal.id) ? (lang === 'tr' ? 'Favorilerden Kaldır' : 'Remove from Favorites') : (lang === 'tr' ? 'Favorilere Ekle' : 'Add to Favorites')}>
                          <i className={`fas fa-star ${favoriteMeals.has(meal.id) ? 'fa-solid' : 'fa-regular'}`}></i>
                        </button>
                      </div>
                    </div>
                    <p className="text-sm font-medium text-emerald-800/70 mb-8 leading-relaxed">{meal.description}</p>
                    <div className="mt-6 border-t border-emerald-100/50 pt-6 flex items-center justify-between no-print">
                      {(meal.prepTime || meal.servings || meal.ingredients?.length || meal.alternatives?.length) ? (
                        <button onClick={() => toggleExpandMeal(meal.id)} className="text-emerald-600 font-bold flex items-center gap-2 hover:text-emerald-800 transition" aria-expanded={expandedMeals.has(meal.id)} aria-controls={`recipe-details-${meal.id}`}>
                          {lang === 'tr' ? 'Tarif Detayları' : 'Recipe Details'} <i className={`fas fa-chevron-${expandedMeals.has(meal.id) ? 'up' : 'down'} text-xs`}></i>
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600/40 font-bold">{lang === 'tr' ? 'Tarif bilgisi yok' : 'No recipe details'}</span>
                      )}
                      <button 
                        onClick={() => handleEditMealClick(meal)} 
                        className="text-amber-600 hover:text-amber-800 font-bold flex items-center gap-1.5 transition"
                      >
                        <i className="fas fa-edit text-xs"></i> {lang === 'tr' ? 'Düzenle' : 'Edit'}
                      </button>
                    </div>
                    <AnimatePresence>
                      {expandedMeals.has(meal.id) && (meal.prepTime || meal.servings || meal.ingredients?.length || meal.alternatives?.length) && (
                        <motion.div 
                          id={`recipe-details-${meal.id}`}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="mt-4 space-y-3 text-sm text-emerald-800 overflow-hidden"
                        >
                          {meal.prepTime && <p><strong>{t('prepTime')}</strong> {meal.prepTime}</p>}
                          {meal.servings && <p><strong>{t('servings')}</strong> {meal.servings}</p>}
                          {meal.ingredients?.length && <div><p className="font-bold mb-1">{t('ingredients')}:</p><ul className="list-disc list-inside pl-2 space-y-0.5">{meal.ingredients.map((ing, idx) => <li key={idx}>{ing}</li>)}</ul></div>}
                          {meal.alternatives?.length && <div><p className="font-bold mb-1">{t('alternatives')}:</p><ul className="list-disc list-inside pl-2 space-y-0.5">{meal.alternatives.map((alt, idx) => <li key={idx}>{alt}</li>)}</ul></div>}
                          <div className="mt-4 pt-4 border-t border-emerald-100 flex items-center gap-3">
                            <span className="text-xs font-bold text-emerald-600">{t('downloadRecipe')}:</span>
                            <button onClick={() => handleDownloadRecipeTxt(meal)} className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-lg hover:bg-blue-200 transition" title={lang === 'tr' ? 'Metin olarak indir' : 'Download as TXT'}><i className="fas fa-file-alt mr-1"></i> TXT</button>
                            <button onClick={() => handleDownloadRecipeJson(meal)} className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-lg hover:bg-purple-200 transition" title={lang === 'tr' ? 'JSON olarak indir' : 'Download as JSON'}><i className="fas fa-file-code mr-1"></i> JSON</button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <div className="flex gap-8 border-t border-emerald-100/50 pt-6 mt-8">
                      <div className="flex flex-col"><span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">P</span><span className="text-base font-black text-emerald-950">{meal.protein}g</span></div>
                      <div className="flex flex-col"><span className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">C</span><span className="text-base font-black text-emerald-950">{meal.carbs}g</span></div>
                      <div className="flex flex-col"><span className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">F</span><span className="text-base font-black text-emerald-950">{meal.fat}g</span></div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4 pb-12 no-print">
        <button onClick={onReset} className="flex items-center gap-2 text-emerald-600 font-extrabold hover:text-emerald-800 transition-all hover:scale-105"><i className="fas fa-redo"></i> {t('updateAndRegenerate')}</button>
      </div>

      {showShoppingList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-300 no-print" onClick={() => setShowShoppingList(false)}>
          <div className="bg-white p-8 rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto relative" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="shopping-list-title">
            <h3 id="shopping-list-title" className="text-2xl font-bold text-emerald-950 mb-6 flex items-center gap-3"><i className="fas fa-shopping-basket text-blue-500"></i> {t('shoppingList')}</h3>
            <ul className="space-y-2 text-emerald-800">
              {shoppingList.map((item, index) => (
                <li key={index} className="flex items-start">
                  <input type="checkbox" className="mr-3 mt-1 w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" id={`shopping-item-${index}`} />
                  <label htmlFor={`shopping-item-${index}`} className="flex-1">{item}</label>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex justify-end gap-3">
              <button onClick={() => setShowShoppingList(false)} className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition">{t('close')}</button>
              <button onClick={() => { handleDownloadShoppingList(); setShowShoppingList(false);}} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition">{t('downloadList')}</button>
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
            <h3 className="text-xl font-extrabold text-amber-950 mb-3 text-center">⚠️ {t('warningTitle')}</h3>
            <p className="text-sm text-amber-900/80 leading-relaxed mb-6 text-center font-semibold">
              {t('warningText')}
            </p>
            <p className="text-xs text-amber-800/70 leading-relaxed mb-8 text-center bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
              {t('warningTextSecondary')}
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowWarningModal(false); setPendingEditMeal(null); setPendingGeneralEdit(false); }}
                className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all text-sm"
              >
                {t('warningCancel')}
              </button>
              <button 
                onClick={handleConfirmWarning}
                className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-amber-200 text-sm"
              >
                {t('warningConfirm')}
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
                <span className="text-xs font-black text-amber-600 uppercase tracking-widest block mb-1">{t('dietitianPanel')}</span>
                <h3 className="text-2xl font-black text-emerald-950">{t('editMealTitle')}</h3>
              </div>
              <button onClick={() => { setEditingMeal(null); setFormMeal(null); }} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSaveMeal} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-emerald-900 mb-1.5">{t('dishName')}</label>
                  <input 
                    type="text" 
                    required
                    value={formMeal.dish}
                    onChange={(e) => setFormMeal({ ...formMeal, dish: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-emerald-950"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-emerald-900 mb-1.5">{t('mealTime')}</label>
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
                <label className="block text-sm font-bold text-emerald-900 mb-1.5">{t('descriptionLabel')}</label>
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
                  <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">{t('caloriesUnit')}</label>
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
                  <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">{t('proteinUnit')}</label>
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
                  <label className="block text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">{t('carbsUnit')}</label>
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
                  <label className="block text-[10px] font-black text-amber-600 uppercase tracking-wider mb-1">{t('fatUnit')}</label>
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
                  <label className="block text-sm font-bold text-emerald-900 mb-1.5">{t('prepTimeLabel')}</label>
                  <input 
                    type="text" 
                    value={formMeal.prepTime || ''}
                    onChange={(e) => setFormMeal({ ...formMeal, prepTime: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-emerald-950"
                    placeholder="Belirtilmemiş"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-emerald-900 mb-1.5">{t('servingsLabel')}</label>
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
                <label className="block text-sm font-bold text-emerald-900 mb-1">{lang === 'tr' ? 'Malzemeler (Her satıra bir tane)' : 'Ingredients (One per line)'}</label>
                <span className="text-[10px] text-gray-400 block mb-1.5">{t('ingredientsLineHelp')}</span>
                <textarea 
                  rows={4}
                  value={(formMeal.ingredients || []).join('\n')}
                  onChange={(e) => setFormMeal({ ...formMeal, ingredients: e.target.value.split('\n') })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-semibold font-mono text-sm text-emerald-950"
                  placeholder={t('ingredientsPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-emerald-900 mb-1">{lang === 'tr' ? 'Alternatifler (Her satıra bir tane)' : 'Alternatives (One per line)'}</label>
                <span className="text-[10px] text-gray-400 block mb-1.5">{t('alternativesLineHelp')}</span>
                <textarea 
                  rows={3}
                  value={(formMeal.alternatives || []).join('\n')}
                  onChange={(e) => setFormMeal({ ...formMeal, alternatives: e.target.value.split('\n') })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-semibold font-mono text-sm text-emerald-950"
                  placeholder={t('alternativesPlaceholder')}
                />
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white pb-2">
                <button 
                  type="button"
                  onClick={() => { setEditingMeal(null); setFormMeal(null); }}
                  className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all text-sm"
                >
                  {t('close')}
                </button>
                <button 
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-200 text-sm"
                >
                  {t('save')}
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
                 <span className="text-xs font-black text-amber-600 uppercase tracking-widest block mb-1">{t('dietitianPanel')}</span>
                 <h3 className="text-2xl font-black text-emerald-950">{t('editGoalsTitle')}</h3>
               </div>
              <button onClick={() => { setIsEditingGeneral(false); setFormGeneral(null); }} className="w-10 h-10 rounded-full bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors">
                <i className="fas fa-times"></i>
              </button>
            </div>

            <form onSubmit={handleSaveGeneral} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-emerald-900 mb-1.5">{t('planSummary')}</label>
                <textarea 
                  required
                  rows={4}
                  value={formGeneral.summary}
                  onChange={(e) => setFormGeneral({ ...formGeneral, summary: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-emerald-950 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-emerald-900 mb-1.5">{t('dailyTargetCaloriesLabel')}</label>
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
                  <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">{t('proteinUnit')}</label>
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
                  <label className="block text-[10px] font-black text-blue-600 uppercase tracking-wider mb-1">{t('carbsUnit')}</label>
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
                  <label className="block text-[10px] font-black text-amber-600 uppercase tracking-wider mb-1">{t('fatUnit')}</label>
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
                  {t('close')}
                </button>
                <button 
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-200 text-sm"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default DietDashboard;
