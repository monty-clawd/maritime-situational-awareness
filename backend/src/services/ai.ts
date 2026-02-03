import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY;

let genAI: GoogleGenerativeAI | null = null;
if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
}

export const generateIncidentSummary = async (vesselName: string, events: any[]): Promise<string> => {
  if (!genAI) {
    return "AI summarization unavailable: GEMINI_API_KEY not configured.";
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Use a fast/efficient model

  const prompt = `
    You are a maritime incident reporting assistant.
    Analyze the following event log for vessel "${vesselName}" and generate a concise, professional summary suitable for an incident report.
    Highlight any anomalies, suspicious behavior, or alerts.

    Event Log:
    ${JSON.stringify(events, null, 2)}
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating AI summary:", error);
    return "Error generating summary.";
  }
};
