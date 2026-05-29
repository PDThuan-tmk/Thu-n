import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase config của bạn
const firebaseConfig = {
  apiKey: "AIzaSyCuC6E5vrRbulBD1mFkuxjjReD_4Gp4RxM",
  authDomain: "smart-school-ai-50a14.firebaseapp.com",
  projectId: "smart-school-ai-50a14",
  storageBucket: "smart-school-ai-50a14.firebasestorage.app",
  messagingSenderId: "321358010347",
  appId: "1:321358010347:web:566871d6fb8996dc4e2bae"
};

// Init Firebase
const app = initializeApp(firebaseConfig);

// Export database + storage
export const db = getFirestore(app);
export const storage = getStorage(app);