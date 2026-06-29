// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB7iGF786gWCbmjYMHW2b9TldmHuqYcvpA",
  authDomain: "halo-voting.firebaseapp.com",
  projectId: "halo-voting",
  storageBucket: "halo-voting.firebasestorage.app",
  messagingSenderId: "394692087866",
  appId: "1:394692087866:web:48cbf5f371012eabd2a503",
  measurementId: "G-PW1P561FWQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);