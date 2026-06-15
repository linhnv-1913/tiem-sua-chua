import React from 'react';
import { ShoppingBag, Archive, ReceiptText, PieChart } from 'lucide-react';

const TABS = [
  { id: 'orders', label: 'Đơn hàng', icon: ShoppingBag },
  { id: 'inventory', label: 'Kho', icon: Archive },
  { id: 'expenses', label: 'Chi phí', icon: ReceiptText },
  { id: 'reports', label: 'Báo cáo', icon: PieChart },
];

export default function AppLayout({ children, activeTab, onTabChange }: { children: React.ReactNode, activeTab: string, onTabChange: (t: any) => void }) {
  return (
    <div className="flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-white relative overflow-hidden shadow-2xl shadow-pink-100 sm:rounded-[2.5rem] sm:my-8 sm:h-[calc(100vh-4rem)] sm:border-8 sm:border-white font-sans text-[#4A3732]">
      
      {/* Header */}
      <header className="bg-white px-6 py-5 static z-10 border-b-2 border-pink-50 flex flex-col items-start justify-center">
        <h1 className="text-2xl font-black text-[#5C3D3D] tracking-tight">Tiệm sữa chua Vị Nhà ✨</h1>
        <p className="text-pink-400 font-medium text-xs mt-1">Chào buổi sáng, Cô Nàng IT xinh đẹp ơi</p>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full bg-white">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t-2 border-pink-50 px-4 py-2 pb-safe static z-10 shadow-[0_-4px_10px_rgba(252,231,243,0.5)]">
        <ul className="flex justify-between items-center">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <li key={tab.id} className="flex-1">
                <button
                  onClick={() => onTabChange(tab.id)}
                  className={`w-full flex flex-col items-center justify-center py-2 px-1 transition-colors duration-200 rounded-2xl ${
                    isActive ? 'text-white bg-pink-400 shadow-md' : 'text-pink-300 hover:bg-pink-50'
                  }`}
                >
                  <tab.icon className={`h-6 w-6 mb-1 ${isActive ? 'text-white' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                  <span className={`text-[10px] tracking-wide ${isActive ? 'font-bold' : 'font-medium'}`}>
                    {tab.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

// Need to import icons, so I'll create the TABS array here, but wait, need to import from lucide-react.
