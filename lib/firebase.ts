import { initializeApp } from "firebase/app"
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from "firebase/auth"
import { getAnalytics } from "firebase/analytics"
import { getFirestore, doc, setDoc, getDoc, Timestamp } from "firebase/firestore"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmVOeMWYEXOkPj7vBRuWJPr_sUq1E2byo",
  authDomain: "my-awasome-crud.firebaseapp.com",
  projectId: "my-awasome-crud",
  storageBucket: "my-awasome-crud.firebasestorage.app",
  messagingSenderId: "762867262514",
  appId: "1:762867262514:web:0dbc4ec3d6a639d963482b",
  measurementId: "G-VS03S9WZ9B",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Analytics only on client side
let analytics
if (typeof window !== "undefined") {
  analytics = getAnalytics(app)
}

// Initialize Firebase Authentication and Firestore
const auth = getAuth(app)
const db = getFirestore(app)

// User classification types
export type UserClassification = "Hechicero" | "Luchador" | "Explorador" | "Olvidado" | "Nuevo"

// Function to update last login time and get user classification
export const updateLastLogin = async (userId: string) => {
  const userRef = doc(db, "users", userId)
  const now = Timestamp.now()

  // Get current user data
  const userDoc = await getDoc(userRef)
  const userData = userDoc.data()

  let lastLogin = null
  if (userData && userData.lastLogin) {
    lastLogin = userData.lastLogin
  }

  // Calculate classification based on last login
  let classification: UserClassification = "Nuevo"

  if (lastLogin) {
    const hoursSinceLastLogin = (now.toMillis() - lastLogin.toMillis()) / (1000 * 60 * 60)

    if (hoursSinceLastLogin <= 12) {
      classification = "Hechicero"
    } else if (hoursSinceLastLogin <= 48) {
      classification = "Luchador"
    } else if (hoursSinceLastLogin <= 7 * 24) {
      classification = "Explorador"
    } else {
      classification = "Olvidado"
    }
  }

  // Update user document with new last login and classification
  await setDoc(
    userRef,
    {
      lastLogin: now,
      previousLogin: lastLogin || now,
      classification: classification,
      updatedAt: now,
    },
    { merge: true },
  )

  return { classification, lastLogin: now }
}

// Function to get user data including classification
export const getUserData = async (userId: string) => {
  const userRef = doc(db, "users", userId)
  const userDoc = await getDoc(userRef)

  if (userDoc.exists()) {
    return userDoc.data()
  }

  return null
}

// Authentication functions
export const loginWithEmailAndPassword = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)

    // Update last login time and get classification
    const { classification } = await updateLastLogin(userCredential.user.uid)

    return {
      user: userCredential.user,
      classification,
      error: null,
    }
  } catch (error: any) {
    return { user: null, classification: null, error: error.message }
  }
}

export const registerWithEmailAndPassword = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)

    // Initialize user document with first login
    const userRef = doc(db, "users", userCredential.user.uid)
    const now = Timestamp.now()

    await setDoc(userRef, {
      email: email,
      createdAt: now,
      lastLogin: now,
      classification: "Nuevo",
      updatedAt: now,
    })

    return { user: userCredential.user, error: null }
  } catch (error: any) {
    return { user: null, error: error.message }
  }
}

export const logoutUser = async () => {
  try {
    await signOut(auth)
    return { success: true, error: null }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export { auth, db }

