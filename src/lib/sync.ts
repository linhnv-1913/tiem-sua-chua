import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './auth';

export const syncStateToCloud = async (state: any) => {
  try {
    const docRef = doc(db, 'appState', 'global');
    await setDoc(docRef, { state: JSON.stringify(state), updatedAt: new Date().toISOString() });
    console.log('Synced to Firestore successfully.');
  } catch (err) {
    console.error('Error syncing to Firestore:', err);
  }
};

export const fetchStateFromCloud = async (): Promise<any> => {
  try {
    const docRef = doc(db, 'appState', 'global');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.state) {
        return JSON.parse(data.state);
      }
    }
    return null;
  } catch (err) {
    console.error('Error fetching from Firestore:', err);
    return null;
  }
};

