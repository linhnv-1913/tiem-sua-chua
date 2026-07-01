import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { RotateCcw } from 'lucide-react';

export default function InventoryTab() {
  const { flavors, inventory, setInventory, setFullState } = useAppStore();

  // Modal State
  const [editingFlavorId, setEditingFlavorId] = useState<string | null>(null);
  const [qty, setQty] = useState<number | string>(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const activeFlavor = flavors.find(f => f.id === editingFlavorId);

  const handleCardClick = (id: string, currentStock: number) => {
    setEditingFlavorId(id);
    setQty(currentStock);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFlavorId) {
      setInventory(editingFlavorId, Number(qty) || 0);
    }
    setEditingFlavorId(null);
  };

  const handleAdjust = (delta: number) => {
    setQty(prev => {
      const num = typeof prev === 'number' ? prev : (Number(prev) || 0);
      return num + delta;
    });
  };

  const handleResetAll = () => {
    const resetInv = { ...inventory };
    flavors.forEach(f => {
      if (!f.isMix) {
        resetInv[f.id] = 0;
      }
    });
    setFullState({ inventory: resetInv });
    setShowResetConfirm(false);
  };

  return (
    <div className="p-6 flex flex-col h-full bg-white relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#5C3D3D]">Kho nguyên liệu</h2>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-500 bg-red-50 border border-red-100 rounded-xl hover:bg-red-100 active:scale-95 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset về 0
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {flavors.map(flavor => {
          if (flavor.isMix) return null; // Kho không hiển thị Mix vì mix là ảo
          const stock = inventory[flavor.id] || 0;
          return (
            <button 
              key={flavor.id} 
              onClick={() => handleCardClick(flavor.id, stock)}
              className="bg-pink-50/50 p-5 rounded-3xl border-2 border-pink-100 flex flex-col items-center text-center outline-none active:scale-95 active:bg-pink-100/50 transition-all cursor-pointer shadow-sm relative overflow-hidden"
            >
              <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-3 text-3xl z-10">
                {flavor.name.includes('Phô mai') ? '🧀' : flavor.name.includes('Nếp') ? '🌾' : flavor.name.includes('Matcha') ? '🍵' : flavor.name.includes('Khoai') ? '🍠' : flavor.name.includes('dừa') ? '🥥' : flavor.name.includes('Cà phê') ? '☕' : '🥛'}
              </div>
              <h3 className="font-bold text-[#5C3D3D] text-sm mb-1 z-10">{flavor.name}</h3>
              
              {stock < 0 ? (
                <div className="flex flex-col items-center z-10">
                   <p className="text-2xl font-black text-red-500">
                     {Math.abs(stock)} <span className="text-xs font-bold uppercase">hũ</span>
                   </p>
                   <p className="text-[10px] font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded-full mt-1">CẦN LÀM THÊM</p>
                </div>
              ) : (
                <p className={`text-2xl font-black z-10 ${stock === 0 ? 'text-gray-400' : 'text-pink-500'}`}>
                  {stock} <span className="text-xs font-bold uppercase">hũ</span>
                </p>
              )}
              
              {stock < 0 && <div className="absolute inset-0 bg-red-50 z-0"></div>}
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
                     type="text"
                     required
                     className={`w-full text-center text-4xl font-black outline-none bg-transparent ${Number(qty) < 0 ? 'text-red-500' : 'text-[#5C3D3D]'}`}
                     value={qty}
                     onChange={(e) => {
                       const val = e.target.value;
                       if (val === '' || val === '-') {
                         setQty(val);
                       } else {
                         const maxLenVal = val.length > 8 ? val.slice(0, 8) : val;
                         const parsed = parseInt(maxLenVal, 10);
                         setQty(isNaN(parsed) ? 0 : parsed);
                       }
                     }}
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

      {showResetConfirm && (
        <div className="absolute inset-0 bg-[#FFF9F0]/80 backdrop-blur-sm z-20 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full sm:max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 animate-in slide-in-from-bottom pb-10 sm:pb-8 shadow-2xl border-t-8 sm:border-8 border-white">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-red-500">
              <RotateCcw className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-[#5C3D3D] mb-2 text-center">Xác nhận Reset Kho</h3>
            <p className="text-center text-gray-500 text-sm font-medium mb-6 leading-relaxed">
              Bạn có chắc chắn muốn đặt nhanh số lượng của tất cả các vị sữa chua trong kho về <strong className="text-red-500">0 hũ</strong> không? Hành động này không thể hoàn tác.
            </p>
            
            <div className="flex gap-4">
              <button 
                type="button" 
                onClick={() => setShowResetConfirm(false)} 
                className="flex-1 py-3.5 text-gray-500 font-bold bg-gray-50 rounded-2xl active:bg-gray-100 transition text-sm"
              >
                Hủy bỏ
              </button>
              <button 
                type="button" 
                onClick={handleResetAll} 
                className="flex-1 py-3.5 text-white font-bold bg-red-500 rounded-2xl shadow-lg shadow-red-200 active:bg-red-600 transition text-sm"
              >
                Reset về 0
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
