import React from 'react';
import { useSelector } from 'react-redux';
import { LayoutDashboard } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import Axios from '../utils/Axios';
import toast from 'react-hot-toast';
import { FiClock, FiCheckCircle, FiRefreshCw, FiWifi, FiWifiOff, FiMaximize, FiMinimize } from 'react-icons/fi';
import { GiCookingPot } from 'react-icons/gi';
import { BsBellFill } from 'react-icons/bs';

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:8080';

const STATUS_CONFIG = {
    pending: { label: 'Chờ nấu',  color: 'bg-yellow-100 text-yellow-800 border-yellow-400', dot: 'bg-yellow-400', next: 'cooking', nextLabel: '🔥 Bắt đầu nấu' },
    cooking: { label: 'Đang nấu', color: 'bg-blue-100 text-blue-800 border-blue-400',       dot: 'bg-blue-500',   next: 'ready',   nextLabel: '✅ Xong món' },
    ready:   { label: 'Xong',     color: 'bg-green-100 text-green-800 border-green-400',     dot: 'bg-green-500',  next: null,      nextLabel: null },
};

// Beep sound for new order notification
function playBeep() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    } catch (_) { /* ignore if no audio context */ }
}

const ChefDashboard = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [connected, setConnected] = useState(false);
    const [clock, setClock] = useState(new Date());
    const [updatingId, setUpdatingId] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const [tablesMap, setTablesMap] = useState({});
    const socketRef = useRef(null);

    useEffect(() => {
        const interval = setInterval(() => setClock(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Manage body scroll when expanded
    useEffect(() => {
        if (isExpanded) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isExpanded]);

    const fetchTables = useCallback(async () => {
        try {
            const res = await Axios({ url: '/api/table/get-all', method: 'GET' });
            if (res.data?.success) {
                const map = {};
                res.data.data.forEach(t => {
                    map[t._id] = t.tableNumber;
                });
                setTablesMap(map);
            }
        } catch (err) {
            console.warn('Failed to fetch tables for mapping:', err);
        }
    }, []);

    const toggleExpanded = () => {
        setIsExpanded(prev => !prev);
    };

    const fetchItems = useCallback(async () => {
        try {
            const res = await Axios({ url: '/api/kitchen/active', method: 'GET' });
            if (res.data?.success) setItems(res.data.data);
        } catch {
            toast.error('Không thể tải danh sách món.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchItems();
        fetchTables();

        const s = io(SOCKET_URL);
        socketRef.current = s;

        s.on('connect', () => setConnected(true));
        s.on('disconnect', () => setConnected(false));
        s.emit('kitchen:join');

        s.on('kitchen:new_order', (data) => {
            playBeep();
            toast(`🔔 Bàn ${data.tableName} – Đơn mới vào bếp!`, {
                icon: <BsBellFill className="text-orange-500" />,
                duration: 6000,
                style: { border: '2px solid #f97316' },
            });
            fetchItems();
        });

        s.on('dish:served', () => fetchItems());

        return () => s.disconnect();
    }, [fetchItems]);

    const updateStatus = async (orderId, itemId, newStatus) => {
        setUpdatingId(itemId);
        try {
            await Axios({
                url: `/api/kitchen/item/${orderId}/${itemId}/status`,
                method: 'PATCH',
                data: { status: newStatus },
            });
            setItems((prev) =>
                prev.map((item) =>
                    item._id === itemId ? { ...item, kitchenStatus: newStatus } : item
                )
            );
            if (newStatus === 'ready') {
                toast.success('Món xong! Đã thông báo waiter 🛎️');
            }
        } catch {
            toast.error('Cập nhật thất bại.');
        } finally {
            setUpdatingId(null);
        }
    };

    // Group items by table
    const grouped = items.reduce((acc, item) => {
        let tableName = 'Không rõ';
        if (item.tableId) {
            if (typeof item.tableId === 'object') {
                tableName = item.tableId.tableNumber || item.tableId.name || item.tableId.tableName || tablesMap[item.tableId._id] || item.tableId._id;
            } else {
                tableName = tablesMap[item.tableId] || item.tableId;
            }
        } else {
            console.warn('Thiếu tableId cho item:', item._id);
        }
        
        if (!acc[tableName]) acc[tableName] = [];
        acc[tableName].push(item);
        return acc;
    }, {});

    const totalPending = items.filter(i => i.kitchenStatus === 'pending').length;
    const totalCooking = items.filter(i => i.kitchenStatus === 'cooking').length;

    return (
        <div className={`min-h-screen bg-gray-950 text-white transition-all duration-300 ${
            isExpanded ? 'fixed inset-0 z-[9999] overflow-y-auto w-full h-full' : 'relative'
        }`}>
            {/* Header */}
            <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 sticky top-0 z-10 w-full">
                <div className="w-full flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <GiCookingPot className="text-orange-400 text-3xl" />
                        <div>
                            <h1 className="text-xl font-bold leading-none">Kitchen Display</h1>
                            <p className="text-gray-400 text-xs mt-0.5">
                                {clock.toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', weekday: 'short', day: '2-digit', month: '2-digit' })}
                            </p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-4">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-yellow-400">{totalPending}</p>
                            <p className="text-xs text-gray-400">Chờ nấu</p>
                        </div>
                        <div className="h-8 w-px bg-gray-700" />
                        <div className="text-center">
                            <p className="text-2xl font-bold text-blue-400">{totalCooking}</p>
                            <p className="text-xs text-gray-400">Đang nấu</p>
                        </div>
                        <div className="h-8 w-px bg-gray-700" />
                        <div className="text-center">
                            <p className="text-2xl font-bold text-white">{Object.keys(grouped).length}</p>
                            <p className="text-xs text-gray-400">Bàn</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Connection indicator */}
                        <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${connected ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                            {connected ? <FiWifi size={12} /> : <FiWifiOff size={12} />}
                            {connected ? 'Real-time' : 'Offline'}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleExpanded}
                                title={isExpanded ? "Thu nhỏ" : "Phóng to"}
                                className="flex items-center justify-center bg-gray-800 hover:bg-gray-700 w-10 h-10 rounded-xl transition text-white"
                            >
                                {isExpanded ? <FiMinimize size={18} /> : <FiMaximize size={18} />}
                            </button>
                            <button
                                onClick={fetchItems}
                                className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-3 py-2 h-10 rounded-xl transition text-sm"
                            >
                                <FiRefreshCw size={14} /> Làm mới
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="w-full p-0">
                {loading ? (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-400 mr-3" />
                        Đang tải...
                    </div>
                ) : Object.keys(grouped).length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-3">
                        <FiCheckCircle className="text-6xl text-green-500" />
                        <p className="text-xl">Không có món nào cần nấu 🎉</p>
                        <p className="text-sm">Tất cả đơn hàng đã được xử lý</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                        {Object.entries(grouped).map(([tableName, tableItems]) => {
                            const hasPending = tableItems.some(i => i.kitchenStatus === 'pending');
                            return (
                                <div
                                    key={tableName}
                                    className={`bg-gray-900 rounded-2xl border ${
                                        hasPending ? 'border-yellow-600/50' : 'border-gray-800'
                                    } overflow-hidden`}
                                >
                                    {/* Table header */}
                                    <div className={`px-5 py-3 flex items-center justify-between ${
                                        hasPending ? 'bg-yellow-900/30' : 'bg-gray-800/50'
                                    }`}>
                                        <h2 className="text-lg font-bold text-orange-400">🪑 Bàn {tableName}</h2>
                                        <span className="text-xs text-gray-400">{tableItems.length} món</span>
                                    </div>

                                    {/* Items */}
                                    <div className="p-4 space-y-3">
                                        {tableItems.map((item) => {
                                            const cfg = STATUS_CONFIG[item.kitchenStatus] || STATUS_CONFIG.pending;
                                            const isUpdating = updatingId === item._id;
                                            const waitMinutes = item.sentAt
                                                ? Math.floor((Date.now() - new Date(item.sentAt)) / 60000)
                                                : null;
                                            return (
                                                <div key={item._id} className="bg-gray-800 rounded-xl p-4">
                                                    <div className="flex items-start justify-between gap-3 mb-3">
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold truncate">
                                                                {item.product?.name || 'Món ăn'}
                                                            </p>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-gray-400 text-sm">x{item.quantity}</span>
                                                                {waitMinutes !== null && (
                                                                    <span className={`text-xs flex items-center gap-1 ${waitMinutes > 15 ? 'text-red-400' : 'text-gray-500'}`}>
                                                                        <FiClock size={11} />
                                                                        {waitMinutes} phút
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {item.note && (
                                                                <p className="text-yellow-400 text-xs mt-1">📝 {item.note}</p>
                                                            )}
                                                        </div>
                                                        {/* Status badge */}
                                                        <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${cfg.color} whitespace-nowrap`}>
                                                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
                                                            {cfg.label}
                                                        </span>
                                                    </div>
                                                    {/* Action button */}
                                                    {cfg.next && (
                                                        <button
                                                            onClick={() => updateStatus(item.orderId, item._id, cfg.next)}
                                                            disabled={isUpdating}
                                                            className={`w-full py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50 ${
                                                                cfg.next === 'cooking'
                                                                    ? 'bg-blue-600 hover:bg-blue-500 text-white'
                                                                    : 'bg-green-600 hover:bg-green-500 text-white'
                                                            }`}
                                                        >
                                                            {isUpdating ? 'Đang cập nhật...' : cfg.nextLabel}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
    
};

export default ChefDashboard;
