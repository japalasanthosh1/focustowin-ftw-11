// Firebase Configuration
// COPY/PASTE YOUR FIREBASE CONFIG HERE
// 1. Go to console.firebase.google.com
// 2. Create a Project -> Add Web App
// 3. Copy the 'const firebaseConfig = { ... }' block below

const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "SENDER_ID",
    appId: "APP_ID"
};

// Initialize Firebase (CDN must be imported in HTML)
// We will check if 'firebase' global exists before running
if (typeof firebase !== 'undefined') {
    firebase.initializeApp(firebaseConfig);
    const db = firebase.firestore();

    // Export for use in other scripts if using modules, 
    // but for simple HTML import we'll use window globals.
    window.db = db;
    console.log("🔥 Firebase Initialized");
} else {
    console.error("Firebase SDK not loaded. Check your script imports.");
}
