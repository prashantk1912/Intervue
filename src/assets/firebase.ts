// src/firebase.ts

// Import the functions needed to initialize Firebase and get its services
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';       // NEW: Import for Firebase Authentication
import { getFirestore } from 'firebase/firestore'; // Existing: For Firestore Database

// MANDATORY: This `__firebase_config` variable is provided by the Canvas environment.
// It contains your Firebase project's configuration.
// DO NOT change this line or try to hardcode your Firebase config here.
const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');

// Initialize the main Firebase application instance
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services
// These exports allow you to import 'db' and 'auth' into other files (like App.tsx)
// and use Firebase functionality.
export const db = getFirestore(app);   // Exporting the Firestore database instance
export const auth = getAuth(app);     // NEW: Exporting the Firebase Authentication instance