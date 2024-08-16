import express from "express";
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());
const PORT = 8000;

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)


var DomainQuestions = []


const question_splitter = (text) => {
    const questions = text.split(/\d+\.\s/).filter(Boolean);
    return questions;
}

const splitQuestions = (textArray) => {
    return textArray
        .map(line => line.trim())
        .filter(line => line.length > 0);
};

app.post("/geminitext", async (req, res) => {
    const prompt = `You are given a candidate whose overall relevance score (out of 10) to the job description is [1], and the following keywords represent the key skills and experience areas relevant to the job: Python, Machine Learning, Data Structures, Project Management, TensorFlow, Agile Methodology, Data Analysis, Natural Language Processing (NLP), Cloud Computing, SQL.Based on the candidate's overall relevance score of [1], generate 10 interview questions where the difficulty and depth of each question should correspond to the candidate's expertise level as inferred from the relevance score. The questions should cover foundational knowledge and some advanced concepts across the key skills mentioned.The response should contain only the interview questions without any additional explanations or context or topic header .`;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    var text = response.text();
    text = question_splitter(text);
    DomainQuestions = splitQuestions(text);
});


app.listen(PORT, () => console.log(`Listening on port ${PORT}`));

