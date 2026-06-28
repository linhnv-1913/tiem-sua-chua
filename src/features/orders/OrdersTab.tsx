import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store';
import { formatVND, safeDate } from '../../utils';
import { Plus, Package, Clock, CheckCircle2, XCircle, Download, X } from 'lucide-react';
import { OrderItem, Order } from '../../types';
import { toPng } from 'html-to-image';

import { qrBase64 } from './qrBase64';

export default function OrdersTab() {
  const { orders, flavors, addOrder, updateOrder, updateOrderStatus, markOrderBilled } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'delivered' | 'cancelled'>('pending');
  const [billOrder, setBillOrder] = useState<Order | null>(null);

  // Form State
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const billRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [shippingFee, setShippingFee] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryTime, setDeliveryTime] = useState('');
  
  // orderItems stores qty per flavor id
  const [orderItems, setOrderItems] = useState<Record<string, number>>({});
  const [selectedGiftFlavor, setSelectedGiftFlavor] = useState<string>('f-truyenthong');

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
    let sum = 0;
    let totalJars = 0;
    Object.entries(orderItems).forEach(([fId, qty]) => {
      const flavor = flavors.find(f => f.id === fId);
      const numericQty = parseInt(String(qty), 10) || 0;
      if (numericQty > 0) {
        // Fallback price if flavor isn't found or has no price
        let fPrice = flavor?.price;
        if (!fPrice) {
          if (flavor?.isMix) fPrice = 55000;
          else fPrice = fId === 'f-phomai' ? 12000 : (fId === 'f-nepcam' ? 11000 : (fId === 'f-truyenthong' ? 10000 : 11000));
        }
        sum += fPrice * numericQty;
        totalJars += numericQty * (flavor?.isMix ? 5 : 1);
      }
    });

    if (totalJars >= 5 && totalJars < 10) {
      sum -= 5000;
    }

    const ship = parseInt(shippingFee.replace(/\D/g, ''), 10) || 0;
    if (totalJars < 20) {
      sum += ship;
    }

    return Math.max(0, sum);
  };

  const handleSaveOrder = (e: React.FormEvent) => {
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
      quantity: parseInt(String(qty), 10) || 0
    })).filter(i => i.quantity > 0);

    const totalJars = items.reduce((sum, item) => {
      const flavor = flavors.find(f => f.id === item.flavorId);
      return sum + item.quantity * (flavor?.isMix ? 5 : 1);
    }, 0);
    const currentShippingFee = parseInt(shippingFee.replace(/\D/g, ''), 10) || 0;
    const giftItems: OrderItem[] = [];
    if (totalJars >= 10 && !(totalJars >= 20 && currentShippingFee > 0)) {
      giftItems.push({ flavorId: selectedGiftFlavor || 'f-truyenthong', quantity: 1 });
    }

    const existingOrder = editingOrderId ? orders.find(o => o.id === editingOrderId) : null;
    const orderPayload = {
      customerName,
      phone,
      address,
      shippingFee: parseInt(shippingFee.replace(/\D/g, ''), 10) || 0,
      deliveryDate: `${deliveryDate}T${deliveryTime || '00:00'}`,
      totalPrice: calculateTotal(),
      items,
      giftItems,
      isBilled: existingOrder ? existingOrder.isBilled : false
    };

    let result;
    if (editingOrderId) {
      result = updateOrder(editingOrderId, orderPayload);
    } else {
      result = addOrder({ ...orderPayload, status: 'pending' });
    }

    if (!result.success) {
      setErrorMsg(result.error || 'Lỗi không xác định khi lưu đơn');
      setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      return;
    }

    // Success
    setShowAdd(false);
    setEditingOrderId(null);
    setCustomerName('');
    setPhone('');
    setAddress('');
    setShippingFee('');
    setDeliveryDate('');
    setDeliveryTime('');
    setOrderItems({});
  };

  const handleEditClick = (order: Order) => {
    setEditingOrderId(order.id);
    setCustomerName(order.customerName);
    setPhone(order.phone);
    setAddress(order.address);
    setShippingFee(order.shippingFee?.toString() || '');
    if (order.deliveryDate) {
      try {
        const [date, time] = order.deliveryDate.split('T');
        setDeliveryDate(date || '');
        setDeliveryTime((time || '').substring(0, 5));
      } catch (e) {
        setDeliveryDate('');
        setDeliveryTime('');
      }
    }
    const editItems: Record<string, number> = {};
    order.items.forEach((item: any) => {
      editItems[item.flavorId] = item.quantity || item.quantitySets || 0; // fallback for old orders
    });
    setOrderItems(editItems);
    
    if (order.giftItems && order.giftItems.length > 0) {
      setSelectedGiftFlavor(order.giftItems[0].flavorId);
    } else {
      setSelectedGiftFlavor('f-truyenthong');
    }
    
    setShowAdd(true);
  };

  const downloadBill = async () => {
    if (!billRef.current || !billOrder) return;
    try {
      // iOS Safari workaround: run toPng multiple times to ensure the image is decoded and rendered
      await toPng(billRef.current, { cacheBust: true, backgroundColor: '#FFF9F0', pixelRatio: 2 });
      await new Promise(resolve => setTimeout(resolve, 100)); // slight delay to allow decoding
      const dataUrl = await toPng(billRef.current, { cacheBust: true, backgroundColor: '#FFF9F0', pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = `Bill_${billOrder.customerName}.png`;
      link.href = dataUrl;
      link.click();
      
      if (billOrder.status === 'delivered') {
        markOrderBilled(billOrder.id);
        // Also update local state so the view updates without needing to close and open again, or it closes when we download? Usually let it stay open
        setBillOrder({ ...billOrder, isBilled: true });
      }
    } catch (err) {
      console.error("Lỗi xuất bill", err);
    }
  };

  const openForm = () => {
    setEditingOrderId(null);
    setCustomerName('');
    setPhone('');
    setAddress('');
    setShippingFee('');
    setDeliveryDate('');
    setDeliveryTime('');
    setOrderItems({});
    setSelectedGiftFlavor('f-truyenthong');
    setShowAdd(true);
  };

  const filteredOrders = orders.filter(order => {
    if (statusFilter === 'all') return true;
    return order.status === statusFilter;
  }).sort((a, b) => {
    if (statusFilter === 'delivered') {
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return (isNaN(timeB) ? 0 : timeB) - (isNaN(timeA) ? 0 : timeA);
    }
    const timeA = new Date(a.deliveryDate).getTime();
    const timeB = new Date(b.deliveryDate).getTime();
    return (isNaN(timeA) ? 0 : timeA) - (isNaN(timeB) ? 0 : timeB);
  });

  let lastDateStr = '';

  const formTotalJars = Object.entries(orderItems).reduce((sum, [fId, qty]) => {
    const f = flavors.find(flavor => flavor.id === fId);
    return sum + (parseInt(String(qty), 10) || 0) * (f?.isMix ? 5 : 1);
  }, 0);

  return (
    <div className="p-6 flex flex-col h-full bg-white relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#5C3D3D]">Đơn hàng mới nhất</h2>
        <button 
          onClick={openForm}
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
                     order.status === 'delivered' ? (order.isBilled ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-600') :
                     order.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
                     'bg-blue-100 text-blue-600'
                  }`}>
                    {order.status === 'delivered' ? (order.isBilled ? 'Đã xuất bill' : 'Hoàn thành') : order.status === 'cancelled' ? 'Đã huỷ' : 'Đang làm'}
                  </span>
                  <p className="font-black text-pink-500">{formatVND(order.totalPrice)}</p>
                </div>
              </div>
              
              <div className="text-sm text-[#4A3732] space-y-1 bg-pink-50/50 p-3 rounded-2xl border border-pink-50">
                <p className="font-medium text-xs text-gray-500">📍 <span className="text-[#4A3732]">{order.address}</span></p>
                <p className="font-medium text-xs text-gray-500">⏰ <span className="text-[#4A3732]">{new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(safeDate(order.deliveryDate))}</span></p>
                <div className="mt-2 pt-2 border-t border-pink-100/50 border-dashed">
                  {order.items.map((item: any) => {
                    const f = flavors.find(f => f.id === item.flavorId);
                    return <p key={item.flavorId} className="font-medium">• {f?.name || 'Vị khác'}: <b className="text-[#5C3D3D]">{item.quantity || item.quantitySets || 0} {f?.isMix ? 'set' : 'hũ'}</b></p>;
                  })}
                  {order.giftItems?.map((item: any) => {
                    const f = flavors.find(f => f.id === item.flavorId);
                    return <p key={`gift-${item.flavorId}`} className="font-medium mt-1 text-indigo-500">• 🎁 Tặng {f?.name || 'Vị khác'}: <b>{item.quantity} {f?.isMix ? 'set' : 'hũ'}</b></p>;
                  })}
                  {!!order.shippingFee && (
                    <p className="font-medium mt-1 text-gray-500">• Phí ship: <b>{formatVND(order.shippingFee)}</b></p>
                  )}
                </div>
              </div>

              {order.status === 'pending' && (
                 <div className="flex gap-2 justify-end mt-2">
                   <button onClick={() => updateOrderStatus(order.id, 'cancelled')} className="px-4 py-2 bg-gray-50 border border-gray-100 text-gray-500 font-bold text-xs rounded-xl active:bg-gray-100">
                      Từ chối
                   </button>
                   <button onClick={() => handleEditClick(order)} className="px-4 py-2 bg-blue-50 border border-blue-100 text-blue-600 font-bold text-xs rounded-xl active:bg-blue-100">
                      Chỉnh sửa
                   </button>
                   <button onClick={() => updateOrderStatus(order.id, 'delivered')} className="px-4 py-2 bg-green-50 border border-green-100 text-green-600 font-bold text-xs rounded-xl active:bg-green-100">
                      Hoàn thành
                   </button>
                 </div>
              )}
              {order.status === 'delivered' && (
                 <div className="flex gap-2 justify-end mt-2">
                   <button onClick={() => handleEditClick(order)} className="px-4 py-2 bg-blue-50 border border-blue-100 text-blue-600 font-bold text-xs rounded-xl active:bg-blue-100">
                      Chỉnh sửa
                   </button>
                   <button onClick={() => setBillOrder(order)} className="px-4 py-2 bg-pink-50 border border-pink-100 text-pink-600 font-bold text-xs rounded-xl active:bg-pink-100 flex items-center gap-1">
                      <Download className="w-3 h-3" /> {order.isBilled ? 'Xuất bill lại' : 'Xuất bill'}
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
        <div className="absolute inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-bottom h-full overflow-hidden rounded-[2.5rem]">
          <div className="flex items-center justify-between px-6 py-5 border-b-2 border-pink-50 bg-white shadow-sm relative shrink-0">
            <h3 className="flex-1 text-xl font-black text-[#5C3D3D] text-center tracking-tight">{editingOrderId ? 'Chỉnh sửa đơn hàng' : 'Tạo đơn hàng mới'}</h3>
            <button title="Đóng" onClick={() => setShowAdd(false)} className="absolute right-6 p-2 text-gray-400 active:text-gray-500 hover:bg-gray-50 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
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
                  <input type="text" inputMode="numeric" placeholder="Phí ship (nếu có)" value={shippingFee} onChange={e => {
                    const numStr = e.target.value.replace(/\D/g, '');
                    setShippingFee(numStr ? parseInt(numStr, 10).toLocaleString('vi-VN') : '');
                  }} className="w-full border-2 border-pink-100 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-0 focus:border-pink-400 outline-none font-medium placeholder-pink-200" />
                  <div className="flex gap-3">
                    <input type="date" lang="en-GB" required value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="flex-1 border-2 border-pink-100 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-0 focus:border-pink-400 outline-none font-medium text-[#4A3732]" />
                    <input type="time" required value={deliveryTime} onChange={e => setDeliveryTime(e.target.value)} className="flex-1 border-2 border-pink-100 rounded-xl px-4 py-2.5 text-sm bg-white focus:ring-0 focus:border-pink-400 outline-none font-medium text-[#4A3732]" />
                  </div>
                </div>
             </section>

             <section>
                <h4 className="font-bold text-[#5C3D3D] mb-3 text-base">Chọn món</h4>
                <div className="space-y-3">
                  {flavors.map(flavor => {
                     const qty = orderItems[flavor.id] || 0;
                     return (
                       <div key={flavor.id} className="flex items-center justify-between bg-white p-3 border-2 border-pink-50 rounded-xl shadow-sm">
                         <div>
                            <p className="font-bold text-[#5C3D3D] text-sm">{flavor.name}</p>
                            <p className="text-pink-500 font-bold text-xs mt-0.5">{formatVND(flavor.price || (flavor.isMix ? 55000 : (flavor.id === 'f-phomai' ? 12000 : (flavor.id === 'f-nepcam' ? 11000 : (flavor.id === 'f-truyenthong' ? 10000 : 11000)))))}/{flavor.isMix ? 'set' : 'hũ'}</p>
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
            <div className="flex flex-col mb-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-pink-400">Tổng tiền:</span>
                <span className="text-xl font-black text-[#5C3D3D]">{formatVND(calculateTotal())}</span>
              </div>
              {formTotalJars >= 5 && formTotalJars < 10 && (
                 <div className="text-right mt-1">
                   <p className="text-xs font-bold text-green-500">- Đã giảm 5k (Mua 5 hũ)</p>
                 </div>
              )}
              {formTotalJars >= 10 && !(formTotalJars >= 20 && parseInt(shippingFee.replace(/\D/g, ''), 10) > 0) && (
                 <div className="flex flex-col items-end mt-1 text-right">
                   <p className="text-xs font-bold text-indigo-500 mb-1">🎁 Được tặng 1 hũ (Mua 10 hũ)</p>
                   <select 
                     value={selectedGiftFlavor} 
                     onChange={e => setSelectedGiftFlavor(e.target.value)} 
                     className="max-w-[160px] w-full border border-indigo-100 rounded-lg px-2 py-1 text-xs bg-indigo-50/50 text-indigo-700 outline-none focus:border-indigo-300 font-medium"
                   >
                     {flavors.filter(f => !f.isMix).map(f => (
                       <option key={`gift-${f.id}`} value={f.id}>{f.name}</option>
                     ))}
                   </select>
                 </div>
              )}
              {formTotalJars >= 20 && (
                 <div className="text-right">
                   <p className="text-xs font-bold text-blue-500">🚚 Miễn phí giao hàng (Mua 20 hũ)</p>
                 </div>
              )}
              {formTotalJars < 20 && parseInt(shippingFee.replace(/\D/g, ''), 10) > 0 && (
                 <div className="text-right mt-1">
                   <p className="text-xs font-bold text-gray-500">+ Phí ship: {formatVND(parseInt(shippingFee.replace(/\D/g, ''), 10) || 0)}</p>
                 </div>
              )}
              {formTotalJars >= 20 && parseInt(shippingFee.replace(/\D/g, ''), 10) > 0 && (
                 <div className="text-right mt-1">
                   <p className="text-xs font-bold text-gray-400 line-through decoration-gray-400">+ Phí ship: {formatVND(parseInt(shippingFee.replace(/\D/g, ''), 10) || 0)}</p>
                 </div>
              )}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowAdd(false)} className="px-5 py-3 text-sm text-pink-500 font-bold bg-pink-50 rounded-xl active:bg-pink-100 transition">Hủy</button>
              <button type="button" onClick={handleSaveOrder} className="flex-1 py-3 text-sm text-white font-bold bg-pink-400 rounded-xl shadow-lg shadow-pink-200 active:opacity-90 transition">Lưu Đơn Hàng</button>
            </div>
          </div>
        </div>
      )}

      {billOrder && (
        <div className="absolute inset-0 z-[100] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FFF9F0] w-full max-w-[350px] rounded-[2rem] overflow-hidden flex flex-col max-h-full">
            <div className="flex items-center justify-between px-6 py-4 border-b-2 border-pink-50 bg-white relative shrink-0">
              <h3 className="flex-1 font-bold text-[#5C3D3D] text-center">Xuất Bill</h3>
              <button title="Đóng" onClick={() => setBillOrder(null)} className="absolute right-4 p-2 text-gray-400 active:text-gray-500 hover:bg-gray-50 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col items-center">
              {/* This is the area we are going to capture */}
              <div ref={billRef} className="bg-white p-6 w-full max-w-[300px] shadow-sm border border-gray-100 rounded-3xl flex flex-col items-center">
                 <h2 className="font-black text-pink-500 text-xl tracking-tight mb-2 uppercase">Sữa Chua Vị Nhà</h2>
                 <p className="text-xs text-gray-500 font-medium mb-6 text-center border-b border-dashed border-gray-200 pb-4 w-full">Thơm - Ngon - Béo - Mịn</p>
                 
                 <div className="w-full text-sm text-[#4A3732] space-y-2 mb-6">
                   <p><span className="font-bold">Khách hàng:</span> {billOrder.customerName}</p>
                   {billOrder.phone && (
                      <p><span className="text-gray-500">{billOrder.phone}</span></p>
                   )}
                   <p className="text-xs mt-2 pt-2 border-t border-dashed border-gray-100 flex justify-between">
                     <span className="font-bold">Món</span>
                     <span className="font-bold">SL</span>
                   </p>
                   {billOrder.items.map((item: any) => {
                     const f = flavors.find(f => f.id === item.flavorId);
                     return (
                        <div key={item.flavorId} className="flex justify-between text-xs">
                          <span>{f?.name || 'Vị khác'}</span>
                          <span className="font-bold">{item.quantity || item.quantitySets || 0}</span>
                        </div>
                     );
                   })}
                   {billOrder.giftItems && billOrder.giftItems.length > 0 && billOrder.giftItems.map((item: any) => {
                     const f = flavors.find(f => f.id === item.flavorId);
                     return (
                        <div key={`gift-${item.flavorId}`} className="flex justify-between text-xs text-indigo-500">
                          <span>🎁 Tặng {f?.name || 'Vị khác'}</span>
                          <span className="font-bold">{item.quantity}</span>
                        </div>
                     );
                   })}
                   
                   <div className="pt-2 mt-2 border-t border-dashed border-gray-100 space-y-1 text-right">
                     {(() => {
                       const bTotalJars = billOrder.items.reduce((sum: number, item: any) => {
                         const f = flavors.find(flavor => flavor.id === item.flavorId);
                         return sum + (item.quantity || item.quantitySets || 0) * (f?.isMix ? 5 : 1);
                       }, 0);
                       const shipFee = billOrder.shippingFee || 0;
                        const subtotal = billOrder.items.reduce((sum: number, item: any) => {
                          const f = flavors.find(flavor => flavor.id === item.flavorId);
                          const price = f ? (f.price || (f.isMix ? 55000 : (f.id === 'f-phomai' ? 12000 : (f.id === 'f-nepcam' ? 11000 : (f.id === 'f-truyenthong' ? 10000 : 11000))))) : 0;
                          return sum + (item.quantity || item.quantitySets || 0) * price;
                        }, 0);
                        return (
                          <>
                            {billOrder.items.map((item: any, idx: number) => {
                              const f = flavors.find(flavor => flavor.id === item.flavorId);
                              const price = f ? (f.price || (f.isMix ? 55000 : (f.id === 'f-phomai' ? 12000 : (f.id === 'f-nepcam' ? 11000 : (f.id === 'f-truyenthong' ? 10000 : 11000))))) : 0;
                              return (
                                <div key={`price-${idx}`} className="flex justify-between items-center text-[12px] font-medium text-gray-500 mb-1">
                                  <span>Đơn giá{billOrder.items.length > 1 ? ` (${f?.name || ''})` : ''}</span>
                                  <span>{formatVND(price)}</span>
                                </div>
                              );
                            })}
                            <div className="flex justify-between items-center text-[12px] font-medium text-gray-500 mb-1">
                              <span>Tạm tính</span>
                              <span>{formatVND(subtotal)}</span>
                            </div>
                           {bTotalJars >= 5 && bTotalJars < 10 && (
                             <div className="flex justify-between items-center text-[11px] mb-1">
                               <span className="font-medium text-gray-500">Ưu đãi</span>
                               <span className="font-bold text-green-500">- 5.000đ (Mua 5 hũ)</span>
                             </div>
                           )}
                           {bTotalJars >= 10 && !(bTotalJars >= 20 && shipFee > 0) && (
                             <div className="flex justify-between items-center text-[11px] mb-1">
                               <span className="font-medium text-gray-500">Ưu đãi</span>
                               <span className="font-bold text-indigo-500">🎁 Tặng 1 hũ (Mua 10 hũ)</span>
                             </div>
                           )}
                           {bTotalJars >= 20 && (
                             <div className="flex justify-between items-center text-[11px] mb-1">
                               <span className="font-medium text-gray-500">Ưu đãi</span>
                               <span className="font-bold text-blue-500">🚚 Freeship (Mua 20 hũ)</span>
                             </div>
                           )}
                           {bTotalJars < 20 && shipFee > 0 && (
                             <div className="flex justify-between items-center text-[11px] mb-1">
                               <span className="font-medium text-gray-500">Phí ship</span>
                               <span className="font-bold text-gray-500">{formatVND(shipFee)}</span>
                             </div>
                           )}
                           {bTotalJars >= 20 && shipFee > 0 && (
                             <div className="flex justify-between items-center text-[11px] mb-1">
                               <span className="font-medium text-gray-500">Phí ship</span>
                               <span className="font-bold text-gray-400 line-through decoration-gray-400">{formatVND(shipFee)}</span>
                             </div>
                           )}
                         </>
                       );
                     })()}
                     <div className="flex justify-between items-center mt-2 pt-1 border-t border-dashed border-gray-100">
                       <span className="font-bold text-pink-400 text-sm">Tổng tiền</span>
                       <span className="text-lg font-black text-pink-500">{formatVND(billOrder.totalPrice)}</span>
                     </div>
                   </div>
                 </div>

                 {/* QR Code Layout Match */}
                 <div className="mt-5 w-full max-w-[240px] mx-auto rounded-[20px] bg-gradient-to-br from-[#7e7cdc] via-[#ad60db] to-[#d03fe1] p-[4px] shadow-sm">
                   <div className="bg-gradient-to-br from-[#e9ecf8] to-[#f4dcf4] rounded-[16px] flex flex-col pt-5 pb-6 relative overflow-hidden">
                     {/* QR Code */}
                     <div className="mx-[18px] bg-white rounded-xl p-[12px] flex items-center justify-center shadow-[0_2px_10px_rgba(0,0,0,0.05)]">
                       <img 
                         src={qrBase64} 
                         alt="QR Code" 
                         className="w-[140px] h-[140px] object-contain" 
                       />
                     </div>
                     
                     {/* Logos */}
                     <div className="flex items-center justify-between px-6 mt-4 mb-4">
                       <div className="flex items-center font-black text-[12px] tracking-tighter">
                         <span className="text-[#db3131] text-[16px] mr-[1px]">V</span>
                         <span className="text-[#202773] mt-[2px]">IETQR</span>
                       </div>
                       <div className="flex items-center font-bold text-[12px] italic tracking-tight">
                         <span className="text-[#212776]">napas</span>
                         <span className="text-[#9fc73b] ml-1">247</span>
                       </div>
                     </div>

                     {/* Cutout Separator */}
                     <div className="relative flex items-center justify-center w-full h-[2px] my-1">
                        <div className="absolute left-[-10px] w-[20px] h-[20px] bg-[#986adc] rounded-full"></div>
                        <div className="w-full border-t-[1.5px] border-dashed border-[#cdbbdf] mx-[14px]"></div>
                        <div className="absolute right-[-10px] w-[20px] h-[20px] bg-[#ca46e0] rounded-full"></div>
                     </div>

                     {/* Account Info */}
                     <div className="px-4 pt-5 flex flex-col items-center">
                       <p className="text-[12px] font-medium text-gray-800 tracking-wide uppercase mb-1">TRAN LE THI HOANG NI</p>
                       <p className="text-[14px] font-medium text-gray-900">0041000366292</p>
                     </div>
                   </div>
                 </div>

                 <p className="text-[10px] font-medium text-pink-300 mt-5 text-center">Cảm ơn bạn đã tin tưởng và ủng hộ 💕</p>
              </div>
            </div>
            <div className="p-4 bg-white border-t-2 border-pink-50 text-center">
              <button type="button" onClick={downloadBill} className="w-full py-3 text-sm text-white font-bold bg-pink-500 hover:bg-pink-600 rounded-xl shadow-lg shadow-pink-200 active:opacity-90 transition flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Tải về ảnh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
