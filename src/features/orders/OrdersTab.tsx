import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store';
import { formatVND, safeDate } from '../../utils';
import { Plus, Package, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { OrderItem } from '../../types';

export default function OrdersTab() {
  const { orders, flavors, addOrder, updateOrderStatus } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'delivered' | 'cancelled'>('all');

  // Form State
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  
  // orderItems stores qty per flavor id
  const [orderItems, setOrderItems] = useState<Record<string, number>>({});

  const handleQtyChange = (flavorId: string, delta: number) => {
    setOrderItems(prev => {
      const current = prev[flavorId] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const copy = { ...prev };
        delete copy[flavorId];
        return copy;
      }
      return { ...prev, [flavorId]: next };
    });
  };

  const calculateTotal = () => {
    return Object.entries(orderItems).reduce((sum, [fId, qty]) => {
      const flavor = flavors.find(f => f.id === fId);
      return sum + (flavor?.pricePerSet || 0) * (qty as number);
    }, 0);
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (Object.keys(orderItems).length === 0) {
      setErrorMsg('Vui lòng chọn ít nhất 1 món.');
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    const items: OrderItem[] = Object.entries(orderItems).map(([flavorId, qty]) => ({
      flavorId,
      quantitySets: qty as number
    }));

    const result = addOrder({
      customerName,
      phone,
      address,
      deliveryDate: `${deliveryDate}T${deliveryTime || '00:00'}`,
      totalPrice: calculateTotal(),
      status: 'pending',
      items
    });

    if (!result.success) {
      setErrorMsg(result.error || 'Lỗi không xác định khi tạo đơn');
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    // Success
    setShowAdd(false);
    setCustomerName('');
    setPhone('');
    setAddress('');
    setDeliveryDate('');
    setDeliveryTime('');
    setOrderItems({});
  };

  const filteredOrders = orders.filter(order => {
    if (statusFilter === 'all') return true;
    return order.status === statusFilter;
  }).sort((a, b) => {
    const timeA = new Date(a.deliveryDate).getTime();
    const timeB = new Date(b.deliveryDate).getTime();
    return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
  });

  let lastDateStr = '';

  return (
    <div className="p-6 flex flex-col h-full bg-white relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#5C3D3D]">Đơn hàng mới nhất</h2>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-pink-50 text-pink-500 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1 active:bg-pink-100 transition"
        >
          <Plus size={16} /> Tạo đơn
        </button>
      </div>

      <div className="flex shrink-0 gap-2 mb-4 bg-pink-50 p-1.5 rounded-2xl">
        {[
          { id: 'pending', label: 'Đang làm', count: orders.filter(o => o.status === 'pending').length },
          { id: 'delivered', label: 'Hoàn thành', count: orders.filter(o => o.status === 'delivered').length },
          { id: 'cancelled', label: 'Đã huỷ', count: orders.filter(o => o.status === 'cancelled').length },
          { id: 'all', label: 'Tất cả', count: orders.length },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setStatusFilter(f.id as any)}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 text-center text-[11px] sm:text-xs font-bold rounded-xl transition-colors ${
              statusFilter === f.id ? 'bg-white shadow-sm text-pink-500' : 'text-pink-400 hover:text-pink-500'
            }`}
          >
            <span>{f.label}</span>
            <span className={`text-[9px] px-1.5 py-0.5 mt-0.5 rounded-full leading-none ${
              statusFilter === f.id ? 'bg-pink-100 text-pink-600' : 'bg-pink-100/50 text-pink-500'
            }`}>
              {f.count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto pb-4 space-y-4">
        {filteredOrders.length === 0 ? (
           <div className="text-center text-pink-300 mt-10">
             <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
             <p className="font-medium">Chưa có đơn hàng nào</p>
           </div>
        ) : (
          filteredOrders.map(order => {
            const orderDateObj = safeDate(order.deliveryDate);
            const isInvalid = isNaN(orderDateObj.getTime());
            const dateStr = isInvalid ? 'Không xác định' : new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short' }).format(orderDateObj);
            const showDivider = dateStr !== lastDateStr;
            lastDateStr = dateStr;

            return (
              <React.Fragment key={order.id}>
                {showDivider && (
                  <div className="flex items-center gap-3 my-2 opacity-60">
                    <div className="flex-1 h-px bg-pink-200"></div>
                    <span className="text-xs font-bold text-pink-400">{dateStr}</span>
                    <div className="flex-1 h-px bg-pink-200"></div>
                  </div>
                )}
                <div className={`bg-white border-2 border-pink-50 p-5 rounded-3xl flex flex-col gap-3 ${order.status === 'cancelled' ? 'opacity-60' : ''}`}>
                  <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm ${order.status === 'delivered' ? 'bg-green-100 text-green-600' : order.status === 'cancelled' ? 'bg-gray-100 text-gray-500' : 'bg-yellow-100 text-yellow-600'}`}>
                    {order.status === 'delivered' ? '✅' : order.status === 'cancelled' ? '❌' : '🛵'}
                  </div>
                  <div>
                    <h3 className="font-bold text-[#5C3D3D] text-base">{order.customerName}</h3>
                    <p className="text-xs text-gray-400 font-medium">{order.phone}</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                     order.status === 'delivered' ? 'bg-green-100 text-green-600' :
                     order.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
                     'bg-blue-100 text-blue-600'
                  }`}>
                    {order.status === 'delivered' ? 'Hoàn thành' : order.status === 'cancelled' ? 'Đã huỷ' : 'Đang làm'}
                  </span>
                  <p className="font-black text-pink-500">{formatVND(order.totalPrice)}</p>
                </div>
              </div>
              
              <div className="text-sm text-[#4A3732] space-y-1 bg-pink-50/50 p-3 rounded-2xl border border-pink-50">
                <p className="font-medium text-xs text-gray-500">📍 <span className="text-[#4A3732]">{order.address}</span></p>
                <p className="font-medium text-xs text-gray-500">⏰ <span className="text-[#4A3732]">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(safeDate(order.deliveryDate))}</span></p>
                <div className="mt-2 pt-2 border-t border-pink-100/50 border-dashed">
                  {order.items.map(item => {
                    const f = flavors.find(f => f.id === item.flavorId);
                    return <p key={item.flavorId} className="font-medium">• {f?.name}: <b>{item.quantitySets} set</b></p>;
                  })}
                </div>
              </div>

              {order.status === 'pending' && (
                 <div className="flex gap-2 justify-end mt-2">
                   <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="px-4 py-2 bg-gray-50 border border-gray-100 text-gray-500 font-bold text-xs rounded-xl active:bg-gray-100">
                      Từ chối
                   </button>
                   <button onClick={() => updateOrderStatus(order.id, 'delivered')} className="px-4 py-2 bg-green-50 border border-green-100 text-green-600 font-bold text-xs rounded-xl active:bg-green-100">
                      Hoàn thành
                   </button>
                 </div>
              )}
            </div>
          </React.Fragment>
          );
        })
        )}
      </div>

      {showAdd && (
        <div className="absolute inset-0 bg-white z-20 flex flex-col animate-in slide-in-from-bottom h-[100dvh] sm:h-full overflow-hidden sm:rounded-[2.5rem]">
          <div className="flex items-center px-6 py-5 border-b-2 border-pink-50 bg-white shadow-sm">
            <h3 className="flex-1 text-xl font-black text-[#5C3D3D] text-center tracking-tight">Tạo đơn hàng mới</h3>
          </div>
          
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-[#FFF9F0]">
             {errorMsg && (
                <div ref={errorRef} className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold border border-red-100">
                  {errorMsg}
                </div>
             )}

             <section>
                <h4 className="font-bold text-[#5C3D3D] mb-3 text-base">Thông tin khách hàng</h4>
                <div className="space-y-3">
                  <input type="text" placeholder="Tên khách hàng" required value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full border-2 border-pink-100 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-0 focus:border-pink-400 outline-none font-medium placeholder-pink-200" />
                  <input type="tel" inputMode="tel" placeholder="Số điện thoại" required value={phone} onChange={e => setPhone(e.target.value)} className="w-full border-2 border-pink-100 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-0 focus:border-pink-400 outline-none font-medium placeholder-pink-200" />
                  <input type="text" placeholder="Địa chỉ giao hàng" required value={address} onChange={e => setAddress(e.target.value)} className="w-full border-2 border-pink-100 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-0 focus:border-pink-400 outline-none font-medium placeholder-pink-200" />
                  <div className="flex gap-3">
                    <input type="date" lang="en-GB" required value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="flex-1 border-2 border-pink-100 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-0 focus:border-pink-400 outline-none font-medium text-[#4A3732]" />
                    <input type="time" required value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} className="flex-1 border-2 border-pink-100 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-0 focus:border-pink-400 outline-none font-medium text-[#4A3732]" />
                  </div>
                </div>
             </section>

             <section>
                <h4 className="font-bold text-[#5C3D3D] mb-3 text-base">Chọn món (Set 5 hũ)</h4>
                <div className="space-y-3">
                  {flavors.map(flavor => {
                     const qty = orderItems[flavor.id] || 0;
                     return (
                       <div key={flavor.id} className="flex items-center justify-between bg-white p-3 border-2 border-pink-50 rounded-xl shadow-sm">
                         <div>
                            <p className="font-bold text-[#5C3D3D] text-sm">{flavor.name}</p>
                            <p className="text-pink-500 font-bold text-xs mt-0.5">{formatVND(flavor.pricePerSet)}/set</p>
                         </div>
                         <div className="flex items-center gap-3">
                            <button type="button" onClick={() => handleQtyChange(flavor.id, -1)} disabled={qty === 0} className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg shadow-sm transition ${qty === 0 ? 'bg-gray-50 text-gray-300' : 'bg-pink-100 text-pink-600 active:bg-pink-200'}`}>-</button>
                            <span className="w-5 text-center font-black text-base text-[#5C3D3D]">{qty}</span>
                            <button type="button" onClick={() => handleQtyChange(flavor.id, 1)} className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-lg bg-pink-400 text-white shadow-sm active:bg-pink-500 transition">+</button>
                         </div>
                       </div>
                     )
                  })}
                </div>
             </section>
          </div>

          <div className="p-4 bg-white border-t-2 border-pink-50 pb-safe shadow-[0_-10px_30px_rgba(252,231,243,0.4)]">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-pink-400">Tổng tiền:</span>
              <span className="text-xl font-black text-[#5C3D3D]">{formatVND(calculateTotal())}</span>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-3 text-sm text-pink-500 font-bold bg-pink-50 rounded-xl active:bg-pink-100 transition">Hủy</button>
              <button type="button" onClick={handleCreateOrder} className="flex-1 py-3 text-sm text-white font-bold bg-pink-400 rounded-xl shadow-lg shadow-pink-200 active:opacity-90 transition">Lưu Đơn Hàng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
