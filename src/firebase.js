import { initializeApp } from "firebase/app";

import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCRQ_CcSyvKd-OUVKHEjeCeN78R8HZzDA4",
  authDomain: "smart-school-ai-f1f70.firebaseapp.com",
  projectId: "smart-school-ai-f1f70",
  storageBucket: "smart-school-ai-f1f70.firebasestorage.app",
  messagingSenderId: "639304814794",
  appId: "1:639304814794:web:1cee4b91ccf8bc05eaa433",
  measurementId: "G-MG8ZDH1D1J"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);