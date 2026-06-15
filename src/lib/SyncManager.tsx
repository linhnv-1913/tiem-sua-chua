import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store';
import { initAuth, googleSignIn, getAccessToken } from './auth';
import { fetchStateFromCloud, syncStateToCloud } from './sync';

export const SyncManager = ({ children }: { children: React.ReactNode }) => {
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const store = useAppStore();
  
  // Track previous state to determine if we should sync up
  const prevStateRef = useRef<any>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setNeedsAuth(false);
        setErrorMsg(null);
        // On success, pull data down once
        if (isInitialLoad) {
          setIsSyncing(true);
          const cloudState = await fetchStateFromCloud();
          if (cloudState) {
            // override local storage
            store.setFullState(cloudState);
          }
          setIsSyncing(false);
          setIsInitialLoad(false);
          prevStateRef.current = cloudState; // avoid triggering immediate sync back up
        }
      },
      () => {
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, [isInitialLoad]);


  useEffect(() => {
    // Determine what parts of the store we care about syncing (everything basically)
    const currentStateStr = JSON.stringify({
      flavors: store.flavors,
      inventory: store.inventory,
      expenses: store.expenses,
      orders: store.orders
    });
    
    // Ignore initial mount state if not ready or no diff
    if (isInitialLoad || !prevStateRef.current) {
        if (!isInitialLoad) {
           prevStateRef.current = currentStateStr;
        }
        return; 
    }

    if (currentStateStr !== prevStateRef.current) {
       // local data changed. Let's sync up! Include a reasonable debounce.
       prevStateRef.current = currentStateStr;
       
       const timeoutId = setTimeout(() => {
          syncStateToCloud({
            flavors: store.flavors,
            inventory: store.inventory,
            expenses: store.expenses,
            orders: store.orders
          });
       }, 2000); 

       return () => clearTimeout(timeoutId);
    }

  }, [store.flavors, store.inventory, store.expenses, store.orders, isInitialLoad]);


  const handleLogin = async () => {
    try {
      setErrorMsg(null);
      await googleSignIn();
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMsg('Bạn đã đóng cửa sổ đăng nhập. Vui lòng thử lại.');
      } else {
        setErrorMsg('Đã có lỗi xảy ra khi đăng nhập. Vui lòng thử lại.');
      }
    }
  };

  if (needsAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFF9F0] p-6 space-y-6">
        <h1 className="text-3xl font-black text-[#5C3D3D] text-center">Tiệm sữa chua Vị Nhà ✨</h1>
        <p className="text-center text-[#4A3732] max-w-sm">Đăng nhập tài khoản Google để đồng bộ dữ liệu vào Google Sheets theo yêu cầu.</p>
        
        {errorMsg && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm font-medium border border-red-100 text-center">
            {errorMsg}
          </div>
        )}

        <button onClick={handleLogin} className="gsi-material-button bg-white border border-gray-300 rounded hover:shadow-md transition">
          <div className="gsi-material-button-state"></div>
          <div className="gsi-material-button-content-wrapper flex items-center p-3">
            <div className="gsi-material-button-icon w-6 h-6 mr-3">
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{display: 'block'}}>
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
            </div>
            <span className="gsi-material-button-contents font-medium text-gray-700">Sign in with Google</span>
          </div>
        </button>
      </div>
    );
  }

  if (isSyncing) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFF9F0]">
          <p className="text-pink-500 font-bold mb-2 text-lg">Đang tải biểu mẫu từ Google Sheets...</p>
       </div>
    );
  }

  return <>{children}</>;
};
