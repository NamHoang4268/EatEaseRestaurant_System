import React from 'react';
import { useSelector } from 'react-redux';
import { LayoutDashboard } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import Axios from '../utils/Axios';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiRefreshCw, FiClock, FiWifi, FiWifiOff } from 'react-icons/fi';
import { MdTableRestaurant } from 'react-icons/md';
import { BsBellFill } from 'react-icons/bs';

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8080';

function playChime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        [523, 659, 784].forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.15);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.4);
            osc.start(ctx.currentTime + i * 0.15);
            osc.stop(ctx.currentTime + i * 0.15 + 0.4);
        });
    } catch (_) { /* no-op */ }
}

const WaiterDashboard = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [servingId, setServingId] = useState(null);
    const [connected, setConnected] = useState(false);
    const [clock, setClock] = useState(new Date());

    // Live clock
    useEffect(() => {
        const t = setInterval(() => setClock(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const fetchReadyItems = useCallback(async () => {
        try {
            const res = await Axios({ url: '/api/kitchen/waiter', method: 'GET' });
            if (res.data?.success) setItems(res.data.data);
        } catch {
            toast.error('Không thể tải danh sách món sẵn sàng.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchReadyItems();

        const s = io(SOCKET_URL);
        s.on('connect', () => setConnected(true));
        s.on('disconnect', () => setConnected(false));
        s.emit('waiter:join');

        s.on('dish:ready', (data) => {
            playChime();
            toast(`🍽️ Bàn ${data.tableName} – "${data.productName}" sẵn sàng phục vụ!`, {
                icon: <BsBellFill className="text-amber-500" />,
                duration: 8000,
                style: { border: '2px solid #f59e0b' },
            });
            fetchReadyItems();
        });

        s.on('dish:served', () => fetchReadyItems());

        return () => s.disconnect();
    }, [fetchReadyItems]);

    const markServed = async (orderId, itemId) => {
        setServingId(itemId);
        try {
            await Axios({
                url: `/api/kitchen/item/${orderId}/${itemId}/served`,
                method: 'PATCH',
            });
            setItems((prev) => prev.filter((item) => item._id !== itemId));
            toast.success('Đã phục vụ món! ✅');
        } catch {
            toast.error('Cập nhật thất bại.');
        } finally {
            setServingId(null);
        }
    };

    // Group items by table
    const grouped = items.reduce((acc, item) => {
        const key = item.tableId?.tableNumber || item.tableId?.name || item.tableId?.tableName || 'Không rõ';
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    return (
        <div className="min-h-screen bg-amber-950 text-white">
            {/* Header */}
            <div className="bg-amber-900/80 border-b border-amber-800 px-6 py-4 sticky top-0 z-10">
                <div className="max-w-screen-xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <MdTableRestaurant className="text-amber-400 text-3xl" />
                        <div>
                            <h1 className="text-xl font-bold leading-none">Waiter Board</h1>
                            <p className="text-amber-300/60 text-xs mt-0.5">
                                {clock.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-amber-300">{items.length}</p>
                            <p className="text-xs text-amber-500">Chờ phục vụ</p>
                        </div>
                        <div className="h-8 w-px bg-amber-800" />
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">{Object.keys(grouped).length}</p>
                            <p className="text-xs text-amber-500">Bàn</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${connected ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                            {connected ? <FiWifi size={12} /> : <FiWifiOff size={12} />}
                            {connected ? 'Real-time' : 'Offline'}
                        </div>
                        <button
                            onClick={fetchReadyItems}
                            className="flex items-center gap-2 bg-amber-800 hover:bg-amber-700 px-3 py-2 rounded-xl transition text-sm"
                        >
                            <FiRefreshCw size={14} /> Làm mới
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-screen-xl mx-auto px-6 py-4">
                {loading ? (
                    <div className="flex items-center justify-center h-64 text-amber-400">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-400 mr-3" />
                        Đang tải...
                    </div>
                ) : items.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-amber-400/60 gap-3">
                        <FiCheckCircle className="text-6xl text-green-400" />
                        <p className="text-xl">Tất cả món đã được phục vụ 🎉</p>
                        <p className="text-sm">Không có món nào đang chờ.</p>
                    </div>
                ) : (
                    <>
                        {/* Group by table */}
                        {Object.entries(grouped).map(([tableName, tableItems]) => (
                            <div key={tableName} className="mb-8">
                                <h2 className="text-lg font-bold text-amber-300 mb-3 flex items-center gap-2">
                                    <MdTableRestaurant className="text-amber-400" />
                                    Bàn {tableName}
                                    <span className="text-sm font-normal text-amber-500 ml-1">({tableItems.length} món)</span>
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {tableItems.map((item) => {
                                        const readyMinutes = item.readyAt
                                            ? Math.floor((Date.now() - new Date(item.readyAt)) / 60000)
                                            : null;
                                        const isUrgent = readyMinutes !== null && readyMinutes >= 5;
                                        return (
                                            <div
                                                key={item._id}
                                                className={`rounded-2xl p-5 flex flex-col gap-4 transition border ${
                                                    isUrgent
                                                        ? 'bg-red-900/30 border-red-600 animate-pulse'
                                                        : 'bg-amber-900/40 border-amber-700 hover:border-amber-500'
                                                }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <p className="text-lg font-bold mt-1">
                                                            {item.product?.name || 'Món ăn'}
                                                        </p>
                                                        <p className="text-amber-300/70 text-sm">x{item.quantity}</p>
                                                    </div>
                                                    <div className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/40 whitespace-nowrap">
                                                        Sẵn sàng ✓
                                                    </div>
                                                </div>

                                                {readyMinutes !== null && (
                                                    <p className={`text-xs flex items-center gap-1 ${isUrgent ? 'text-red-400 font-semibold' : 'text-amber-400/70'}`}>
                                                        <FiClock size={12} />
                                                        {isUrgent ? `⚠️ Đã chờ ${readyMinutes} phút!` : `Xong lúc ${new Date(item.readyAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                                                    </p>
                                                )}

                                                <button
                                                    onClick={() => markServed(item.orderId, item._id)}
                                                    disabled={servingId === item._id}
                                                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60"
                                                >
                                                    <FiCheckCircle />
                                                    {servingId === item._id ? 'Đang xử lý...' : 'Đã phục vụ'}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </>
                )}
            </div>
        </div>
    );
}

export default WaiterDashboard;
