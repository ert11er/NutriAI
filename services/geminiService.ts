
import { GoogleGenAI, Type } from "@google/genai";
import { UserData, AIResponse, DietPlan } from "../types";

const MODEL_NAME = "gemini-2.5-flash";

export const analyzeAndAsk = async (userData: UserData): Promise<AIResponse> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Kullanıcı bir diyet planı istiyor. Verilerini aşağıda görebilirsin. 
    Lütfen bu verileri analiz et veya 2-3 ek soru sor (Örn: Bütçe, mutfak ekipmanı, iş saatleri vb.). Eğer soru soracaksan, "questions" tipinde yanıt ver. 
    Eğer veriler yeterliyse doğrudan "plan" tipinde tam bir diyet planı oluştur.
    
    Kullanıcı Verileri:
    - Yaş: ${userData.age}, Cinsiyet: ${userData.gender}
    - Kilo: ${userData.weight}, Boy: ${userData.height}
    - Hedef: ${userData.goal}, Aktivite: ${userData.activityLevel}
    - Kısıtlamalar: ${userData.restrictions.join(', ')}
    - Alerjiler: ${userData.allergies}
    - Sevilmeyenler: ${userData.dislikedFoods}
    - Özel İstekler: ${userData.extraNotes}
    
    Yanıt formatın MUTLAKA JSON olmalı ve "type" alanı ('questions' veya 'plan') içermeli.
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['questions', 'plan'] },
          questions: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "Eğer tip 'questions' ise sorulacak 2-3 soru" 
          },
          plan: { 
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              dailyCalories: { type: Type.NUMBER },
              macros: {
                type: Type.OBJECT,
                properties: {
                  protein: { type: Type.NUMBER },
                  carbs: { type: Type.NUMBER },
                  fat: { type: Type.NUMBER }
                }
              },
              weeklyPlan: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    day: { type: Type.STRING },
                    meals: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          id: { type: Type.STRING, description: "Benzersiz öğün ID'si" },
                          time: { type: Type.STRING },
                          dish: { type: Type.STRING },
                          description: { type: Type.STRING },
                          calories: { type: Type.NUMBER },
                          protein: { type: Type.NUMBER },
                          carbs: { type: Type.NUMBER },
                          fat: { type: Type.NUMBER },
                          prepTime: { type: Type.STRING, description: "Hazırlık süresi (örn: 20 dakika)" },
                          servings: { type: Type.STRING, description: "Porsiyon bilgisi (örn: 1 porsiyon)" },
                          ingredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Malzeme listesi" },
                          alternatives: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Alternatifler" }
                        }
                      }
                    }
                  }
                }
              },
              tips: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            description: "Eğer tip 'plan' ise tam diyet planı"
          }
        },
        required: ["type"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const generateFinalPlan = async (userData: UserData, answers: Record<string, string>): Promise<DietPlan> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
  `;

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          dailyCalories: { type: Type.NUMBER },
          macros: {
            type: Type.OBJECT,
            properties: {
              protein: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              fat: { type: Type.NUMBER }
            },
            required: ["protein", "carbs", "fat"]
          },
          weeklyPlan: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.STRING },
                meals: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING, description: "Benzersiz öğün ID'si" },
                      time: { type: Type.STRING },
                      dish: { type: Type.STRING },
                      description: { type: Type.STRING },
                      calories: { type: Type.NUMBER },
                      protein: { type: Type.NUMBER },
                      carbs: { type: Type.NUMBER },
                      fat: { type: Type.NUMBER },
                      prepTime: { type: Type.STRING, description: "Hazırlık süresi (örn: 20 dakika)" },
                      servings: { type: Type.STRING, description: "Porsiyon bilgisi (örn: 1 porsiyon)" },
                      ingredients: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Malzeme listesi" },
                      alternatives: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Alternatifler" }
                    }
                  }
                }
              }
            }
          },
          tips: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["summary", "dailyCalories", "macros", "weeklyPlan", "tips"]
      }
    }
  });

  return JSON.parse(response.text);
};