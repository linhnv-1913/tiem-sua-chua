import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { formatVND, safeDate } from '../../utils';
import { Plus, Receipt } from 'lucide-react';

export default function ExpensesTab() {
  const { expenses, addExpense } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !date) return;
    addExpense({
      name,
      amount: parseInt(amount, 10),
      date
    });
    setName('');
    setAmount('');
    setShowAdd(false);
  };

  return (
    <div className="p-6 flex flex-col h-full bg-white relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#5C3D3D]">Chi phí nguyên liệu</h2>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-orange-50 text-orange-500 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1 active:bg-orange-100 transition"
        >
          <Plus size={16} /> Thêm chi
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-4">
        {expenses.length === 0 ? (
          <div className="text-center text-pink-300 mt-10">
            <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="font-medium">Chưa có khoản chi phí nào</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {expenses.map(expense => (
              <li key={expense.id} className="bg-white p-5 rounded-3xl border-2 border-orange-50 flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-xl flex items-center justify-center text-xl font-bold">💸</div>
                  <div>
                    <h3 className="font-bold text-[#5C3D3D] text-base">{expense.name}</h3>
                    <p className="text-xs text-orange-400 font-bold uppercase tracking-wider">{new Intl.DateTimeFormat('vi-VN').format(safeDate(expense.date))}</p>
                  </div>
                </div>
                <div className="text-orange-500 font-black text-lg">
                  -{formatVND(expense.amount)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {showAdd && (
        <div className="absolute inset-0 bg-[#FFF9F0]/80 backdrop-blur-sm z-20 flex items-end sm:items-center justify-center sm:p-4">
          <div className="bg-white w-full sm:max-w-sm rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 animate-in slide-in-from-bottom pb-10 sm:pb-8 shadow-2xl border-t-8 sm:border-8 border-white">
            <h3 className="text-2xl font-black text-[#5C3D3D] mb-6 text-center">Nhập chi phí</h3>
            <form onSubmit={handleAddExpense} className="flex flex-col gap-5">
              <div>
                <label className="block text-sm font-bold text-[#5C3D3D] mb-2 uppercase tracking-wide">Tên nguyên liệu</label>
                <input 
                  type="text"
                  required
                  placeholder="Ví dụ: Mua sữa đặc, hũ thuỷ tinh..."
                  className="w-full border-2 border-orange-100 rounded-2xl p-4 bg-white focus:border-orange-400 outline-none font-bold text-[#4A3732] placeholder-orange-200"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#5C3D3D] mb-2 uppercase tracking-wide">Số tiền (VNĐ)</label>
                <input 
                  type="number"
                  inputMode="numeric"
                  min="0"
                  required
                  placeholder="Ví dụ: 150000"
                  className="w-full border-2 border-orange-100 rounded-2xl p-4 bg-white focus:border-orange-400 outline-none font-bold text-[#4A3732] placeholder-orange-200"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#5C3D3D] mb-2 uppercase tracking-wide">Ngày mua</label>
                <input 
                  type="date"
                  required
                  className="w-full border-2 border-orange-100 rounded-2xl p-4 bg-white focus:border-orange-400 outline-none font-bold text-[#4A3732]"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="flex gap-4 mt-4">
                <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-4 text-orange-500 font-bold bg-orange-50 rounded-2xl active:bg-orange-100 transition">Hủy</button>
                <button type="submit" className="flex-1 py-4 text-white font-bold bg-orange-400 rounded-2xl shadow-lg shadow-orange-200 active:opacity-90 transition">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
