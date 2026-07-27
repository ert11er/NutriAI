
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini Setup
  const ai = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Routes
  app.post("/api/analyze", async (req, res) => {
    try {
      const { prompt, schema } = req.body;
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API Key is not configured on the server." });
      }
      
      const config: any = {
        responseMimeType: "application/json"
      };

      if (schema) {
        config.responseSchema = schema;
      }
      
      const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"];
      let lastError = null;
      let response = null;
      let usedModel = "";

      for (const model of models) {
        try {
          console.log(`Attempting Gemini generation with model: ${model}`);
          response = await ai.models.generateContent({
            model,
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config
          });
          usedModel = model;
          break; // Success! Exit the loop.
        } catch (err: any) {
          console.warn(`Model ${model} failed:`, err.message || err);
          lastError = err;
        }
      }

      if (!response) {
        throw new Error(`Tüm Gemini modelleri başarısız oldu. Son hata: ${lastError?.message || lastError}`);
      }

      const text = response.text || "";
      
      // Clean potential markdown blocks
      const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
      res.json(JSON.parse(cleanText));
    } catch (error: any) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: error.message || "Analiz sırasında bir hata oluştu." });
    }
  });

  app.post("/api/assistant", async (req, res) => {
    try {
      const { messages, plan, userData, lang } = req.body;
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: "Gemini API Key is not configured on the server." });
      }

      const systemPrompt = `
You are NutriAI Assistant, an expert AI Nutritionist & Diet Assistant built into this application.
Language: Respond in ${lang === 'en' ? 'English' : 'Turkish'}.

YOU HAVE FREE & FULL READ ACCESS TO THE USER'S CURRENT DIET PLAN AND USER PROFILE:
User Profile:
${JSON.stringify(userData || {}, null, 2)}

Current Active Diet Plan:
${JSON.stringify(plan || {}, null, 2)}

YOUR ROLE:
1. Answer questions about the user's diet plan, ingredients, meals, calories, macros, or nutrition tips.
2. If the user explicitly requests to EDIT, CHANGE, SWAP, REMOVE, ADD, or UPDATE any meals, daily calories, macros, or notes:
   You MUST formulate a proposed edit in the JSON response under "proposedEdit".
   CRITICAL REQUIREMENT: You CANNOT edit the plan directly without user consent. The application will render an "Approve / Reject" card to the user with your proposal. Only when the user clicks "Approve", the changes will take effect.

OUTPUT FORMAT (JSON strictly):
Return a single JSON object with these EXACT keys:
{
  "message": "Your polite, conversational response to the user explaining what you did or answering their question.",
  "proposedEdit": null OR {
    "title": "Short title for the proposed change (e.g. 'Salı Akşam Yemeğini Değiştir')",
    "description": "Clear explanation of what changes will be applied to the plan if approved.",
    "newPlan": { ... THE ENTIRE COMPLETE UPDATED DIETPLAN OBJECT INCLUDING ALL DAYS, MEALS, CALORIES, MACROS ... }
  }
}

Important Rules for "proposedEdit":
- If the user is just asking a question or chatting, set "proposedEdit": null.
- If the user asks for a change:
  - Take the existing DietPlan JSON as reference.
  - Modify the requested meals or fields in "newPlan".
  - Make sure "newPlan" maintains valid structure matching DietPlan:
    {
      "dailyCalories": number,
      "macros": { "protein": number, "carbs": number, "fat": number },
      "notes": string[],
      "weeklyPlan": [
        {
          "day": string,
          "meals": [
            {
              "id": string,
              "time": string,
              "dish": string,
              "calories": number,
              "protein": number,
              "carbs": number,
              "fat": number,
              "description": string,
              "recipe": string,
              "ingredients": string[],
              "alternatives": string[]
            }
          ]
        }
      ]
    }
`;

      const formattedMessages = (messages || []).map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.text }]
      }));

      const contents = [
        { role: "user", parts: [{ text: systemPrompt }] },
        ...formattedMessages
      ];

      const models = ["gemini-3.6-flash", "gemini-3.1-flash-lite", "gemini-3.1-pro-preview"];
      let lastError = null;
      let response = null;

      for (const model of models) {
        try {
          response = await ai.models.generateContent({
            model,
            contents,
            config: {
              responseMimeType: "application/json"
            }
          });
          break;
        } catch (err: any) {
          console.warn(`Assistant model ${model} failed:`, err.message || err);
          lastError = err;
        }
      }

      if (!response) {
        throw new Error(lastError?.message || "Gemini service failed");
      }

      const text = response.text || "";
      const cleanText = text.replace(/```json\n?|\n?```/g, "").trim();
      
      let parsed;
      try {
        parsed = JSON.parse(cleanText);
      } catch (pErr) {
        parsed = {
          message: text,
          proposedEdit: null
        };
      }

      res.json(parsed);
    } catch (error: any) {
      console.error("Assistant API Error:", error);
      res.status(500).json({ error: error.message || "Asistan yanıt veremedi." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
