import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const generateWithRetry = async (client: any, params: any, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await client.models.generateContent(params);
    } catch (error: any) {
      if (attempt === maxRetries - 1) throw error;
      if (error.status === 503 || error.status === 'UNAVAILABLE' || (error.message && error.message.includes('503')) || (error.message && error.message.includes('UNAVAILABLE'))) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
        console.log(`Gemini API 503 error, retrying in ${Math.round(delay)}ms... (Attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
};

function normalizeOpenAIEndpoint(rawUrl: string): string {
  let url = (rawUrl || "https://api.openai.com/v1").trim();
  url = url.replace(/\/+$/, "");
  if (url.endsWith("/chat/completions")) {
    return url;
  }
  const parts = url.split("://")[1]?.split("/") || [];
  if (parts.length <= 1) {
    url = `${url}/v1`;
  }
  return `${url}/chat/completions`;
}

function cleanJsonOutput(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
}

async function callOpenAICompatible({
  endpointUrl,
  apiKey,
  model,
  messages,
}: {
  endpointUrl: string;
  apiKey?: string;
  model: string;
  messages: any[];
}) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey && apiKey.trim()) {
    headers["Authorization"] = `Bearer ${apiKey.trim()}`;
  }

  const payload: any = {
    model,
    messages,
    response_format: { type: "json_object" },
  };

  let response = await fetch(endpointUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    // Fallback if model doesn't support response_format: { type: "json_object" }
    if (response.status === 400 && (errText.includes("response_format") || errText.includes("json_object") || errText.includes("schema"))) {
      console.warn("Retrying without response_format due to endpoint rejection:", errText);
      delete payload.response_format;
      response = await fetch(endpointUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const retryErr = await response.text();
        throw new Error(`OpenAI 兼容端点错误 (${response.status}): ${retryErr}`);
      }
    } else {
      throw new Error(`OpenAI 兼容端点错误 (${response.status}): ${errText}`);
    }
  }

  const data: any = await response.json();
  const textOutput = data?.choices?.[0]?.message?.content;
  if (!textOutput) {
    throw new Error("端点未返回有效的文本内容，请检查模型响应。");
  }
  return textOutput;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API test connection
  app.post("/api/test-connection", async (req, res) => {
    try {
      const { apiKey, model, apiBaseUrl, customModel } = req.body;
      const isOpenAI = model === "openai-compatible" || (apiBaseUrl && apiBaseUrl.trim() !== "") || model === "kimi k2.7 code";

      if (isOpenAI) {
        const isKimi = model === "kimi k2.7 code" && (!apiBaseUrl || !apiBaseUrl.trim());
        const endpoint = isKimi
          ? "https://api.kimi.com/coding/v1/chat/completions"
          : normalizeOpenAIEndpoint(apiBaseUrl || "https://api.openai.com/v1");
        const modelToUse = isKimi ? "kimi k2.7 code" : (customModel?.trim() || "gpt-4o");

        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (apiKey && apiKey.trim()) {
          headers["Authorization"] = `Bearer ${apiKey.trim()}`;
        }

        const testResponse = await fetch(endpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: modelToUse,
            messages: [{ role: "user", content: "请回复 OK" }],
            max_tokens: 15,
          }),
        });

        if (!testResponse.ok) {
          const errText = await testResponse.text();
          return res.status(testResponse.status).json({
            success: false,
            error: `端点连接失败 (${testResponse.status}): ${errText.substring(0, 300)}`
          });
        }

        const data: any = await testResponse.json();
        const reply = data?.choices?.[0]?.message?.content || "OK";
        return res.json({ 
          success: true, 
          message: `连接成功！模型 [${modelToUse}] 响应正常。` 
        });
      } else {
        const client = apiKey ? new GoogleGenAI({ 
          apiKey,
          httpOptions: {
            headers: {
              "User-Agent": "aistudio-build",
            },
          },
        }) : ai;
        let selectedModel = model || "gemini-3.5-flash";
        if (selectedModel === "gemini-3-flash") selectedModel = "gemini-3-flash-preview";

        await client.models.generateContent({
          model: selectedModel,
          contents: "Hello",
        });
        return res.json({ success: true, message: `Gemini [${selectedModel}] 连接成功！` });
      }
    } catch (error: any) {
      console.error("Test connection error:", error);
      return res.status(500).json({ success: false, error: error.message || "测试连接失败" });
    }
  });

  // API routes
  app.post("/api/generate-character", async (req, res) => {
    try {
      const { imageBase64, mimeType, worldview, characterSetting, creativeInclination, sectionLabels, apiKey, model, apiBaseUrl, customModel } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "Image is required" });
      }

      if (!sectionLabels || !Array.isArray(sectionLabels) || sectionLabels.length === 0) {
        return res.status(400).json({ error: "At least one section label is required" });
      }

      const client = apiKey ? new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      }) : ai;
      let selectedModel = model || "gemini-3.5-flash";
      if (selectedModel === "gemini-3-flash") selectedModel = "gemini-3-flash-preview";

      const prompt = `Please act as a professional character designer. Based on the provided image and the settings below, reverse-engineer and generate a detailed character design sheet.

Worldview (世界观):
${worldview || "Not provided"}

Character Setting (角色设定):
${characterSetting || "Not provided"}

Creative Inclination (创作倾向):
${creativeInclination || "Not provided"}

Analyze the image carefully and generate the design sheet in Chinese according to the requested sections. Provide imaginative and detailed descriptions that fit the provided worldview and settings.`;

      const properties: Record<string, any> = {};
      const required: string[] = [];

      sectionLabels.forEach((label: string, index: number) => {
        const key = `section_${index}`;
        properties[key] = {
          type: Type.STRING,
          description: label,
        };
        required.push(key);
      });

      const isOpenAI = selectedModel === "openai-compatible" || (apiBaseUrl && apiBaseUrl.trim() !== "") || selectedModel === "kimi k2.7 code";
      if (isOpenAI) {
        const isKimi = selectedModel === "kimi k2.7 code" && (!apiBaseUrl || !apiBaseUrl.trim());
        const endpointUrl = isKimi
          ? "https://api.kimi.com/coding/v1/chat/completions"
          : normalizeOpenAIEndpoint(apiBaseUrl || "https://api.openai.com/v1");
        const modelToUse = isKimi ? "kimi k2.7 code" : (customModel?.trim() || "gpt-4o");

        if (!apiKey && !endpointUrl.includes("localhost") && !endpointUrl.includes("127.0.0.1")) {
          return res.status(400).json({ error: "使用 OpenAI 兼容端点需要提供 API 密钥 (本地端点除外)" });
        }

        const base64Data = imageBase64.includes(',') ? imageBase64 : `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;
        const schemaDesc = Object.entries(properties).map(([k, v]) => `"${k}": "${v.description}"`).join(",\n  ");
        const openAiPrompt = `${prompt}\n\n【重要输出格式指令】：必须且仅输出严格合法的纯 JSON 格式对象，不要包含任何 Markdown 格式代码块标记（严禁使用 \`\`\` 符号包裹），键名格式必须完全匹配：\n{\n  ${schemaDesc}\n}`;

        const textOutput = await callOpenAICompatible({
          endpointUrl,
          apiKey,
          model: modelToUse,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: openAiPrompt },
                { type: "image_url", image_url: { url: base64Data } }
              ]
            }
          ]
        });

        const cleaned = cleanJsonOutput(textOutput);
        const parsed = JSON.parse(cleaned);

        const normalizedData: Record<string, string> = {};
        sectionLabels.forEach((label: string, index: number) => {
          const key = `section_${index}`;
          normalizedData[key] = parsed[key] || parsed[label] || parsed[label.toLowerCase()] || "";
        });
        const values = Object.values(parsed);
        sectionLabels.forEach((label: string, index: number) => {
          const key = `section_${index}`;
          if (!normalizedData[key] && values[index] && typeof values[index] === 'string') {
            normalizedData[key] = values[index] as string;
          }
        });
        return res.json(normalizedData);
      }

      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imageBase64.split(",")[1] || imageBase64, // Support with or without data:image/...;base64, prefix
        },
      };

      const textPart = { text: prompt };

      const response = await generateWithRetry(client, {
        model: selectedModel,
        contents: { parts: [imagePart, textPart] },
        config: {
          safetySettings: [
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          ],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: properties,
            required: required,
          },
        },
      });

      const textOutput = response.text;
      if (!textOutput) {
         if (response.promptFeedback?.blockReason) {
           throw new Error(`请求被安全策略拦截 (原因: ${response.promptFeedback.blockReason})`);
         } else if (response.candidates?.[0]?.finishReason) {
           throw new Error(`生成未完成 (原因: ${response.candidates[0].finishReason})`);
         }
         throw new Error(`生成失败，未返回文本内容。详细信息: ${JSON.stringify(response)}`);
      }
      
      const parsedData = JSON.parse(textOutput);
      res.json(parsedData);
    } catch (error: any) {
      console.error("Error generating character:", error);
      res.status(500).json({ error: error.message || "An error occurred" });
    }
  });

  app.post("/api/generate-skills", async (req, res) => {
    try {
      const { imageBase64, mimeType, worldview, characterSetting, creativeInclination, characterDesign, skillFormat, skillInclination, existingSkills, apiKey, model, apiBaseUrl, customModel } = req.body;

      if (!imageBase64) {
        return res.status(400).json({ error: "Image is required" });
      }

      const client = apiKey ? new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      }) : ai;
      let selectedModel = model || "gemini-3.5-flash";
      if (selectedModel === "gemini-3-flash") selectedModel = "gemini-3-flash-preview";

      const prompt = `Please act as a professional character and game skill designer. Based on the provided character reference image, worldview, character setting, creative inclination, and the character's detailed design sheet, generate at least 3 character skills.

Worldview:
${worldview || "Not provided"}

Character Setting:
${characterSetting || "Not provided"}

Creative Inclination:
${creativeInclination || "Not provided"}

Skill Format (技能格式):
${skillFormat || "Not provided"}

Skill Inclination (技能倾向):
${skillInclination || "Not provided"}

Character Design Sheet (角色设定集):
${characterDesign || "Not provided"}

${existingSkills ? `Existing Skills (DO NOT GENERATE THESE AGAIN OR ANYTHING TOO SIMILAR):\n${existingSkills}\n` : ""}

Please generate the skills in Chinese. Provide imaginative and detailed descriptions that fit the provided worldview and settings.`;

      const isOpenAI = selectedModel === "openai-compatible" || (apiBaseUrl && apiBaseUrl.trim() !== "") || selectedModel === "kimi k2.7 code";
      if (isOpenAI) {
        const isKimi = selectedModel === "kimi k2.7 code" && (!apiBaseUrl || !apiBaseUrl.trim());
        const endpointUrl = isKimi
          ? "https://api.kimi.com/coding/v1/chat/completions"
          : normalizeOpenAIEndpoint(apiBaseUrl || "https://api.openai.com/v1");
        const modelToUse = isKimi ? "kimi k2.7 code" : (customModel?.trim() || "gpt-4o");

        if (!apiKey && !endpointUrl.includes("localhost") && !endpointUrl.includes("127.0.0.1")) {
          return res.status(400).json({ error: "使用 OpenAI 兼容端点需要提供 API 密钥 (本地端点除外)" });
        }

        const base64Data = imageBase64.includes(',') ? imageBase64 : `data:${mimeType || "image/jpeg"};base64,${imageBase64}`;
        const schemaDesc = `"skills": [\n    {\n      "id": "1",\n      "name": "技能名称",\n      "effect": "技能效果说明",\n      "visual": "动作与视觉效果描写"\n    }\n  ]`;
        const openAiPrompt = `${prompt}\n\n【重要输出格式指令】：必须且仅输出严格合法的纯 JSON 格式对象，不要包含任何 Markdown 格式代码块标记（严禁使用 \`\`\` 符号包裹），数据结构必须完全匹配：\n{\n  ${schemaDesc}\n}`;

        const textOutput = await callOpenAICompatible({
          endpointUrl,
          apiKey,
          model: modelToUse,
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: openAiPrompt },
                { type: "image_url", image_url: { url: base64Data } }
              ]
            }
          ]
        });

        const cleaned = cleanJsonOutput(textOutput);
        const parsed = JSON.parse(cleaned);

        let skillsList: any[] = [];
        if (Array.isArray(parsed)) {
          skillsList = parsed;
        } else if (Array.isArray(parsed.skills)) {
          skillsList = parsed.skills;
        } else if (Array.isArray(parsed.Skills)) {
          skillsList = parsed.Skills;
        } else {
          const arr = Object.values(parsed).find(v => Array.isArray(v));
          if (arr) skillsList = arr as any[];
        }
        return res.json({ skills: skillsList });
      }

      const imagePart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: imageBase64.split(",")[1] || imageBase64,
        },
      };

      const textPart = { text: prompt };

      const response = await generateWithRetry(client, {
        model: selectedModel,
        contents: { parts: [imagePart, textPart] },
        config: {
          safetySettings: [
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          ],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              skills: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING, description: "Unique identifier for the skill" },
                    name: { type: Type.STRING, description: "技能名称" },
                    effect: { type: Type.STRING, description: "技能效果" },
                    visual: { type: Type.STRING, description: "动作/视觉描写" }
                  },
                  required: ["id", "name", "effect", "visual"]
                }
              }
            },
            required: ["skills"],
          },
        },
      });

      const textOutput = response.text;
      if (!textOutput) {
         if (response.promptFeedback?.blockReason) {
           throw new Error(`请求被安全策略拦截 (原因: ${response.promptFeedback.blockReason})`);
         } else if (response.candidates?.[0]?.finishReason) {
           throw new Error(`生成未完成 (原因: ${response.candidates[0].finishReason})`);
         }
         throw new Error(`生成失败，未返回文本内容。详细信息: ${JSON.stringify(response)}`);
      }
      
      const parsedData = JSON.parse(textOutput);
      res.json(parsedData);
    } catch (error: any) {
      console.error("Error generating skills:", error);
      res.status(500).json({ error: error.message || "An error occurred" });
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
