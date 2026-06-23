import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDzE09aTuZLvRzsg-29OFTSPFqcaSgWZbI",
  authDomain: "sentinel-wedding-ai.firebaseapp.com",
  projectId: "sentinel-wedding-ai",
  storageBucket: "sentinel-wedding-ai.firebasestorage.app",
  messagingSenderId: "668587422102",
  appId: "1:668587422102:web:40f8417b680b7261de2db7"
};

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Auth
const auth = getAuth(app);

// Initialize Firestore with custom databaseId if provided
const db = initializeFirestore(app, {}, "ai-studio-8bd3533e-d66d-47d9-879a-e4ca1a8f5165");

export { app, auth, db };
