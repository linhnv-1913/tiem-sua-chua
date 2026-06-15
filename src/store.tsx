import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Flavor, Inventory, Expense, Order, OrderItem } from './types';

const INITIAL_FLAVORS: Flavor[] = [
  { id: 'f-phomai', name: 'Phô mai', pricePerSet: 55000 },
  { id: 'f-matcha', name: 'Matcha', pricePerSet: 49000 },
  { id: 'f-khoaimon', name: 'Khoai môn', pricePerSet: 49000 },
  { id: 'f-cotdua', name: 'Cốt dừa', pricePerSet: 49000 },
  { id: 'f-truyenthong', name: 'Truyền thống', pricePerSet: 40000 },
  { id: 'f-mix', name: 'Mix vị', pricePerSet: 49000, isMix: true },
];

interface AppState {
  flavors: Flavor[];
  inventory: Inventory;
  expenses: Expense[];
  orders: Order[];
}

interface AppContextType extends AppState {
  addFlavor: (flavor: Omit<Flavor, 'id'>) => void;
  updateFlavorPrice: (id: string, newPrice: number) => void;
  addInventory: (flavorId: string, quantityJars: number) => void;
  setInventory: (flavorId: string, quantityJars: number) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  addOrder: (order: Omit<Order, 'id' | 'createdAt'>) => { success: boolean; error?: string };
  updateOrderStatus: (id: string, status: Order['status']) => void;
}

const defaultState: AppState = {
  flavors: INITIAL_FLAVORS,
  inventory: INITIAL_FLAVORS.reduce((acc, f) => ({ ...acc, [f.id]: 0 }), {} as Inventory),
  expenses: [],
  orders: []
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('yogurt-shop-state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge missing flavors if any
        const mergedFlavors = [...INITIAL_FLAVORS];
        if (parsed.flavors) {
           parsed.flavors.forEach((pf: Flavor) => {
             if (!mergedFlavors.find(f => f.id === pf.id)) {
               mergedFlavors.push(pf);
             }
           });
        }
        return { ...defaultState, ...parsed, flavors: mergedFlavors };
      } catch (e) {
        return defaultState;
      }
    }
    return defaultState;
  });

  useEffect(() => {
    localStorage.setItem('yogurt-shop-state', JSON.stringify(state));
  }, [state]);

  const addFlavor = (flavor: Omit<Flavor, 'id'>) => {
    const newFlavor = { ...flavor, id: `f-${Date.now()}` };
    setState(s => ({
      ...s,
      flavors: [...s.flavors, newFlavor],
      inventory: { ...s.inventory, [newFlavor.id]: 0 }
    }));
  };

  const updateFlavorPrice = (id: string, newPrice: number) => {
    setState(s => ({
      ...s,
      flavors: s.flavors.map(f => f.id === id ? { ...f, pricePerSet: newPrice } : f)
    }));
  };

  const addInventory = (flavorId: string, quantityJars: number) => {
    setState(s => ({
      ...s,
      inventory: {
        ...s.inventory,
        [flavorId]: (s.inventory[flavorId] || 0) + quantityJars
      }
    }));
  };

  const setInventory = (flavorId: string, quantityJars: number) => {
    setState(s => ({
      ...s,
      inventory: {
        ...s.inventory,
        [flavorId]: Math.max(0, quantityJars)
      }
    }));
  };

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    setState(s => ({
      ...s,
      expenses: [{ ...expense, id: `e-${Date.now()}` }, ...s.expenses]
    }));
  };

  const addOrder = (order: Omit<Order, 'id' | 'createdAt'>): { success: boolean; error?: string } => {
    // Validation Logic
    const currentInventory = { ...state.inventory };
    const baseFlavors = state.flavors.filter(f => !f.isMix);
    
    // Check stock requirements
    for (const item of order.items) {
      const flavor = state.flavors.find(f => f.id === item.flavorId);
      if (!flavor) return { success: false, error: 'Không tìm thấy thông tin vị.' };

      if (flavor.isMix) {
        // Mix = 1 of each base flavor per set
        for (const base of baseFlavors) {
          const needed = item.quantitySets * 1;
          if ((currentInventory[base.id] || 0) < needed) {
            return { success: false, error: `Không đủ sữa chua trong kho. Vị ${base.name} chỉ còn ${currentInventory[base.id] || 0} hũ. Vui lòng nhập thêm kho!` };
          }
          currentInventory[base.id] -= needed;
        }
      } else {
        const needed = item.quantitySets * 5;
        if ((currentInventory[flavor.id] || 0) < needed) {
             return { success: false, error: `Không đủ sữa chua trong kho. Vị ${flavor.name} chỉ còn ${currentInventory[flavor.id] || 0} hũ. Vui lòng nhập thêm kho!` };
        }
        currentInventory[flavor.id] -= needed;
      }
    }

    // Success, apply deduction and save order
    const newOrder: Order = { ...order, id: `o-${Date.now()}`, createdAt: new Date().toISOString() };
    setState(s => ({
      ...s,
      inventory: currentInventory,
      orders: [newOrder, ...s.orders]
    }));
    return { success: true };
  };

  const updateOrderStatus = (id: string, status: Order['status']) => {
    setState(s => ({
      ...s,
      orders: s.orders.map(o => o.id === id ? { ...o, status } : o)
    }));
  };

  return (
    <AppContext.Provider value={{ ...state, addFlavor, updateFlavorPrice, addInventory, setInventory, addExpense, addOrder, updateOrderStatus }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppStore must be used within AppProvider');
  return context;
};
