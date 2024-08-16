import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

const BaseQuestion = async (message) => {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();
    return text;
}



export {BaseQuestion};