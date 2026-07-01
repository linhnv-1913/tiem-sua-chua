import React, { useMemo, useState } from 'react';
import { useAppStore } from '../../store';
import { formatVND, safeDate } from '../../utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Plus, Trash2, Check, ArrowRight, RotateCcw, Calendar, Coins, Package, Percent, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { IngredientCost, ProducedFlavor, ProductionBatch } from '../../types';

type SubTabType = 'general' | 'batches';

export default function ReportsTab() {
  const { orders, expenses, flavors, productionBatches = [], inventory, setFullState } = useAppStore();
  const [subTab, setSubTab] = useState<SubTabType>('general');
  const [reportDateFilter, setReportDateFilter] = useState<string>('all');

  // Modal State for adding production batch
  const [showAddBatch, setShowAddBatch] = useState(false);
  const [batchDate, setBatchDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [batchNotes, setBatchNotes] = useState('');
  
  // Ingredients list for new batch
  const [ingredients, setIngredients] = useState<IngredientCost[]>([
    { name: 'Sữa tươi & Sữa đặc', cost: 0 },
    { name: 'Men cái', cost: 0 },
    { name: 'Whipping cream', cost: 0 },
    { name: 'Hũ nhựa & Bao bì', cost: 0 },
    { name: 'Điện, nước, gas', cost: 0 }
  ]);

  // Quantities produced per flavor (excluding mix)
  const baseFlavors = useMemo(() => flavors.filter(f => !f.isMix), [flavors]);
  const [producedQuantities, setProducedQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    flavors.filter(f => !f.isMix).forEach(f => {
      initial[f.id] = 0;
    });
    return initial;
  });

  // State to track expanded batches in list
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);

  const handleEditBatch = (batch: ProductionBatch) => {
    setEditingBatchId(batch.id);
    setBatchDate(batch.date);
    setBatchNotes(batch.notes || '');
    setIngredients(batch.ingredients.length > 0 ? [...batch.ingredients] : [
      { name: 'Sữa tươi & Sữa đặc', cost: 0 },
      { name: 'Men cái', cost: 0 },
      { name: 'Whipping cream', cost: 0 },
      { name: 'Hũ nhựa & Bao bì', cost: 0 },
      { name: 'Điện, nước, gas', cost: 0 }
    ]);
    const quantities: Record<string, number> = {};
    baseFlavors.forEach(f => {
      const pf = batch.producedFlavors.find(p => p.flavorId === f.id);
      quantities[f.id] = pf ? pf.quantity : 0;
    });
    setProducedQuantities(quantities);
    setShowAddBatch(true);
  };

  // General reports metrics
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    orders.forEach(o => {
      if (o.status === 'delivered' && o.deliveryDate) {
         dates.add(o.deliveryDate.split('T')[0]);
      }
    });
    return Array.from(dates).sort((a, b) => b.localeCompare(a));
  }, [orders]);

  const stats = useMemo(() => {
    const filteredOrders = orders.filter(o => {
      if (o.status !== 'delivered') return false;
      if (reportDateFilter !== 'all') {
         if (!o.deliveryDate) return false;
         return o.deliveryDate.split('T')[0] === reportDateFilter;
      }
      return true;
    });

    const filteredExpenses = reportDateFilter === 'all'
      ? expenses
      : expenses.filter(e => e.date === reportDateFilter);

    const revenue = filteredOrders.reduce((sum, o) => sum + o.totalPrice, 0);
    const cost = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = revenue - cost;

    // Chart Data
    const itemCounts: Record<string, number> = {};
    filteredOrders.forEach(o => {
      o.items.forEach(item => {
        itemCounts[item.flavorId] = (itemCounts[item.flavorId] || 0) + item.quantity;
      });
    });

    const chartData = flavors
       .filter(f => itemCounts[f.id] > 0)
       .map(f => ({ name: f.name, value: itemCounts[f.id] }))
       .sort((a, b) => b.value - a.value);

    return { revenue, cost, profit, chartData };
  }, [orders, expenses, flavors, reportDateFilter]);

  // Ingredients helper controls
  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: '', cost: 0 }]);
  };

  const handleUpdateIngredient = (index: number, field: keyof IngredientCost, value: string | number) => {
    const updated = [...ingredients];
    if (field === 'cost') {
      updated[index].cost = Number(value) || 0;
    } else {
      updated[index].name = String(value);
    }
    setIngredients(updated);
  };

  const handleRemoveIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  // Flavor helper controls
  const handleQtyChange = (flavorId: string, delta: number) => {
    setProducedQuantities(prev => ({
      ...prev,
      [flavorId]: Math.max(0, (prev[flavorId] || 0) + delta)
    }));
  };

  const handleQtyInput = (flavorId: string, value: string) => {
    const parsed = parseInt(value, 10);
    setProducedQuantities(prev => ({
      ...prev,
      [flavorId]: isNaN(parsed) ? 0 : Math.max(0, parsed)
    }));
  };

  // Calculation for the form in real-time
  const formCalculations = useMemo(() => {
    const totalIngredientCost = ingredients.reduce((sum, ing) => sum + ing.cost, 0);
    let totalJars = 0;
    let expectedRevenue = 0;

    (Object.entries(producedQuantities) as [string, number][]).forEach(([flavorId, qty]) => {
      const flavor = flavors.find(f => f.id === flavorId);
      if (flavor) {
        const price = flavor.price || (flavor.id === 'f-phomai' ? 12000 : (flavor.id === 'f-nepcam' ? 11000 : (flavor.id === 'f-truyenthong' ? 10000 : 11000)));
        totalJars += qty;
        expectedRevenue += qty * price;
      }
    });

    const expectedProfit = expectedRevenue - totalIngredientCost;
    const profitMargin = expectedRevenue > 0 ? (expectedProfit / expectedRevenue) * 100 : 0;
    const averageCostPerJar = totalJars > 0 ? totalIngredientCost / totalJars : 0;

    return {
      totalIngredientCost,
      totalJars,
      expectedRevenue,
      expectedProfit,
      profitMargin,
      averageCostPerJar
    };
  }, [ingredients, producedQuantities, flavors]);

  // Save new production batch
  const handleSaveBatch = (e: React.FormEvent) => {
    e.preventDefault();

    const producedFlavors: ProducedFlavor[] = (Object.entries(producedQuantities) as [string, number][])
      .filter(([_, qty]) => qty > 0)
      .map(([flavorId, qty]) => ({ flavorId, quantity: qty }));

    if (producedFlavors.length === 0) {
      alert('Vui lòng nhập sản lượng ít nhất 1 vị sữa chua!');
      return;
    }

    if (editingBatchId) {
      // Find the old batch to check if it was applied to inventory
      const oldBatch = productionBatches.find(b => b.id === editingBatchId);
      
      const updatedBatch: ProductionBatch = {
        id: editingBatchId,
        date: batchDate,
        ingredients: ingredients.filter(ing => ing.name.trim() !== '' && ing.cost > 0),
        producedFlavors,
        notes: batchNotes.trim() || undefined,
        appliedToInventory: oldBatch ? oldBatch.appliedToInventory : false
      };
      
      let newInventory = { ...inventory };
      
      // If it was already applied to inventory, we need to adjust the inventory
      if (oldBatch && oldBatch.appliedToInventory) {
        // Revert old quantities
        oldBatch.producedFlavors.forEach(pf => {
          newInventory[pf.flavorId] = (newInventory[pf.flavorId] || 0) - pf.quantity;
        });
        // Add new quantities
        updatedBatch.producedFlavors.forEach(pf => {
          newInventory[pf.flavorId] = (newInventory[pf.flavorId] || 0) + pf.quantity;
        });
      }

      const updatedBatches = productionBatches.map(b => b.id === editingBatchId ? updatedBatch : b);
      
      setFullState({
        productionBatches: updatedBatches,
        inventory: newInventory
      });
    } else {
      const newBatch: ProductionBatch = {
        id: `batch-${Date.now()}`,
        date: batchDate,
        ingredients: ingredients.filter(ing => ing.name.trim() !== '' && ing.cost > 0),
        producedFlavors,
        notes: batchNotes.trim() || undefined,
        appliedToInventory: false
      };

      setFullState({
        productionBatches: [newBatch, ...productionBatches]
      });
    }

    // Reset Form
    setEditingBatchId(null);
    setBatchDate(new Date().toISOString().split('T')[0]);
    setBatchNotes('');
    setIngredients([
      { name: 'Sữa tươi & Sữa đặc', cost: 0 },
      { name: 'Men cái', cost: 0 },
      { name: 'Whipping cream', cost: 0 },
      { name: 'Hũ nhựa & Bao bì', cost: 0 },
      { name: 'Điện, nước, gas', cost: 0 }
    ]);
    const cleared: Record<string, number> = {};
    baseFlavors.forEach(f => { cleared[f.id] = 0; });
    setProducedQuantities(cleared);
    
    setShowAddBatch(false);
  };

  // Add produced amounts to Active Inventory
  const handleApplyToInventory = (batchId: string) => {
    const batch = productionBatches.find(b => b.id === batchId);
    if (!batch || batch.appliedToInventory) return;

    const newInventory = { ...inventory };
    batch.producedFlavors.forEach(pf => {
      newInventory[pf.flavorId] = (newInventory[pf.flavorId] || 0) + pf.quantity;
    });

    const updatedBatches = productionBatches.map(b => 
      b.id === batchId ? { ...b, appliedToInventory: true } : b
    );

    setFullState({
      inventory: newInventory,
      productionBatches: updatedBatches
    });
  };

  // Delete production batch
  const handleDeleteBatch = (batchId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa đợt làm này không?')) {
      const updatedBatches = productionBatches.filter(b => b.id !== batchId);
      setFullState({ productionBatches: updatedBatches });
      if (expandedBatchId === batchId) {
        setExpandedBatchId(null);
      }
    }
  };

  const COLORS = ['#f472b6', '#fb923c', '#a78bfa', '#34d399', '#60a5fa', '#fbbf24'];

  return (
    <div className="p-6 flex flex-col h-full bg-white relative overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#5C3D3D]">Báo cáo & Phân tích</h2>
      </div>

      {/* Primary Sub-tab switcher */}
      <div className="flex border-b border-gray-100 mb-6">
        <button 
          onClick={() => setSubTab('general')}
          className={`py-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            subTab === 'general' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <span>📊</span> Báo cáo chung
        </button>
        <button 
          onClick={() => setSubTab('batches')}
          className={`py-3 px-4 font-bold text-sm border-b-2 transition-all flex items-center gap-2 ${
            subTab === 'batches' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-400 hover:text-gray-600'
          }`}
        >
          <span>🧪</span> Đợt làm & Lợi nhuận
        </button>
      </div>

      {subTab === 'general' ? (
        <>
          {/* Filters */}
          <div className="mb-6 flex items-center justify-between">
            <h3 className="font-bold text-[#5C3D3D]">Thống kê theo ngày giao</h3>
            <div className="relative">
              <select
                value={reportDateFilter}
                onChange={e => setReportDateFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-200 text-[#5C3D3D] text-sm rounded-xl pl-4 pr-10 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all shadow-sm"
              >
                <option value="all">Tất cả thời gian</option>
                {availableDates.map(date => {
                   const formattedDate = new Date(date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
                   return <option key={date} value={date}>{formattedDate}</option>;
                })}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
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
          {stats.chartData.length > 0 ? (
             <div className="bg-pink-50 p-6 rounded-3xl border border-pink-100 mb-6">
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
                     <Tooltip formatter={(value) => [`${value} hũ`, 'Số lượng']} />
                     <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                   </PieChart>
                 </ResponsiveContainer>
               </div>
             </div>
          ) : (
             <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
               <p className="text-gray-400 font-medium text-sm">Chưa có dữ liệu bán chạy trong đợt này</p>
             </div>
          )}
        </>
      ) : (
        <>
          {/* Batches view */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-[#5C3D3D] uppercase tracking-wider">Lịch sử đợt làm sữa chua</h3>
            <button
              onClick={() => setShowAddBatch(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-pink-500 rounded-xl hover:bg-pink-600 active:scale-95 transition-all shadow-md shadow-pink-100 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Đợt làm mới
            </button>
          </div>

          {productionBatches.length === 0 ? (
            <div className="text-center py-16 px-6 bg-pink-50/40 rounded-[2rem] border border-dashed border-pink-200 flex flex-col items-center">
              <span className="text-4xl mb-4">🧪</span>
              <h4 className="text-base font-bold text-[#5C3D3D] mb-1">Chưa có đợt làm nào</h4>
              <p className="text-xs text-gray-500 max-w-sm leading-relaxed mb-6">
                Lưu lại thông tin nguyên liệu & sản lượng từng đợt làm để hệ thống tính toán chi tiết lợi nhuận, chi phí trung bình và tự động cộng dồn kho.
              </p>
              <button
                onClick={() => setShowAddBatch(true)}
                className="px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white font-bold text-xs rounded-xl shadow-lg shadow-pink-100"
              >
                Ghi nhận đợt làm đầu tiên
              </button>
            </div>
          ) : (
            <div className="grid gap-4 mb-6">
              {productionBatches.map(batch => {
                const totalBatchCost = batch.ingredients.reduce((sum, ing) => sum + ing.cost, 0);
                let totalBatchJars = 0;
                let batchRevenue = 0;

                batch.producedFlavors.forEach(pf => {
                  const flavor = flavors.find(f => f.id === pf.flavorId);
                  const price = flavor ? (flavor.price || (flavor.id === 'f-phomai' ? 12000 : (flavor.id === 'f-nepcam' ? 11000 : (flavor.id === 'f-truyenthong' ? 10000 : 11000)))) : 11000;
                  totalBatchJars += pf.quantity;
                  batchRevenue += pf.quantity * price;
                });

                const batchProfit = batchRevenue - totalBatchCost;
                const batchMargin = batchRevenue > 0 ? (batchProfit / batchRevenue) * 100 : 0;
                const isExpanded = expandedBatchId === batch.id;

                return (
                  <div 
                    key={batch.id} 
                    className="bg-white border border-pink-100/80 rounded-2xl hover:border-pink-200 transition-all shadow-sm overflow-hidden"
                  >
                    {/* Header summary row */}
                    <div 
                      onClick={() => setExpandedBatchId(isExpanded ? null : batch.id)}
                      className="p-4 sm:p-5 flex justify-between items-center cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#5C3D3D]">{safeDate(batch.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                          <p className="text-[11px] text-gray-500 font-medium">Sản lượng: {totalBatchJars} hũ</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className={`text-sm font-black ${batchProfit >= 0 ? 'text-purple-600' : 'text-red-500'}`}>
                            {batchProfit >= 0 ? '+' : ''}{formatVND(batchProfit)}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold">Lợi nhuận</p>
                        </div>

                        <div className="text-gray-400">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Detailed expandable section */}
                    {isExpanded && (
                      <div className="border-t border-pink-50 bg-pink-50/10 p-5 animate-in fade-in slide-in-from-top-1">
                        {batch.notes && (
                          <div className="mb-4 bg-yellow-50/50 border border-yellow-100 p-3 rounded-xl">
                            <p className="text-xs text-yellow-800 font-medium leading-relaxed">
                              📝 <strong className="text-yellow-900">Ghi chú:</strong> {batch.notes}
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          {/* Left: Ingredients */}
                          <div>
                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Coins className="w-3.5 h-3.5 text-pink-500" /> Chi phí nguyên liệu ({formatVND(totalBatchCost)})
                            </h5>
                            <div className="bg-white border border-pink-50 rounded-xl overflow-hidden shadow-xs">
                              {batch.ingredients.length === 0 ? (
                                <p className="p-3 text-xs text-gray-400 text-center italic">Không ghi nhận chi phí</p>
                              ) : (
                                <div className="divide-y divide-pink-50/50">
                                  {batch.ingredients.map((ing, idx) => (
                                    <div key={idx} className="flex justify-between p-2.5 text-xs">
                                      <span className="font-semibold text-gray-700">{ing.name}</span>
                                      <span className="font-bold text-[#5C3D3D]">{formatVND(ing.cost)}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Produced Flavors */}
                          <div>
                            <h5 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-pink-500" /> Sản lượng chi tiết ({totalBatchJars} hũ)
                            </h5>
                            <div className="bg-white border border-pink-50 rounded-xl overflow-hidden shadow-xs">
                              <div className="divide-y divide-pink-50/50">
                                {batch.producedFlavors.map((pf, idx) => {
                                  const flavObj = flavors.find(f => f.id === pf.flavorId);
                                  const name = flavObj?.name || pf.flavorId;
                                  const price = flavObj ? (flavObj.price || (flavObj.id === 'f-phomai' ? 12000 : (flavObj.id === 'f-nepcam' ? 11000 : (flavObj.id === 'f-truyenthong' ? 10000 : 11000)))) : 11000;
                                  return (
                                    <div key={idx} className="flex justify-between p-2.5 text-xs">
                                      <div>
                                        <span className="font-bold text-gray-800">{name}</span>
                                        <span className="ml-1.5 text-gray-400 font-medium">({pf.quantity} hũ)</span>
                                      </div>
                                      <span className="font-semibold text-gray-500">{formatVND(pf.quantity * price)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Batch metrics row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-pink-50/30 border border-pink-50 rounded-2xl mb-5">
                          <div className="text-center sm:text-left">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Doanh thu dự kiến</span>
                            <p className="text-sm font-bold text-gray-800 mt-0.5">{formatVND(batchRevenue)}</p>
                          </div>
                          <div className="text-center sm:text-left border-l border-pink-100/50 pl-0 sm:pl-4">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Tỷ suất LN</span>
                            <p className="text-sm font-bold text-purple-600 mt-0.5 flex items-center justify-center sm:justify-start gap-0.5">
                              <Percent className="w-3.5 h-3.5" />
                              {batchMargin.toFixed(1)}%
                            </p>
                          </div>
                          <div className="text-center sm:text-left border-l border-pink-100/50 pl-0 sm:pl-4">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Giá vốn / Hũ</span>
                            <p className="text-sm font-bold text-orange-600 mt-0.5">
                              {formatVND(totalBatchJars > 0 ? Math.round(totalBatchCost / totalBatchJars) : 0)}
                            </p>
                          </div>
                          <div className="text-center sm:text-left border-l border-pink-100/50 pl-0 sm:pl-4">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Trạng thái kho</span>
                            <span className={`inline-flex items-center gap-1 text-xs font-bold mt-1 px-2 py-0.5 rounded-full ${
                              batch.appliedToInventory ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {batch.appliedToInventory ? 'Đã nhập kho' : 'Chờ nhập kho'}
                            </span>
                          </div>
                        </div>

                        {/* Expandable row actions */}
                        <div className="flex flex-wrap gap-3 justify-between items-center pt-3 border-t border-pink-50/60">
                          <div className="flex gap-4">
                            <button
                              type="button"
                              onClick={() => handleEditBatch(batch)}
                              className="flex items-center gap-1 text-xs text-blue-500 font-bold hover:text-blue-600 cursor-pointer active:scale-95 transition-all"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Sửa đợt làm
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteBatch(batch.id, e)}
                              className="flex items-center gap-1 text-xs text-red-500 font-bold hover:text-red-600 cursor-pointer active:scale-95 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Xóa
                            </button>
                          </div>

                          <div className="flex gap-2">
                            {!batch.appliedToInventory ? (
                              <button
                                type="button"
                                onClick={() => handleApplyToInventory(batch.id)}
                                className="flex items-center gap-1.5 px-3.5 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-xl shadow-md shadow-green-100 cursor-pointer active:scale-95 transition-all"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Cập nhật vào kho
                              </button>
                            ) : (
                              <span className="text-xs text-green-600 font-bold flex items-center gap-1 py-2 px-3 bg-green-50 rounded-xl">
                                ✓ Đã cập nhật cộng dồn kho
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Production Batch Creator Modal */}
      {showAddBatch && (
        <div className="fixed inset-0 bg-[#FFF9F0]/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <form 
            onSubmit={handleSaveBatch}
            className="bg-white w-full sm:max-w-xl rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 animate-in slide-in-from-bottom max-h-[90vh] overflow-y-auto shadow-2xl border-t-8 sm:border-8 border-white flex flex-col"
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-black text-[#5C3D3D]">{editingBatchId ? '✏️ Cập nhật Đợt Làm' : '🧪 Tạo Đợt Làm Sữa Chua'}</h3>
              <button 
                type="button" 
                onClick={() => {
                  setShowAddBatch(false);
                  setEditingBatchId(null);
                  setBatchDate(new Date().toISOString().split('T')[0]);
                  setBatchNotes('');
                  setIngredients([
                    { name: 'Sữa tươi & Sữa đặc', cost: 0 },
                    { name: 'Men cái', cost: 0 },
                    { name: 'Whipping cream', cost: 0 },
                    { name: 'Hũ nhựa & Bao bì', cost: 0 },
                    { name: 'Điện, nước, gas', cost: 0 }
                  ]);
                  const cleared: Record<string, number> = {};
                  baseFlavors.forEach(f => { cleared[f.id] = 0; });
                  setProducedQuantities(cleared);
                }}
                className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 font-bold cursor-pointer hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 flex-1 pr-1">
              {/* Batch Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ngày làm</label>
                  <input 
                    type="date" 
                    required
                    value={batchDate} 
                    onChange={e => setBatchDate(e.target.value)}
                    className="w-full border border-pink-100 rounded-2xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-pink-300 font-bold bg-pink-50/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Ghi chú (Tùy chọn)</label>
                  <input 
                    type="text" 
                    placeholder="Ví dụ: Đợt làm cuối tuần..."
                    value={batchNotes} 
                    onChange={e => setBatchNotes(e.target.value)}
                    className="w-full border border-pink-100 rounded-2xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:border-pink-300 font-medium bg-pink-50/20"
                  />
                </div>
              </div>

              {/* Dynamic Ingredients list */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                    💰 Chi phí nguyên liệu đợt này
                  </label>
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="text-xs font-bold text-pink-500 hover:text-pink-600 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Thêm dòng
                  </button>
                </div>
                
                <div className="bg-pink-50/30 p-4 rounded-3xl border border-pink-100 space-y-3 max-h-48 overflow-y-auto">
                  {ingredients.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">Chưa có chi phí nào. Nhấn thêm dòng để ghi nhận!</p>
                  ) : (
                    ingredients.map((ing, idx) => (
                      <div key={idx} className="flex gap-2 items-center">
                        <input 
                          type="text"
                          required
                          placeholder="Tên nguyên liệu..."
                          value={ing.name}
                          onChange={e => handleUpdateIngredient(idx, 'name', e.target.value)}
                          className="flex-1 border border-pink-100 bg-white rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-pink-300 font-semibold"
                        />
                        <div className="relative w-32">
                          <input 
                            type="number"
                            required
                            min="0"
                            placeholder="0"
                            value={ing.cost || ''}
                            onChange={e => handleUpdateIngredient(idx, 'cost', e.target.value)}
                            className="w-full border border-pink-100 bg-white rounded-xl pl-3 pr-8 py-2 text-xs text-gray-700 focus:outline-none focus:border-pink-300 font-bold text-right"
                          />
                          <span className="absolute right-2.5 top-2.5 text-[10px] text-gray-400 font-bold">đ</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveIngredient(idx)}
                          className="p-1.5 text-red-400 hover:text-red-500 rounded-lg hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Produced flavors quantities */}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  📦 Sản lượng hũ sữa chua làm được
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                  {baseFlavors.map(flavor => {
                    const price = flavor.price || (flavor.id === 'f-phomai' ? 12000 : (flavor.id === 'f-nepcam' ? 11000 : (flavor.id === 'f-truyenthong' ? 10000 : 11000)));
                    const qty = producedQuantities[flavor.id] || 0;
                    return (
                      <div 
                        key={flavor.id} 
                        className="bg-white border border-gray-100 rounded-2xl p-3 flex justify-between items-center shadow-xs hover:border-pink-100 transition-all"
                      >
                        <div>
                          <p className="text-xs font-black text-gray-700">{flavor.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold mt-0.5">Giá bán: {formatVND(price)}</p>
                          {qty > 0 && (
                            <p className="text-[10px] text-pink-500 font-extrabold mt-0.5">
                              Doanh thu: {formatVND(qty * price)}
                            </p>
                          )}
                        </div>

                        {/* Custom spinner */}
                        <div className="flex items-center gap-1 border border-pink-100 bg-pink-50/10 rounded-xl p-1">
                          <button
                            type="button"
                            onClick={() => handleQtyChange(flavor.id, -1)}
                            className="w-6 h-6 rounded-lg bg-white shadow-xs border border-pink-100 flex items-center justify-center text-xs font-extrabold text-[#5C3D3D] cursor-pointer hover:bg-pink-50 active:scale-90 transition-all"
                          >
                            -
                          </button>
                          <input 
                            type="text"
                            value={qty}
                            onChange={e => handleQtyInput(flavor.id, e.target.value)}
                            className="w-8 text-center text-xs font-black text-[#5C3D3D] bg-transparent focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleQtyChange(flavor.id, 1)}
                            className="w-6 h-6 rounded-lg bg-white shadow-xs border border-pink-100 flex items-center justify-center text-xs font-extrabold text-[#5C3D3D] cursor-pointer hover:bg-pink-50 active:scale-90 transition-all"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Real-time Profitability Calculator Panel */}
              <div className="bg-[#FFFDF9] border-2 border-dashed border-amber-200/60 rounded-3xl p-5 space-y-3">
                <h4 className="text-xs font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1.5">
                  ✨ Ước tính lợi nhuận đợt làm
                </h4>
                
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-400 font-medium">Tổng vốn nguyên liệu:</span>
                    <p className="text-sm font-bold text-[#5C3D3D] mt-0.5">
                      {formatVND(formCalculations.totalIngredientCost)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium">Sản phẩm làm ra:</span>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">
                      {formCalculations.totalJars} hũ
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium">Tổng giá trị bán ra:</span>
                    <p className="text-sm font-bold text-gray-800 mt-0.5">
                      {formatVND(formCalculations.expectedRevenue)}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-400 font-medium">Giá vốn bình quân:</span>
                    <p className="text-sm font-bold text-orange-600 mt-0.5">
                      {formatVND(Math.round(formCalculations.averageCostPerJar))}/hũ
                    </p>
                  </div>
                </div>

                <div className="border-t border-amber-200/40 pt-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Lợi nhuận dự kiến</span>
                    <p className="text-lg font-black text-purple-800">
                      {formatVND(formCalculations.expectedProfit)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Tỷ suất lợi nhuận</span>
                    <p className="text-lg font-black text-purple-700">
                      {formCalculations.profitMargin.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex gap-4 mt-6 pt-4 border-t border-gray-100">
              <button 
                type="button" 
                onClick={() => {
                  setShowAddBatch(false);
                  setEditingBatchId(null);
                  setBatchDate(new Date().toISOString().split('T')[0]);
                  setBatchNotes('');
                  setIngredients([
                    { name: 'Sữa tươi & Sữa đặc', cost: 0 },
                    { name: 'Men cái', cost: 0 },
                    { name: 'Whipping cream', cost: 0 },
                    { name: 'Hũ nhựa & Bao bì', cost: 0 },
                    { name: 'Điện, nước, gas', cost: 0 }
                  ]);
                  const cleared: Record<string, number> = {};
                  baseFlavors.forEach(f => { cleared[f.id] = 0; });
                  setProducedQuantities(cleared);
                }}
                className="flex-1 py-3.5 text-gray-500 font-bold bg-gray-50 hover:bg-gray-100 rounded-2xl active:scale-95 transition text-sm cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                className="flex-1 py-3.5 text-white font-bold bg-pink-500 hover:bg-pink-600 rounded-2xl shadow-lg shadow-pink-200 active:scale-95 transition text-sm cursor-pointer"
              >
                {editingBatchId ? 'Cập nhật' : 'Lưu đợt làm'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
