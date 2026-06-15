/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider } from './store';
import { TabType } from './types';
import AppLayout from './components/AppLayout';
import OrdersTab from './features/orders/OrdersTab';
import InventoryTab from './features/inventory/InventoryTab';
import ExpensesTab from './features/expenses/ExpensesTab';
import ReportsTab from './features/reports/ReportsTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('orders');

  return (
    <AppProvider>
      <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'orders' && <OrdersTab />}
        {activeTab === 'inventory' && <InventoryTab />}
        {activeTab === 'expenses' && <ExpensesTab />}
        {activeTab === 'reports' && <ReportsTab />}
      </AppLayout>
    </AppProvider>
  );
}

