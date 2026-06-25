export interface Flavor {
  id: string;
  name: string;
  price: number;
  isMix?: boolean;
}

export interface Inventory {
  [flavorId: string]: number; // key: flavorId, value: number of jars
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  date: string; // ISO string YYYY-MM-DD
}

export interface OrderItem {
  flavorId: string;
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  deliveryDate: string; // ISO string
  totalPrice: number;
  shippingFee?: number;
  status: 'pending' | 'delivered' | 'cancelled';
  isBilled?: boolean;
  items: OrderItem[];
  giftItems?: OrderItem[];
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string for status transitions / updates
}

export interface IngredientCost {
  name: string;
  cost: number;
}

export interface ProducedFlavor {
  flavorId: string;
  quantity: number;
}

export interface ProductionBatch {
  id: string;
  date: string; // YYYY-MM-DD
  ingredients: IngredientCost[];
  producedFlavors: ProducedFlavor[];
  notes?: string;
  appliedToInventory?: boolean;
}

export interface AppState {
  flavors: Flavor[];
  inventory: Inventory;
  expenses: Expense[];
  orders: Order[];
  productionBatches?: ProductionBatch[];
}

export type TabType = 'orders' | 'inventory' | 'expenses' | 'reports';
