import React, { useMemo, useState } from 'react';
import { useAppStore } from '../../store';
import { formatVND, safeDate } from '../../utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

type TimeFilter = 'thisWeek' | 'lastWeek' | 'thisMonth';

export default function ReportsTab() {
  const { orders, expenses, flavors } = useAppStore();
  const [filter, setFilter] = useState<TimeFilter>('thisWeek');

  const stats = useMemo(() => {
    const today = new Date();
    let interval = { start: new Date(0), end: new Date() };

    if (filter === 'thisWeek') {
      interval = { start: startOfWeek(today, { weekStartsOn: 1 }), end: endOfWeek(today, { weekStartsOn: 1 }) };
    } else if (filter === 'lastWeek') {
      const lastWeek = subWeeks(today, 1);
      interval = { start: startOfWeek(lastWeek, { weekStartsOn: 1 }), end: endOfWeek(lastWeek, { weekStartsOn: 1 }) };
    } else if (filter === 'thisMonth') {
      interval = { start: startOfMonth(today), end: endOfMonth(today) };
    }

    const filteredOrders = orders.filter(o => {
      if (o.status !== 'delivered') return false; 
      const d = safeDate(o.createdAt);
      return isWithinInterval(d, interval);
    });

    const filteredExpenses = expenses.filter(e => {
       const d = safeDate(e.date);
       return isWithinInterval(d, interval);
    });

    const revenue = filteredOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const cost = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = revenue - cost;

    // Chart Data
    const itemCounts: Record<string, number> = {};
    filteredOrders.forEach(o => {
      o.items.forEach(item => {
        itemCounts[item.flavorId] = (itemCounts[item.flavorId] || 0) + item.quantitySets;
      });
    });

    const chartData = flavors
       .filter(f => itemCounts[f.id] > 0)
       .map(f => ({ name: f.name, value: itemCounts[f.id] }))
       .sort((a, b) => b.value - a.value);

    return { revenue, cost, profit, chartData };
  }, [orders, expenses, flavors, filter]);

  const COLORS = ['#f472b6', '#fb923c', '#a78bfa', '#34d399', '#60a5fa', '#fbbf24'];

  return (
    <div className="p-6 flex flex-col h-full bg-white relative overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#5C3D3D]">Báo cáo kinh doanh</h2>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 bg-pink-50 p-1.5 rounded-2xl">
        {[
          { id: 'thisWeek', label: 'Tuần này' },
          { id: 'lastWeek', label: 'Tuần trước' },
          { id: 'thisMonth', label: 'Tháng này' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id as TimeFilter)}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-colors ${
              filter === f.id ? 'bg-white shadow-sm text-pink-500' : 'text-pink-400 hover:text-pink-500'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid gap-4 mb-8">
        <div className="flex gap-4">
          <div className="flex-1 bg-[#F2FFF5] p-5 rounded-3xl border border-green-100 flex flex-col justify-center items-start">
            <span className="text-2xl mb-2">💵</span>
            <p className="text-xs text-green-600 font-bold uppercase tracking-wider mb-1">Doanh thu</p>
            <p className="text-xl font-black text-green-800">{formatVND(stats.revenue)}</p>
          </div>
          
          <div className="flex-1 bg-orange-50 p-5 rounded-3xl border border-orange-100 flex flex-col justify-center items-start">
            <span className="text-2xl mb-2">💸</span>
            <p className="text-xs text-orange-600 font-bold uppercase tracking-wider mb-1">Chi phí</p>
            <p className="text-xl font-black text-orange-800">{formatVND(stats.cost)}</p>
          </div>
        </div>

        <div className={`p-6 rounded-3xl border-2 flex flex-col justify-center text-center ${
           stats.profit >= 0 ? 'bg-purple-50 border-purple-100' : 'bg-red-50 border-red-100'
        }`}>
          <span className="text-3xl mb-2">{stats.profit >= 0 ? '🎉' : '⚠️'}</span>
          <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${stats.profit >= 0 ? 'text-purple-600' : 'text-red-500'}`}>Lợi nhuận gộp</p>
          <p className={`text-3xl font-black ${stats.profit >= 0 ? 'text-purple-800' : 'text-red-600'}`}>{formatVND(stats.profit)}</p>
        </div>
      </div>

      {/* Chart */}
      {stats.chartData.length > 0 && (
         <div className="bg-pink-50 p-6 rounded-3xl border border-pink-100">
           <h3 className="text-sm font-bold text-pink-600 mb-4 text-center uppercase tracking-wider">Tỷ lệ bán chạy (Set)</h3>
           <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={stats.chartData}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={80}
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {stats.chartData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip formatter={(value) => [`${value} set`, 'Số lượng']} />
                 <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
               </PieChart>
             </ResponsiveContainer>
           </div>
         </div>
      )}
    </div>
  );
}
