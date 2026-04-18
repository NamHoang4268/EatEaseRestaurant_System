import { LoginForm } from '@/components/login/login-form';
import banner from '@/assets/register_banner.jpg';
import { TypeAnimation } from 'react-type-animation';
import { Link } from 'react-router-dom';
import logo from '@/assets/logo2.png';

export default function LoginPage() {
    return (
        <div className="grid min-h-svh bg-background text-foreground transition-colors duration-300">
            <div className="overflow-hidden grid lg:grid-cols-2">
                <div className="flex flex-col p-6 md:p-10 relative z-10">
                    <div className="flex justify-center md:justify-start mb-8">
                        <Link
                            to="/"
                            className="flex items-center gap-2 font-bold text-xl hover:text-primary transition-colors"
                        >
                            <img src={logo} alt="Logo" width={34} height={34} className="drop-shadow-sm" />
                            EatEase
                        </Link>
                    </div>
                    <div className="flex flex-1 items-center justify-center">
                        <div className="w-full max-w-[450px] liquid-glass rounded-3xl p-8 md:p-10 border border-border shadow-2xl">
                            <LoginForm />
                        </div>
                    </div>
                </div>
                <div className="hidden lg:flex justify-center items-center relative overflow-hidden bg-zinc-900">
                    <div className="absolute inset-0 z-0">
                        <img src={banner} className="w-full h-full object-cover scale-105 animate-pulse" style={{ animationDuration: '20s' }} alt="Banner" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/80 dark:from-black/90 dark:via-black/60 dark:to-black/90 mix-blend-multiply" />
                    </div>
                    <div className="relative z-10 glass-border px-10 py-8 rounded-2xl border border-white/20 shadow-2xl backdrop-blur-md max-w-xl text-center transform hover:scale-105 transition-transform duration-500">
                        <h1 className="text-white font-extrabold text-4xl leading-tight mb-4 drop-shadow-lg">
                            <TypeAnimation
                                sequence={['Chào mừng đến với EatEase', 1000, 'Khám phá ẩm thực tuyệt đỉnh', 1000]}
                                wrapper="span"
                                speed={50}
                                repeat={Infinity}
                            />
                        </h1>
                        <p className="text-white/90 text-lg font-medium drop-shadow-md">
                            Đăng nhập để trải nghiệm không gian ẩm thực sang trọng và tiện lợi ngay trên thiết bị của bạn.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
