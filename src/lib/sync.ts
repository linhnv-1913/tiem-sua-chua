import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from './auth';

export const syncStateToCloud = async (state: any) => {
  try {
    const user = auth.currentUser;
    if (!user) return;
    
    const docRef = doc(db, 'userStates', user.uid);
    await setDoc(docRef, { state: JSON.stringify(state), updatedAt: new Date().toISOString() });
    console.log('Synced to Firestore successfully.');
  } catch (err) {
    console.error('Error syncing to Firestore:', err);
  }
};

export const fetchStateFromCloud = async (): Promise<any> => {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    
    const docRef = doc(db, 'userStates', user.uid);
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

