import { UserData, AIResponse, DietPlan } from "../types";

const mealSchema = {
  type: "OBJECT",
  properties: {
    id: { type: "STRING" },
    time: { type: "STRING" },
    dish: { type: "STRING" },
    description: { type: "STRING" },
    calories: { type: "INTEGER" },
    protein: { type: "INTEGER" },
    carbs: { type: "INTEGER" },
    fat: { type: "INTEGER" },
    prepTime: { type: "STRING" },
    servings: { type: "STRING" },
    ingredients: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    alternatives: {
      type: "ARRAY",
      items: { type: "STRING" }
    }
  },
  required: ["id", "time", "dish", "description", "calories", "protein", "carbs", "fat"]
};

const dayPlanSchema = {
  type: "OBJECT",
  properties: {
    day: { type: "STRING" },
    meals: {
      type: "ARRAY",
      items: mealSchema
    }
  },
  required: ["day", "meals"]
};

const dietPlanSchema = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    dailyCalories: { type: "INTEGER" },
    macros: {
      type: "OBJECT",
      properties: {
        protein: { type: "INTEGER" },
        carbs: { type: "INTEGER" },
        fat: { type: "INTEGER" }
      },
      required: ["protein", "carbs", "fat"]
    },
    weeklyPlan: {
      type: "ARRAY",
      items: dayPlanSchema,
      description: "Haftalık plan. Haftanın tüm günlerini (Pazartesi, Salı, Çarşamba, Perşembe, Cuma, Cumartesi, Pazar) kapsayan TAM OLARAK 7 günlük veri nesnesi içermelidir. Eksik gün bırakılmamalıdır."
    },
    tips: {
      type: "ARRAY",
      items: { type: "STRING" }
    }
  },
  required: ["summary", "dailyCalories", "macros", "weeklyPlan", "tips"]
};

const aiResponseSchema = {
  type: "OBJECT",
  properties: {
    type: {
      type: "STRING",
      enum: ["questions", "plan"]
    },
    questions: {
      type: "ARRAY",
      items: { type: "STRING" }
    },
    plan: dietPlanSchema
  },
  required: ["type"]
};

const getDurationText = (duration?: string) => {
  switch (duration) {
    case '5_days':
      return {
        label: "5 Günlük Diyet Planı",
        instruction: "Süresi: 5 Gün. haftalık plan (weeklyPlan) dizisi TAM OLARAK 5 gün içermelidir (Gün 1, Gün 2, Gün 3, Gün 4, Gün 5). Eksik gün bırakmayın."
      };
    case '2_weeks':
      return {
        label: "2 Haftalık Diyet Planı (14 Gün)",
        instruction: "Süresi: 14 Gün. haftalık plan (weeklyPlan) dizisi TAM OLARAK 14 gün içermelidir (Gün 1, Gün 2, ..., Gün 14). Eksik gün bırakmayın."
      };
    case '1_month':
      return {
        label: "1 Aylık Diyet Planı (30 Gün)",
        instruction: "Süresi: 1 Aylık Döngüsel Plan. Çıktı ve token limitlerine takılmamak adına, haftalık plan (weeklyPlan) dizisine TAM OLARAK 14 günlük detaylı menü (Gün 1'den Gün 14'e kadar) ekleyin. Öneriler (tips) dizisinde ise bu 14 günlük menüyü 30 güne nasıl tamamlayacaklarını, haftalık değişiklikleri ve rotasyon önerilerini detaylıca anlatın."
      };
    case '1_week':
    default:
      return {
        label: "1 Haftalık Diyet Planı (7 Gün)",
        instruction: "Süresi: 7 Gün. haftalık plan (weeklyPlan) dizisi TAM OLARAK 7 gün içermelidir (Pazartesi, Salı, Çarşamba, Perşembe, Cuma, Cumartesi, Pazar). Eksik gün bırakmayın."
      };
  }
};

export const analyzeAndAsk = async (userData: UserData): Promise<AIResponse> => {
  const durationInfo = getDurationText(userData.duration);
  const prompt = `
    Kullanıcı bir diyet planı istiyor. Verilerini aşağıda görebilirsin. 
    Lütfen bu verileri analiz et veya 2-3 ek soru sor (Örn: Bütçe, mutfak ekipmanı, iş saatleri vb.). Eğer soru soracaksan, "questions" tipinde yanıt ver. 
    Eğer veriler yeterliyse doğrudan "plan" tipinde tam bir diyet planı oluştur.
    
    ÖNEMLİ: Eğer doğrudan diyet planı ("plan") oluşturacaksan, planın süresi şudur:
    Seçilen Süre: ${durationInfo.label}
    Süre Talimatı: ${durationInfo.instruction}

    Kullanıcı Verileri:
    - Yaş: ${userData.age || 'Belirtilmedi'}, Cinsiyet: ${userData.gender || 'Belirtilmedi'}
    - Kilo: ${userData.weight ? userData.weight + ' kg' : 'Belirtilmedi'}, Boy: ${userData.height ? userData.height + ' cm' : 'Belirtilmedi'}
    - Hedef: ${userData.goal || 'Belirtilmedi'}, Aktivite: ${userData.activityLevel || 'Belirtilmedi'}
    - Kısıtlamalar: ${userData.restrictions?.join(', ') || 'Yok'}
    - Alerjiler: ${userData.allergies || 'Yok'}
    - Sevilmeyenler: ${userData.dislikedFoods || 'Yok'}
    - Tıbbi Durumlar: ${userData.medicalConditions || 'Yok'}
    - Özel İstekler: ${userData.extraNotes || 'Yok'}
    - Seçilen Süre: ${durationInfo.label}
    
    Yanıt formatın MUTLAKA JSON olmalı ve "type" alanı ('questions' veya 'plan') içermeli.
  `;

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, schema: aiResponseSchema }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Sunucu hatası.");
  }

  return response.json();
};

export const generateFinalPlan = async (userData: UserData, answers: Record<string, string>): Promise<DietPlan> => {
  const answersString = Object.entries(answers).map(([q, a]) => `Soru: ${q}\nCevap: ${a}`).join('\n');
  const durationInfo = getDurationText(userData.duration);
  
  const prompt = `
    Kullanıcının temel verileri ve ek sorulara verdiği yanıtlar aşağıdadır. 
    Lütfen profesyonel, esnek ve detaylı bir diyet planı oluşturun.
    
    Seçilen Plan Süresi: ${durationInfo.label}
    Süre Talimatı: ${durationInfo.instruction}
    
    Her günün (day) adı Türkçe olmalı (Örn: "Pazartesi", "Salı" vb. ya da 2 haftalık/1 aylık ise "Gün 1", "Gün 2" vb. şeklinde).
    Her öğün için benzersiz bir ID (örn: gun1-kahvalti), hazırlanış süresi, porsiyon bilgisi, malzemeler (liste olarak) ve 1-2 alternatif (liste olarak) ekle.

    ÖZELLİKLE kullanıcının şu özel isteğini/notunu dikkate al: "${userData.extraNotes || 'Yok'}"

    Temel Veriler: ${JSON.stringify(userData)}
    Ek Yanıtlar:
    ${answersString}
    
    Yanıt dili Türkçe olmalı.
    Plan Şunları İçermeli:
    1. Günlük Kalori ve Makro (Protein, Karbonhidrat, Yağ) hedefleri. ÖNEMLİ: Günlük toplam Protein, Karbonhidrat, Yağ ve Kalori değerleri, o günün tüm öğünlerindeki (yiyeceklerindeki) protein, karbonhidrat, yağ ve kalorilerin BİREBİR TOPLAMI ile eşleşmelidir.
    2. Belirtilen sürenin her günü için öğünler.
    3. Her öğün için kalori ve makro değerleri (protein, carbs, fat), tarif/içerik özeti.
    
    Yanıtı SADECE JSON formatında döndür.
  `;

  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, schema: dietPlanSchema }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Sunucu hatası.");
  }

  const rawPlan: DietPlan = await response.json();
  
  // Ensure plan.macros and dailyCalories match exact sum of first day's meals if available
  if (rawPlan.weeklyPlan && rawPlan.weeklyPlan.length > 0) {
    const dayMeals = rawPlan.weeklyPlan[0].meals || [];
    if (dayMeals.length > 0) {
      const sumProtein = dayMeals.reduce((acc, m) => acc + (Number(m.protein) || 0), 0);
      const sumCarbs = dayMeals.reduce((acc, m) => acc + (Number(m.carbs) || 0), 0);
      const sumFat = dayMeals.reduce((acc, m) => acc + (Number(m.fat) || 0), 0);
      const sumCal = dayMeals.reduce((acc, m) => acc + (Number(m.calories) || 0), 0);
      
      return {
        ...rawPlan,
        dailyCalories: sumCal > 0 ? sumCal : rawPlan.dailyCalories,
        macros: {
          protein: sumProtein > 0 ? sumProtein : (rawPlan.macros?.protein || 0),
          carbs: sumCarbs > 0 ? sumCarbs : (rawPlan.macros?.carbs || 0),
          fat: sumFat > 0 ? sumFat : (rawPlan.macros?.fat || 0),
        }
      };
    }
  }

  return rawPlan;
};
