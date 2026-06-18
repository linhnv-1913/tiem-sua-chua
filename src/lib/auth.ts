import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyApqw9ZY4ZQEGJYEYLBkfEWR7t4kcVw2hE",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "pm-helper-311503.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "pm-helper-311503",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "pm-helper-311503.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "991363432075",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:991363432075:web:0de764e8d5a6d8d8005e8e",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-9f9329f0-4110-4039-bbdd-4fef613c5fdc");

