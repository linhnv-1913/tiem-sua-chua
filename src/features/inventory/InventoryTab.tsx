import React, { useState } from 'react';
import { useAppStore } from '../../store';

export default function InventoryTab() {
  const { flavors, inventory, setInventory } = useAppStore();

  // Modal State
  const [editingFlavorId, setEditingFlavorId] = useState<string | null>(null);
  const [qty, setQty] = useState<number>(0);

  const activeFlavor = flavors.find(f => f.id === editingFlavorId);

  const handleCardClick = (id: string, currentStock: number) => {
    setEditingFlavorId(id);
    setQty(currentStock);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFlavorId && qty >= 0) {
      setInventory(editingFlavorId, qty);
    }
    setEditingFlavorId(null);
  };

  const handleAdjust = (delta: number) => {
    setQty(prev => Math.max(0, prev + delta));
  };

  return (
    <div className="p-6 flex flex-col h-full bg-white relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#5C3D3D]">Kho nguyên liệu</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {flavors.map(flavor => {
          if (flavor.isMix) return null; // Kho không hiển thị Mix vì mix là ảo
          const stock = inventory[flavor.id] || 0;
          return (
            <button 
              key={flavor.id} 
              onClick={() => handleCardClick(flavor.id, stock)}
              className="bg-pink-50/50 p-5 rounded-3xl border-2 border-pink-100 flex flex-col items-center text-center outline-none active:scale-95 active:bg-pink-100/50 transition-all cursor-pointer shadow-sm"
            >
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3">
                <span className="text-3xl">{flavor.name.includes('Phô mai') ? '🧀' : flavor.name.includes('Matcha') ? '🍵' : flavor.name.includes('Khoai') ? '🍠' : flavor.name.includes('dừa') ? '🥥' : '🥛'}</span>
              </div>
              <h3 className="font-bold text-[#5C3D3D] text-sm mb-1">{flavor.name}</h3>
              <p className={`text-2xl font-black ${stock < 5 ? 'text-red-500' : 'text-pink-500'}`}>
                {stock} <span className="text-xs font-bold text-gray-400 uppercase">hũ</span>
              </p>
            </button>
          )
        })}
      </div>

      {editingFlavorId && activeFlavor && (
        <div className="absolute inset-0 bg-[#FFF9F0]/80 backdrop-blur-sm z-20 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full sm:max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 animate-in slide-in-from-bottom pb-10 sm:pb-8 shadow-2xl border-t-8 sm:border-8 border-white">
            <h3 className="text-2xl font-black text-[#5C3D3D] mb-2 text-center">{activeFlavor.name}</h3>
            <p className="text-center text-pink-400 font-medium mb-6">Chỉnh sửa số lượng trong kho</p>
            
            <form onSubmit={handleSave} className="flex flex-col gap-5">
              
              <div className="flex items-center justify-center gap-6 mb-2">
                 <button type="button" onClick={() => handleAdjust(-1)} className="w-14 h-14 rounded-2xl bg-pink-50 text-pink-500 font-black text-2xl active:bg-pink-100 transition shadow-sm border border-pink-100 flex items-center justify-center">-</button>
                 
                 <div className="flex flex-col items-center w-24">
                   <input 
                     type="number"
                     inputMode="numeric"
                     min="0"
                     required
                     className="w-full text-center text-4xl font-black text-[#5C3D3D] outline-none bg-transparent"
                     value={qty}
                     onChange={(e) => setQty(parseInt(e.target.value) || 0)}
                   />
                   <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">hũ</span>
                 </div>
                 
                 <button type="button" onClick={() => handleAdjust(1)} className="w-14 h-14 rounded-2xl bg-pink-400 text-white font-black text-2xl shadow-lg shadow-pink-200 active:bg-pink-500 transition flex items-center justify-center">+</button>
              </div>

              <div className="flex gap-4 mt-6">
                <button type="button" onClick={() => setEditingFlavorId(null)} className="flex-1 py-4 text-pink-500 font-bold bg-pink-50 rounded-2xl active:bg-pink-100 transition">Hủy</button>
                <button type="submit" className="flex-1 py-4 text-white font-bold bg-pink-400 rounded-2xl shadow-lg shadow-pink-200 active:opacity-90 transition">Lưu thay đổi</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
