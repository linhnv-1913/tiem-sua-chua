import React, { useEffect, useState, useRef } from 'react';
import { useAppStore } from '../store';
import { fetchStateFromCloud, syncStateToCloud } from './sync';

export const SyncManager = ({ children }: { children: React.ReactNode }) => {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const store = useAppStore();
  
  // Track previous state to determine if we should sync up
  const prevStateRef = useRef<any>(null);

  useEffect(() => {
    const initData = async () => {
      try {
        setErrorMsg(null);
        if (isInitialLoad) {
          setIsSyncing(true);
          const cloudState = await fetchStateFromCloud();
          if (cloudState) {
            store.setFullState(cloudState);
          }
          setIsSyncing(false);
          setIsInitialLoad(false);
          prevStateRef.current = cloudState; // avoid triggering immediate sync back up
        }
      } catch (error) {
        console.error(error);
        setErrorMsg('Không thể kết nối đến máy chủ lưu trữ (Firestore). Đang dùng bộ nhớ cục bộ.');
        setIsInitialLoad(false);
      } finally {
        setIsInitializing(false);
      }
    };

    initData();
  }, [isInitialLoad]);


  useEffect(() => {
    // Determine what parts of the store we care about syncing (everything basically)
    const currentStateStr = JSON.stringify({
      flavors: store.flavors,
      inventory: store.inventory,
      expenses: store.expenses,
      orders: store.orders,
      productionBatches: store.productionBatches
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
            orders: store.orders,
            productionBatches: store.productionBatches
          });
       }, 2000); 

       return () => clearTimeout(timeoutId);
    }

  }, [store.flavors, store.inventory, store.expenses, store.orders, store.productionBatches, isInitialLoad]);


  if (isInitializing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFF9F0] p-6 space-y-6">
        <h1 className="text-3xl font-black text-[#5C3D3D] text-center">Tiệm sữa chua Vị Nhà ✨</h1>
        <p className="text-pink-500 font-bold mb-2 text-lg">Đang kết nối hệ thống...</p>
      </div>
    );
  }

  if (isSyncing) {
    return (
       <div className="flex flex-col items-center justify-center min-h-screen bg-[#FFF9F0]">
          <p className="text-pink-500 font-bold mb-2 text-lg">Đang tải dữ liệu từ cửa hàng...</p>
       </div>
    );
  }

  return (
    <>
      {errorMsg && (
        <div className="bg-red-50 text-red-500 p-2 text-xs font-medium border-b border-red-100 text-center sticky top-0 z-50">
          {errorMsg}
        </div>
      )}
      {children}
    </>
  );
};

