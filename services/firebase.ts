import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBI6alUXlit_-IoRC_ecHotDBV1AzsvTt4",
  authDomain: "fir-sobra-mais.firebaseapp.com",
  projectId: "fir-sobra-mais",
  storageBucket: "fir-sobra-mais.firebasestorage.app",
  messagingSenderId: "891121178454",
  appId: "1:891121178454:web:f4c548efac402f2838e8f7"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with standard settings to bypass corrupted local cache
export const db = getFirestore(app);