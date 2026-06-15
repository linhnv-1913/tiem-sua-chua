import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, "ai-studio-9f9329f0-4110-4039-bbdd-4fef613c5fdc");

let isSigningIn = false;

export const initAuth = (
  onAuthSuccess?: (user: User) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user);
    } else {
      if (!isSigningIn) {
        anonymousSignIn().then(newUser => {
           if (onAuthSuccess && newUser) onAuthSuccess(newUser);
        }).catch(() => {
           if (onAuthFailure) onAuthFailure();
        });
      }
    }
  });
};

export const anonymousSignIn = async (): Promise<User | null> => {
  try {
    isSigningIn = true;
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error: any) {
    console.error('Anonymous sign in error:', error);
    return null;
  } finally {
    isSigningIn = false;
  }
};

