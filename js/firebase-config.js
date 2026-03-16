const firebaseConfig = {
  apiKey: "AIzaSyBmM6_CdRBbXvPm0kQxASbAVK-GP4jbcyc",
  authDomain: "renga-gym-app.firebaseapp.com",
  projectId: "renga-gym-app",
  storageBucket: "renga-gym-app.appspot.com",
  messagingSenderId: "787058075477",
  appId: "1:787058075477:web:e559ce8f555d463366f1dc"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();