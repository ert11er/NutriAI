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
      items: dayPlanSchema
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

export const analyzeAndAsk = async (userData: UserData): Promise<AIResponse> => {
  const prompt = `
    Kullanıcı bir diyet planı istiyor. Verilerini aşağıda görebilirsin. 
    Lütfen bu verileri analiz et veya 2-3 ek soru sor (Örn: Bütçe, mutfak ekipmanı, iş saatleri vb.). Eğer soru soracaksan, "questions" tipinde yanıt ver. 
    Eğer veriler yeterliyse doğrudan "plan" tipinde tam bir diyet planı oluştur.
    
    Kullanıcı Verileri:
    - Yaş: ${userData.age || 'Belirtilmedi'}, Cinsiyet: ${userData.gender || 'Belirtilmedi'}
    - Kilo: ${userData.weight ? userData.weight + ' kg' : 'Belirtilmedi'}, Boy: ${userData.height ? userData.height + ' cm' : 'Belirtilmedi'}
    - Hedef: ${userData.goal || 'Belirtilmedi'}, Aktivite: ${userData.activityLevel || 'Belirtilmedi'}
    - Kısıtlamalar: ${userData.restrictions?.join(', ') || 'Yok'}
    - Alerjiler: ${userData.allergies || 'Yok'}
    - Sevilmeyenler: ${userData.dislikedFoods || 'Yok'}
    - Tıbbi Durumlar: ${userData.medicalConditions || 'Yok'}
    - Özel İstekler: ${userData.extraNotes || 'Yok'}
    
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
  
  const prompt = `
    Kullanıcının temel verileri ve ek sorulara verdiği yanıtlar aşağıdadır. 
    Lütfen profesyonel, esnek ve detaylı bir 7 günlük diyet planı oluştur.
    Her öğün için benzersiz bir ID (örn: gun1-kahvalti), hazırlanış süresi, porsiyon bilgisi, malzemeler (liste olarak) ve 1-2 alternatif (liste olarak) ekle.

    ÖZELLİKLE kullanıcının şu özel isteğini/notunu dikkate al: "${userData.extraNotes || 'Yok'}"

    Temel Veriler: ${JSON.stringify(userData)}
    Ek Yanıtlar:
    ${answersString}
    
    Yanıt dili Türkçe olmalı.
    Plan Şunları İçermeli:
    1. Günlük Kalori ve Makro (Protein, Karbonhidrat, Yağ) hedefleri.
    2. 7 günün her biri için öğünler.
    3. Her öğün için kalori tahmini ve tarif/içerik özeti.
    
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

  return response.json();
};
