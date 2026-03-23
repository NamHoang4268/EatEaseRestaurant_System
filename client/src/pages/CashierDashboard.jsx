import React from 'react';
import { useSelector } from 'react-redux';
import { LayoutDashboard } from 'lucide-react';

const CashierDashboard = () => {
    const user = useSelector((state) => state?.user);
    return (
        <div className="container mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-highlight uppercase flex items-center gap-2">
                        <LayoutDashboard className="h-6 w-6" />
                        Trang Thu ngân
                    </h1>
                    <p className="text-muted-foreground">Chào mừng {user?.name}, đây là khu vực quản lý thu chi.</p>
                </div>
            </div>
        </div>
    );
};

export default CashierDashboard;
