export interface Flavor {
  id: string;
  name: string;
  pricePerSet: number;
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
  quantitySets: number;
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  deliveryDate: string; // ISO string
  totalPrice: number;
  status: 'pending' | 'delivered' | 'cancelled';
  items: OrderItem[];
  createdAt: string; // ISO string
}

export type TabType = 'orders' | 'inventory' | 'expenses' | 'reports';
