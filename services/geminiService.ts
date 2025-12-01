import { GoogleGenAI, Type, Schema } from "@google/genai";
import { PrepResult, Term } from "../types";

export const generatePrepMaterial = async (topic: string): Promise<PrepResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Schema for structured output
  const termSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      english: { type: Type.STRING, description: "The English technical term or phrase" },
      chinese: { type: Type.STRING, description: "The standard Mainland China industry translation" },
      definition: { type: Type.STRING, description: "A concise definition in English (10-15 words)" },
    },
    required: ["english", "chinese", "definition"],
  };

  const responseSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      summary: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "15+ comprehensive bullet points covering market trends, key technologies, controversies, regulatory landscape, and major stakeholders.",
      },
      terms: {
        type: Type.ARRAY,
        items: termSchema,
        description: "A massive list of 50-80 highly relevant, industry-specific technical terms. Focus on low-frequency, high-value jargon.",
      },
    },
    required: ["summary", "terms"],
  };

  const prompt = `You are an expert conference interpreter and terminology specialist preparing for a high-level international summit.
  Topic: "${topic}".
  
  1. **Background Briefing**: Provide a highly detailed, deep-dive background summary (at least 15 points). Cover the current state of the industry, future trends, major technical challenges, and key geopolitical or economic factors. The more context, the better.
  2. **Terminology Extraction**: Extract a comprehensive list of 50+ industry-specific technical terms, acronyms, and specialized collocations.
     - **Strictly avoid** general English words unless they have a specific technical meaning here.
     - **Prioritize** difficult, context-dependent jargon that an interpreter might stumble on.
     - Ensure Chinese translations are the precise, standard industry terms used in Mainland China.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        systemInstruction: "You are LingoFlow, the world's most advanced interpreter preparation tool.",
      },
    });

    const data = JSON.parse(response.text || "{}");
    
    // Transform to our internal Term type
    const terms: Term[] = (data.terms || []).map((t: any, index: number) => ({
      id: `${Date.now()}-${index}`,
      english: t.english,
      chinese: t.chinese,
      definition: t.definition,
      tags: [topic],
      masteryLevel: 0,
    }));

    return {
      topic,
      summary: data.summary || [],
      terms,
    };
  } catch (error) {
    console.error("Gemini Prep Error:", error);
    throw new Error("Failed to generate prep material. Please try again.");
  }
};

export const streamChatMessage = async function* (
  history: { role: string; parts: { text: string }[] }[],
  message: string
) {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Create chat session with history
  const chat = ai.chats.create({
    model: "gemini-2.5-flash",
    history: history,
    config: {
      systemInstruction: `You are an expert consultant for professional interpreters. 
      Your goal is to explain concepts clearly and comprehensively. 
      CRITICAL RULE: Whenever you mention a key technical term, concept, or idiomatic expression in your explanation, YOU MUST provide the Chinese translation in parentheses immediately following it. 
      Example: "The solid-state battery (固态电池) offers higher energy density (能量密度) compared to traditional lithium-ion batteries (锂离子电池)."`,
    },
  });

  const result = await chat.sendMessageStream({ message });
  
  for await (const chunk of result) {
    yield chunk.text;
  }
};