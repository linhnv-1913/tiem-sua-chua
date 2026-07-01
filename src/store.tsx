import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Flavor, Inventory, Expense, Order, OrderItem, ProductionBatch } from './types';

const INITIAL_FLAVORS: Flavor[] = [
  { id: 'f-phomai', name: 'Phô mai', price: 12000 },
  { id: 'f-nepcam', name: 'Nếp cẩm', price: 11000 },
  { id: 'f-matcha', name: 'Matcha', price: 11000 },
  { id: 'f-khoaimon', name: 'Khoai môn', price: 11000 },
  { id: 'f-cotdua', name: 'Cốt dừa', price: 11000 },
  { id: 'f-caphe', name: 'Cà phê', price: 11000 },
  { id: 'f-truyenthong', name: 'Truyền thống', price: 10000 },
  { id: 'f-mix', name: 'Mix các vị (Set 5 hũ)', price: 55000, isMix: true }
];

interface AppState {
  flavors: Flavor[];
  inventory: Inventory;
  expenses: Expense[];
  orders: Order[];
  productionBatches?: ProductionBatch[];
}

interface AppContextType extends AppState {
  addFlavor: (flavor: Omit<Flavor, 'id'>) => void;
  updateFlavorPrice: (id: string, newPrice: number) => void;
  addInventory: (flavorId: string, quantityJars: number) => void;
  setInventory: (flavorId: string, quantityJars: number) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, updates: Partial<Omit<Expense, 'id'>>) => void;
  addOrder: (order: Omit<Order, 'id' | 'createdAt'>) => { success: boolean; error?: string };
  updateOrder: (id: string, updates: Omit<Order, 'id' | 'createdAt' | 'status'>) => { success: boolean; error?: string };
  updateOrderStatus: (id: string, status: Order['status']) => void;
  markOrderBilled: (id: string) => void;
  setFullState: (newState: Partial<AppState>) => void;
}

const defaultState: AppState = {
  flavors: INITIAL_FLAVORS,
  inventory: INITIAL_FLAVORS.reduce((acc, f) => ({ ...acc, [f.id]: 0 }), {} as Inventory),
  expenses: [],
  orders: [],
  productionBatches: []
};

export const normalizeAppState = (parsed: any): AppState => {
  // Map old data format
  if (parsed.flavors) {
    parsed.flavors = parsed.flavors
      .map((f: any) => {
        let expectedPrice = 11000;
        if (f.isMix) expectedPrice = 55000;
        else if (f.id === 'f-phomai') expectedPrice = 12000;
        else if (f.id === 'f-nepcam') expectedPrice = 11000;
        else if (f.id === 'f-truyenthong') expectedPrice = 10000;
        
        return { ...f, price: expectedPrice };
      });
  }
  
  if (parsed.orders) {
    parsed.orders = parsed.orders.map((o: any) => {
      let itemTotal = 0;
      let totalJars = 0;
      if (o.items) {
         o.items.forEach((item: any) => {
            let fPrice = 11000;
            if (item.flavorId === 'f-phomai') fPrice = 12000;
            else if (item.flavorId === 'f-nepcam') fPrice = 11000;
            else if (item.flavorId === 'f-truyenthong') fPrice = 10000;
            else if (item.flavorId === 'f-mix') fPrice = 55000;
            else fPrice = 11000; // default for others
            
            // if quantitySets was used in old data, multiply by 5 to get quantity
            const qty = Number(item.quantity) || (Number(item.quantitySets) || 0) * 5;
            item.quantity = qty; // Normalize to quantity
            itemTotal += qty * fPrice;
            totalJars += qty;
         });
      }
      if (totalJars >= 5) itemTotal -= 5000; // apply discount
      
      return {
         ...o,
         isBilled: o.isBilled !== undefined ? o.isBilled : (o.status === 'delivered'),
         totalPrice: Math.max(0, o.totalPrice || o.total || o.price || itemTotal)
      };
    });
  }
  
  // Merge missing flavors if any
  const mergedFlavors = [...INITIAL_FLAVORS];
  if (parsed.flavors) {
     parsed.flavors.forEach((pf: Flavor) => {
       const existing = mergedFlavors.find(f => f.id === pf.id);
       if (!existing) {
         mergedFlavors.push(pf);
       } else {
         // Prefer the saved price if they customized it
         existing.price = pf.price || existing.price;
       }
     });
  }
  const mergedInventory = { ...defaultState.inventory, ...parsed.inventory };
  return { ...defaultState, ...parsed, flavors: mergedFlavors, inventory: mergedInventory };
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('yogurt-shop-state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return normalizeAppState(parsed);
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
      flavors: s.flavors.map(f => f.id === id ? { ...f, price: newPrice } : f)
    }));
  };

  const applyInventoryChange = (inv: Inventory, flavors: Flavor[], item: OrderItem, multiplier: number) => {
    const flavor = flavors.find(f => f.id === item.flavorId);
    if (flavor?.isMix) {
      const baseFlavors = ['f-phomai', 'f-matcha', 'f-khoaimon', 'f-cotdua', 'f-truyenthong'];
      baseFlavors.forEach(bfId => {
        inv[bfId] = (inv[bfId] || 0) + item.quantity * multiplier;
      });
    } else if (flavor) {
      inv[flavor.id] = (inv[flavor.id] || 0) + item.quantity * multiplier;
    }
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
        [flavorId]: quantityJars
      }
    }));
  };

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    setState(s => ({
      ...s,
      expenses: [{ ...expense, id: `e-${Date.now()}` }, ...s.expenses]
    }));
  };

  const updateExpense = (id: string, updates: Partial<Omit<Expense, 'id'>>) => {
    setState(s => ({
      ...s,
      expenses: s.expenses.map(e => e.id === id ? { ...e, ...updates } : e)
    }));
  };

  const addOrder = (order: Omit<Order, 'id' | 'createdAt'>): { success: boolean; error?: string } => {
    // Validation Logic
    const currentInventory = { ...state.inventory };
    
    // Check stock requirements and apply deduction
    const allItems = [...order.items, ...(order.giftItems || [])];
    for (const item of allItems) {
      applyInventoryChange(currentInventory, state.flavors, item, -1);
    }

    // Success, apply deduction and save order
    const newOrder: Order = { ...order, id: `o-${Date.now()}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    setState(s => ({
      ...s,
      inventory: currentInventory,
      orders: [newOrder, ...s.orders]
    }));
    return { success: true };
  };

  const updateOrder = (id: string, updates: Omit<Order, 'id' | 'createdAt' | 'status'>): { success: boolean; error?: string } => {
    let result = { success: true, error: undefined as undefined | string };
    setState(s => {
      const order = s.orders.find(o => o.id === id);
      if (!order || (order.status !== 'pending' && order.status !== 'delivered')) {
        result = { success: false, error: 'Không thể chỉnh sửa đơn hàng này.' };
        return s;
      }

      let newInventory = { ...s.inventory };

      // 1. Refund the old order inventory
      const oldAllItems = [...order.items, ...(order.giftItems || [])];
      for (const item of oldAllItems) {
        applyInventoryChange(newInventory, s.flavors, item, 1);
      }

      // 2. Deduct the new order inventory
      const newAllItems = [...updates.items, ...(updates.giftItems || [])];
      for (const item of newAllItems) {
        applyInventoryChange(newInventory, s.flavors, item, -1);
      }

      const updatedOrder = { ...order, ...updates, updatedAt: new Date().toISOString() };

      return {
        ...s,
        inventory: newInventory,
        orders: s.orders.map(o => o.id === id ? updatedOrder : o)
      };
    });

    return result;
  };

  const updateOrderStatus = (id: string, status: Order['status']) => {
    setState(s => {
      const order = s.orders.find(o => o.id === id);
      if (!order || order.status === status) return s;

      let newInventory = { ...s.inventory };

      if (status === 'cancelled') {
        // Refund inventory
        const allItems = [...order.items, ...(order.giftItems || [])];
        for (const item of allItems) {
          applyInventoryChange(newInventory, s.flavors, item, 1);
        }
      } else if (order.status === 'cancelled') {
        // Deduct inventory if uncancelling
        const allItems = [...order.items, ...(order.giftItems || [])];
        for (const item of allItems) {
          applyInventoryChange(newInventory, s.flavors, item, -1);
        }
      }

      return {
        ...s,
        inventory: newInventory,
        orders: s.orders.map(o => o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o)
      };
    });
  };

  const markOrderBilled = (id: string) => {
    setState(s => ({
      ...s,
      orders: s.orders.map(o => o.id === id ? { ...o, isBilled: true, updatedAt: new Date().toISOString() } : o)
    }));
  };

  const setFullState = (newState: Partial<AppState>) => {
    setState(s => normalizeAppState({ ...s, ...newState }));
  };

  return (
    <AppContext.Provider value={{ ...state, addFlavor, updateFlavorPrice, addInventory, setInventory, addExpense, updateExpense, addOrder, updateOrder, updateOrderStatus, markOrderBilled, setFullState }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppStore must be used within AppProvider');
  return context;
};
