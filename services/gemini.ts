import { GoogleGenAI } from "@google/genai";
import { GEMINI_MODEL_DOCS, PROMPT_PDF_TO_WORD, PROMPT_WORD_TO_PDF_OPTIMIZE } from "../constants";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const convertPdfToMarkdown = async (base64Pdf: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_DOCS,
      contents: {
        parts: [
          {
            text: PROMPT_PDF_TO_WORD,
          },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: base64Pdf,
            },
          },
        ],
      },
      config: {
        // Enforce a persona that cares about visual fidelity
        systemInstruction: "You are a professional document converter tool. Your output is fed directly into a Word generator. Precision and formatting retention are critical.",
      }
    });

    return response.text || "No content extracted.";
  } catch (error) {
    console.error("Gemini PDF processing error:", error);
    throw new Error("Failed to process PDF with AI.");
  }
};

export const optimizeTextForPdf = async (rawText: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_DOCS,
      contents: {
        parts: [
          {
            text: PROMPT_WORD_TO_PDF_OPTIMIZE + "\n\n---START OF DOCUMENT---\n" + rawText + "\n---END OF DOCUMENT---",
          },
        ],
      },
    });
    return response.text || rawText;
  } catch (error) {
    console.error("Gemini Text optimization error:", error);
    // Fallback to original text if AI fails
    return rawText;
  }
};