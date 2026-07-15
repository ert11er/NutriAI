
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
