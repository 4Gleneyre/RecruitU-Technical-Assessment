import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";

export const firebaseConfig = {
  apiKey: "AIzaSyDfZl0PUxGWt8BWRYuX5mnIM-RTynBdFqI",
  authDomain: "recruitu-technical-assessment.firebaseapp.com",
  projectId: "recruitu-technical-assessment",
  storageBucket: "recruitu-technical-assessment.firebasestorage.app",
  messagingSenderId: "709401870739",
  appId: "1:709401870739:web:22d0fb1c2e18ada2f2e866",
} as const;

let app: FirebaseApp | undefined;

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
