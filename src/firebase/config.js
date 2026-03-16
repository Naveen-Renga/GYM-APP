// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBmM6_CdRBbXvPm0kQxASbAVK-GP4jbcyc",
  authDomain: "renga-gym-app.firebaseapp.com",
  projectId: "renga-gym-app",
  storageBucket: "renga-gym-app.appspot.com",
  messagingSenderId: "787058075477",
  appId: "1:787058075477:web:e559ce8f555d463366f1dc"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
