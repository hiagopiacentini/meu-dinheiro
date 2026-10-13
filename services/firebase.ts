import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebaseConfig from "../firebase-applet-config.json";

// Initialize Firebase with config from provisioned environment
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore using provisioned database ID
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Fallback handle to default database in case user data was seeded there
export const defaultDb = getFirestore(app);