import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'

export const firebaseConfig = {
  apiKey: "AIzaSyB7iGF786gWCbmjYMHW2b9TldmHuqYcvpA",
  authDomain: "halo-voting.firebaseapp.com",
  projectId: "halo-voting",
  storageBucket: "halo-voting.firebasestorage.app",
  messagingSenderId: "394692087866",
  appId: "1:394692087866:web:48cbf5f371012eabd2a503",
  measurementId: "G-PW1P561FWQ"
}

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const db = getFirestore(app)
export const auth = getAuth(app)
