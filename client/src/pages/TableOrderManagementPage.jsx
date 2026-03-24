import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import toast from 'react-hot-toast';
import {
    FiCreditCard,
    FiDollarSign,
    FiShoppingBag,
    FiLogOut,
    FiX,
    FiClock,
    FiBell,
    FiFileText,
    FiCheckCircle,
} from 'react-icons/fi';

// Map kitchenStatus → label + màu hiển thị cho khách
const KITCHEN_STATUS_CONFIG = {
    pending:  { label: 'Chờ bếp',       className: 'bg-yellow-100 text-yellow-700' },
    cooking:  { label: 'Đang nấu',      className: 'bg-blue-100 text-blue-700' },
    ready:    { label: 'Sắp phục vụ',   className: 'bg-purple-100 text-purple-700' },
    served:   { label: 'Đã phục vụ',   className: 'bg-green-100 text-green-700' },
};

// ─────────────────────────────────────────
// Bill Preview Modal (AC 3–5)
// ─────────────────────────────────────────
function OnlineBillPreviewModal({ tableOrder, onClose, onConfirm, processing }) {
    if (!tableOrder) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <FiFileText /> Xác nhận Thanh toán Online
                        </h2>
                        <p className="text-blue-100 text-sm mt-0.5">Bàn {tableOrder.tableNumber}</p>
                    </div>
                    <button onClick={onClose} className="text-white text-2xl leading-none hover:text-blue-200">
                        &times;
                    </button>
                </div>

                {/* Items list */}
                <div className="p-5 space-y-2 max-h-64 overflow-y-auto">
                    {(tableOrder.items || []).map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center border-b pb-2 last:border-b-0">
                            <div>
                                <p className="font-semibold text-gray-800">{item.name}</p>
                                <p className="text-sm text-gray-500">x{item.quantity} × {item.price.toLocaleString('vi-VN')}đ</p>
                            </div>
                            <p className="font-bold text-gray-800">
                                {(item.price * item.quantity).toLocaleString('vi-VN')}đ
                            </p>
                        </div>
                    ))}
                </div>

                {/* Total */}
                <div className="px-5 pb-2">
                    <div className="flex justify-between items-center bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                        <span className="text-lg font-bold text-gray-800">Tổng cộng:</span>
                        <span className="text-2xl font-bold text-blue-600">
                            {(tableOrder.total || 0).toLocaleString('vi-VN')}đ
                        </span>
                    </div>
                </div>

                <div className="px-5 pb-2 pt-1">
                    <p className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                        ⚠️ Sau khi xác nhận, bạn sẽ được chuyển đến trang thanh toán Stripe an toàn.
                    </p>
                </div>

                {/* Actions */}
                <div className="px-5 pb-5 mt-1 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-xl font-semibold transition"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={processing}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white py-3 rounded-xl font-bold transition"
                    >
                        <FiCheckCircle size={18} />
                        {processing ? 'Đang xử lý...' : 'Xác nhận thanh toán'}
                    </button>
                </div>
            </div>
        </div>
    );
}

const TableOrderManagementPage = () => {
    const navigate = useNavigate();
    const user = useSelector((state) => state.user);
    const [tableOrder, setTableOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [callingWaiter, setCallingWaiter] = useState(false);
    const [waiterNote, setWaiterNote] = useState('');
    const [showWaiterInput, setShowWaiterInput] = useState(false);
    const [callCooldown, setCallCooldown] = useState(false);
    const [showBillPreview, setShowBillPreview] = useState(false);

    useEffect(() => {
        if (!user || user.role !== 'TABLE') {
            toast.error('Vui lòng quét mã QR tại bàn');
            navigate('/');
            return;
        }
        fetchTableOrder();
    }, [user, navigate]);

    const fetchTableOrder = async () => {
        try {
            setLoading(true);
            const response = await Axios({
                ...SummaryApi.get_current_table_order,
            });

            if (response.data.success) {
                setTableOrder(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching table order:', error);
            toast.error('Không thể tải đơn hàng');
        } finally {
            setLoading(false);
        }
    };

    // Called after user reviews the bill and confirms
    const handleOnlinePaymentConfirm = async () => {
        if (!tableOrder || tableOrder.items.length === 0) {
            toast.error('Không có món nào để thanh toán');
            return;
        }
        if (!allServed) {
            toast.error('Vui lòng chờ tất cả các món được phục vụ trước khi thanh toán.');
            return;
        }

        try {
            setProcessing(true);
            const response = await Axios({
                ...SummaryApi.checkout_table_order,
                data: { paymentMethod: 'online' },
            });

            if (response.data.success) {
                // AC 6 – redirect to Stripe
                window.location.href = response.data.data.checkoutUrl;
            }
        } catch (error) {
            console.error('Error checkout:', error);
            toast.error(error.response?.data?.message || 'Không thể tạo phiên thanh toán');
            setShowBillPreview(false);
        } finally {
            setProcessing(false);
        }
    };

    const handleCashCheckout = async () => {
        if (!tableOrder || tableOrder.items.length === 0) {
            toast.error('Không có món nào để thanh toán');
            return;
        }
        if (!allServed) {
            toast.error('Vui lòng chờ tất cả các món được phục vụ trước khi thanh toán.');
            return;
        }

        try {
            setProcessing(true);
            const response = await Axios({
                ...SummaryApi.checkout_table_order,
                data: { paymentMethod: 'at_counter' },
            });

            if (response.data.success) {
                toast.success(
                    '📋 Yêu cầu thanh toán tại quầy đã được gửi. Nhân viên sẽ đến hỗ trợ!',
                    { duration: 5000 }
                );
                navigate('/table-menu');
            }
        } catch (error) {
            console.error('Error checkout:', error);
            toast.error(error.response?.data?.message || 'Không thể thanh toán');
        } finally {
            setProcessing(false);
        }
    };

    const handleCancelOrder = async () => {
        if (!window.confirm('Bạn có chắc muốn hủy đơn hàng?')) {
            return;
        }

        try {
            const response = await Axios({
                ...SummaryApi.cancel_table_order,
            });

            if (response.data.success) {
                toast.success('Đã hủy đơn hàng');
                navigate('/table-menu');
            }
        } catch (error) {
            console.error('Error cancelling order:', error);
            toast.error('Không thể hủy đơn');
        }
    };

    const handleCallWaiter = async () => {
        if (callCooldown) {
            toast.error('Bạn vừa gửi yêu cầu. Vui lòng chờ một chút...');
            return;
        }
        setCallingWaiter(true);
        try {
            const response = await Axios({
                ...SummaryApi.call_waiter,
                data: { type: 'cancel_item', note: waiterNote.trim() },
            });
            if (response.data.success) {
                toast.success('🔔 Đã gửi! Nhân viên sẽ đến ngay.', { duration: 5000 });
                setWaiterNote('');
                setShowWaiterInput(false);
                // Cooldown 30 giây để tránh spam
                setCallCooldown(true);
                setTimeout(() => setCallCooldown(false), 30000);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Không thể gửi yêu cầu');
        } finally {
            setCallingWaiter(false);
        }
    };

    const handleLogout = async () => {
        try {
            await Axios({
                ...SummaryApi.logoutTable,
            });
            toast.success('Đã đăng xuất');
            navigate('/');
        } catch (error) {
            console.error('Error logging out:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
            </div>
        );
    }

    if (!tableOrder || tableOrder.items.length === 0) {
        return (
            <div className="min-h-screen bg-gray-50">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4">
                    <div className="max-w-7xl mx-auto flex justify-between items-center">
                        <h1 className="text-2xl font-bold">Đơn hàng</h1>
                        <button
                            onClick={handleLogout}
                            className="bg-white text-orange-500 p-2 rounded-full"
                        >
                            <FiLogOut size={20} />
                        </button>
                    </div>
                </div>
                <div className="max-w-2xl mx-auto p-8 text-center">
                    <p className="text-gray-500 mb-4">
                        Chưa có món nào được gọi
                    </p>
                    <button
                        onClick={() => navigate('/table-menu')}
                        className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold"
                    >
                        Bắt đầu gọi món
                    </button>
                </div>
            </div>
        );
    }

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const allServed =
        tableOrder.items.length > 0 &&
        tableOrder.items.every((item) => item.kitchenStatus === 'served');

    const pendingCount = tableOrder.items.filter(
        (item) => item.kitchenStatus !== 'served'
    ).length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Bill Preview Modal */}
            {showBillPreview && (
                <OnlineBillPreviewModal
                    tableOrder={tableOrder}
                    onClose={() => setShowBillPreview(false)}
                    onConfirm={handleOnlinePaymentConfirm}
                    processing={processing}
                />
            )}

            {/* Header */}
            <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 sticky top-0 z-40 shadow-lg">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">
                            Bàn {tableOrder.tableNumber}
                        </h1>
                        <p className="text-sm opacity-90">Quản lý đơn hàng</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="bg-white text-orange-500 p-3 rounded-full hover:bg-orange-50 transition-colors"
                    >
                        <FiLogOut size={24} />
                    </button>
                </div>
            </div>

            <div className="max-w-2xl mx-auto p-4 space-y-4">
                {/* Order Items */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">
                        Món đã gọi
                    </h2>
                    <div className="space-y-3">
                        {tableOrder.items.map((item, index) => {
                            const statusCfg =
                                KITCHEN_STATUS_CONFIG[item.kitchenStatus] ??
                                KITCHEN_STATUS_CONFIG.pending;
                            return (
                                <div
                                    key={index}
                                    className="flex justify-between items-start border-b pb-3 last:border-b-0"
                                >
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-gray-800">
                                            {item.name}
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            Gọi lúc: {formatTime(item.addedAt)}
                                        </p>
                                        <p className="text-orange-500 font-bold mt-1">
                                            {item.price.toLocaleString('vi-VN')}đ x{' '}
                                            {item.quantity}
                                        </p>
                                        {/* Kitchen status badge */}
                                        <span
                                            className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.className}`}
                                        >
                                            {item.kitchenStatus !== 'served' && (
                                                <FiClock size={10} />
                                            )}
                                            {statusCfg.label}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-800">
                                            {(
                                                item.price * item.quantity
                                            ).toLocaleString('vi-VN')}
                                            đ
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Total */}
                <div className="bg-white rounded-xl shadow-sm p-6">
                    <div className="flex justify-between items-center text-xl font-bold">
                        <span className="text-orange-700">Tổng cộng:</span>
                        <span className="text-orange-500">
                            {tableOrder.total.toLocaleString('vi-VN')}đ
                        </span>
                    </div>
                </div>

                {/* Gọi phục vụ */}
                <div className="bg-white rounded-xl shadow-sm p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-semibold text-gray-800">Cần hỗ trợ?</p>
                            <p className="text-sm text-gray-500 mt-0.5">Gọi nhân viên đến bàn</p>
                        </div>
                        <button
                            onClick={() => setShowWaiterInput(p => !p)}
                            disabled={callCooldown}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition ${
                                callCooldown
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                            }`}
                        >
                            <FiBell size={18} />
                            {callCooldown ? 'Đã gửi' : 'Gọi phục vụ'}
                        </button>
                    </div>

                    {showWaiterInput && !callCooldown && (
                        <div className="mt-3 space-y-2">
                            <textarea
                                value={waiterNote}
                                onChange={(e) => setWaiterNote(e.target.value)}
                                placeholder="Mô tả ngắn (VD: Muốn hủy món Phở bò)..."
                                rows={2}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
                            />
                            <button
                                onClick={handleCallWaiter}
                                disabled={callingWaiter}
                                className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition disabled:opacity-60"
                            >
                                <FiBell size={16} />
                                {callingWaiter ? 'Đang gửi...' : 'Xác nhận gọi phục vụ'}
                            </button>
                        </div>
                    )}
                </div>

                {/* Payment Buttons */}
                {/* Banner: chỉ hiện khi chưa đủ điều kiện thanh toán */}
                {!allServed && (
                    <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 flex items-start gap-3">
                        <FiClock className="text-yellow-500 mt-0.5 shrink-0" size={20} />
                        <div>
                            <p className="font-semibold text-yellow-800">Chưa thể thanh toán</p>
                            <p className="text-sm text-yellow-700 mt-0.5">
                                Còn <strong>{pendingCount}</strong> món chưa được phục vụ. Vui lòng chờ nhân viên mang món ra bàn trước khi thanh toán.
                            </p>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {/* Online payment – shows bill preview first (AC 3–5) */}
                    <button
                        onClick={() => {
                            if (!allServed) {
                                toast.error('Vui lòng chờ tất cả các món được phục vụ.');
                                return;
                            }
                            setShowBillPreview(true);
                        }}
                        disabled={processing || !allServed}
                        className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 hover:from-blue-600 hover:to-blue-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                    >
                        <FiCreditCard size={24} />
                        {processing ? 'Đang xử lý...' : 'Thanh toán online (Stripe)'}
                    </button>

                    <button
                        onClick={handleCashCheckout}
                        disabled={processing || !allServed}
                        className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 hover:from-green-600 hover:to-green-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg"
                    >
                        <FiDollarSign size={24} />
                        {processing ? 'Đang xử lý...' : 'Thanh toán tại quầy'}
                    </button>

                    <button
                        onClick={() => navigate('/table-menu')}
                        className="w-full bg-orange-500 text-white py-4 rounded-xl font-semibold text-lg flex items-center justify-center gap-2 hover:bg-orange-600 transition-all"
                    >
                        <FiShoppingBag size={24} />
                        Tiếp tục gọi món
                    </button>

                    <button
                        onClick={handleCancelOrder}
                        className="w-full bg-gray-400 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-300 transition-all"
                    >
                        <FiX size={20} />
                        Hủy đơn
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TableOrderManagementPage;
