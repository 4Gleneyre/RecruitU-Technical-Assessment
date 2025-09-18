import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAI,
  getGenerativeModel,
  GoogleAIBackend,
  type GenerativeModel,
  type ModelParams,
} from "firebase/ai";

export const firebaseConfig = {
  apiKey: "AIzaSyDfZl0PUxGWt8BWRYuX5mnIM-RTynBdFqI",
  authDomain: "recruitu-technical-assessment.firebaseapp.com",
  projectId: "recruitu-technical-assessment",
  storageBucket: "recruitu-technical-assessment.firebasestorage.app",
  messagingSenderId: "709401870739",
  appId: "1:709401870739:web:22d0fb1c2e18ada2f2e866",
} as const;

let app: FirebaseApp | undefined;
let aiService: ReturnType<typeof getAI> | undefined;
const modelCache = new Map<string, GenerativeModel>();

export function getFirebaseApp(): FirebaseApp {
  if (app) {
    return app;
  }

  if (getApps().length) {
    app = getApp();
    return app;
  }

  app = initializeApp(firebaseConfig);
  return app;
}

function getAIService() {
  if (!aiService) {
    aiService = getAI(getFirebaseApp(), { backend: new GoogleAIBackend() });
  }

  return aiService;
}

type GeminiModelOptions = Omit<ModelParams, "model">;

export function getGeminiModel(modelName = "gemini-2.5-flash", options?: GeminiModelOptions) {
  if (!options && modelCache.has(modelName)) {
    return modelCache.get(modelName)!;
  }

  const model = getGenerativeModel(getAIService(), {
    model: modelName,
    ...options,
  });

  if (!options) {
    modelCache.set(modelName, model);
  }

  return model;
}
