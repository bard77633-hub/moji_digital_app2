import { GoogleGenAI } from "@google/genai";
import { API_KEY } from "../constants.js";

let aiClient = null;

const getClient = () => {
    if (!API_KEY) {
        return null;
    }
    if (!aiClient) {
        aiClient = new GoogleGenAI({ apiKey: API_KEY });
    }
    return aiClient;
};

/**
 * AI先生に文字コードについて質問する
 */
export const askAITeacher = async (question, context = "") => {
    const client = getClient();
    if (!client) {
        throw new Error("APIキーが設定されていません。constants.jsを確認してください。");
    }

    try {
        const prompt = `
        あなたは高校の「情報I」の先生です。生徒からの質問に、親しみやすく、わかりやすく答えてください。
        専門用語を使う場合は、必ず簡単な例え話を入れてください。
        
        文脈（現在アプリで表示している内容）: ${context}
        
        生徒の質問: ${question}
        
        回答は簡潔に、300文字以内でお願いします。
        `;

        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text;
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw new Error("AI先生への接続に失敗しました。");
    }
};

/**
 * クイズを生成する
 */
export const generateQuiz = async () => {
    const client = getClient();
    if (!client) {
        // Fallback is handled in the UI
        throw new Error("API_KEY_MISSING");
    }

    try {
        const prompt = `
        高校情報I「文字のデジタル化」に関する4択クイズを1問作成してください。
        以下のJSON形式のみを返してください。Markdownの装飾は不要です。
        
        {
          "question": "問題文",
          "options": ["選択肢1", "選択肢2", "選択肢3", "選択肢4"],
          "answer": "正解の選択肢文字列",
          "explanation": "解説"
        }
        
        テーマ例：ASCIIコード、UTF-8とShift-JISの違い、ビットとバイトの関係、文字化けの原因。
        `;

        const response = await client.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json"
            }
        });

        return JSON.parse(response.text);
    } catch (error) {
        console.error("Quiz Gen Error:", error);
        return null;
    }
};