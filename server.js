import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 8000;

import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

let DomainQuestions = [];
let answers = [];
let askedQuestions = new Set();
let positive_counter = 0;
let negative_counter = 0;
let totalQuestion = 0;

const SkillString = "Python, React, Java, Node Js";

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const question_splitter = (tex) => {
    const questions = [];
    answers = [];
    let isAnswerSection = false;
    const text = tex.split('\n').map(line => line.trim()).filter(line => line);

    text.forEach(line => {
        if (line.startsWith("## Interview Questions")) {
            return;
        }
        if (line.startsWith("## Answers:")) {
            isAnswerSection = true;
        } else if (line) {
            if (isAnswerSection) {
                answers.push(line);
            } else {
                questions.push(line);
            }
        }
    });

    return questions;
};


const generateContentWithRetry = async (prompt, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (error) {
            if (error.status === 429 && i < retries - 1) {
                console.log(`Rate limit hit. Retrying in ${delay}ms...`);
                await sleep(delay);
                delay *= 2;
            } else {
                throw error;
            }
        }
    }
};

const getRandomQuestion = () => {
    const availableQuestions = DomainQuestions.filter((_, index) => !askedQuestions.has(index));
    if (availableQuestions.length === 0) {
        return null;
    }
    totalQuestion += 1;
    const randomIndex = Math.floor(Math.random() * availableQuestions.length);
    const selectedQuestion = availableQuestions[randomIndex];
    const questionIndex = DomainQuestions.indexOf(selectedQuestion);
    askedQuestions.add(questionIndex);
    return { question: selectedQuestion, answer: answers[questionIndex] };
};

const getFollowUpQuestion = async (currentQuestion) => {
    const prompt = `Given the question: "${currentQuestion}", generate a follow-up question that probes deeper into the candidate's knowledge on this topic. The follow-up question should be relevant and logically connected to the original question without any additional explanations or context or topic header`;
    const followUpQuestionText = await generateContentWithRetry(prompt);
    return followUpQuestionText.trim();
};

app.post("/questiongenerator", async (req, res) => {
    const rate = req.body.rate;
    const prompt = `You are given a candidate whose overall relevance score (out of 10) to the job description is [${rate}], and the following keywords represent the key skills and experience areas relevant to the job: ${SkillString}. Based on the candidate's overall relevance score of [${rate}], generate 10 interview questions where the difficulty and depth of each question should correspond to the candidate's expertise level as inferred from the relevance score. The questions should cover foundational knowledge and some advanced concepts across the key skills mentioned. The response should contain only the interview questions and answers relevant to the questions without any additional explanations or context or topic header. Give a set of questions first and then answers.`;

    try {
        const text = await generateContentWithRetry(prompt);
        DomainQuestions = question_splitter(text);

        while (totalQuestion <= 3) {
            positive_counter = 0;
            negative_counter = 0;

            const { question, answer } = getRandomQuestion();

            if (!question) {
                res.json({ message: "All questions have been asked." });
                break;
            } else {
                console.log("Domain Question: ", question);

                let userInput = "";
                let answer1 = "";

                if (userInput.toLowerCase() === answer1.toLowerCase()) {
                    while (positive_counter < 4 && negative_counter < 2) {
                        const followUpQuestion = await getFollowUpQuestion(question);
                        await sleep(2000); // Wait for 2 seconds
                        console.log("Follow-up question: ", followUpQuestion);
                        positive_counter++;
                    }
                } else {
                    console.log("Move to next question.");
                }
            }
        }

        res.json({ message: "Session complete." });
    } catch (error) {
        console.error("Failed to generate content:", error.message);
        res.status(500).json({ error: "Failed to generate content. Please try again later." });
    }
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
