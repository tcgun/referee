"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { auth } from '@/firebase/client';
import { User, onAuthStateChanged, signOut } from 'firebase/auth';
import { 
    Home, 
    Calendar, 
    Tv, 
    Users, 
    Scale, 
    BarChart3, 
    FileText, 
    ShieldAlert, 
    UserCheck, 
    MoreHorizontal,
    User as UserIcon,
    LogOut,
    LogIn,
    Shield,
    Menu,
    X,
    Settings
} from 'lucide-react';
import { toast } from 'sonner';

export default function Navbar() {
    const pathname = usePathname();
    const router = useRouter();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [showProfileMenu, setShowProfileMenu] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
        });
        return () => unsubscribe();
    }, []);

    const links = [
        { href: '/', label: 'Ana Sayfa', icon: Home },
        { href: '/matches', label: 'Maçlar', icon: Calendar },
        { href: '/trio', label: 'Trio Yorumları', icon: Tv },
        { href: '/critics', label: 'Yorumcular', icon: Users },
        { href: '/pfdk', label: 'PFDK Kararları', icon: Scale },
        { href: '/pfdk/teams', label: 'Takım Analizi', icon: BarChart3 },
        { href: '/statements', label: 'Açıklamalar', icon: FileText },
        { href: '/referees', label: 'Hakem İstatistikleri', icon: ShieldAlert },
        { href: '/officials', label: 'Görevliler', icon: UserCheck },
    ];

    const handleLogout = async () => {
        try {
            await signOut(auth);
            toast.success("Başarıyla çıkış yapıldı.");
            router.push('/');
        } catch {
            toast.error("Çıkış yapılırken bir hata oluştu.");
        }
    };

    const isLinkActive = (href: string) => {
        if (href === '/') return pathname === '/';
        if (href === '/pfdk') return pathname.startsWith('/pfdk') && !pathname.startsWith('/pfdk/teams');
        return pathname.startsWith(href);
    };

    return (
        <>
            {/* Desktop Left Sidebar */}
            <aside className="hidden md:flex flex-col justify-between fixed top-0 left-0 h-screen w-64 lg:w-72 xl:w-80 bg-black border-r border-white/10 p-6 z-40 font-sans overflow-y-auto no-scrollbar">
                <div className="space-y-6">
                    {/* Logo Section */}
                    <div className="px-3 py-2 flex justify-start">
                        <Link href="/" className="font-black text-2xl tracking-tighter hover:scale-105 transition-transform bg-secondary border-2 border-black p-1 -rotate-3 shadow-neo-sm ml-0 z-50 text-black inline-block">
                            VARSAYIM
                        </Link>
                    </div>

                    {/* Nav Links */}
                    <nav className="flex flex-col space-y-1">
                        {links.map((link) => {
                            const active = isLinkActive(link.href);
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`flex items-center gap-4 px-4 py-3 rounded-full text-base font-bold transition-all ${
                                        active
                                            ? 'text-primary bg-white/10 scale-102'
                                            : 'text-gray-300 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    <Icon className={`w-6 h-6 ${active ? 'text-primary stroke-[2.5px]' : 'text-gray-400'}`} />
                                    <span>{link.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Prominent Action Button (Yönetim Paneli) */}
                    <div className="pt-2">
                        <Link
                            href="/admin-secret-panel"
                            className="block w-full bg-primary text-black font-black uppercase text-xs tracking-wider text-center py-4 px-6 rounded-full border-2 border-black shadow-neo-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo transition-all duration-200"
                        >
                            Yönetim Paneli
                        </Link>
                    </div>
                </div>

                {/* User Profile Section at bottom */}
                <div className="relative border-t border-white/10 pt-4">
                    <div 
                        onClick={() => setShowProfileMenu(!showProfileMenu)}
                        className="flex items-center justify-between p-3 rounded-full hover:bg-white/10 cursor-pointer transition-all duration-200"
                    >
                        <div className="flex items-center gap-3 min-w-0">
                            {/* Avatar */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${
                                user ? 'bg-primary text-black border border-black' : 'bg-white/10 text-white'
                            }`}>
                                {user ? (user.email?.[0].toUpperCase() || 'A') : <UserIcon className="w-5 h-5" />}
                            </div>
                            {/* User Info */}
                            <div className="text-left min-w-0">
                                <p className="text-sm font-black text-white truncate">
                                    {user ? 'Yönetici' : 'Ziyaretçi'}
                                </p>
                                <p className="text-xs text-gray-500 font-medium truncate">
                                    {user ? `@${user.email?.split('@')[0]}` : '@misafir'}
                                </p>
                            </div>
                        </div>
                        <MoreHorizontal className="w-5 h-5 text-gray-400 shrink-0 ml-2" />
                    </div>

                    {/* Profile Dropdown Menu */}
                    {showProfileMenu && (
                        <div className="absolute bottom-full left-0 w-full mb-2 bg-[#161b22] border border-white/10 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                            {user ? (
                                <>
                                    <Link 
                                        href="/admin-secret-panel"
                                        onClick={() => setShowProfileMenu(false)}
                                        className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-xs font-bold text-gray-200 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        <Settings className="w-4 h-4 text-primary" />
                                        <span>Yönetim Paneli</span>
                                    </Link>
                                    <button 
                                        onClick={() => {
                                            setShowProfileMenu(false);
                                            handleLogout();
                                        }}
                                        className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Çıkış Yap</span>
                                    </button>
                                </>
                            ) : (
                                <Link 
                                    href="/admin-secret-panel/login"
                                    onClick={() => setShowProfileMenu(false)}
                                    className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-xs font-bold text-primary hover:text-white hover:bg-primary/20 transition-colors"
                                >
                                    <LogIn className="w-4 h-4" />
                                    <span>Yönetici Girişi</span>
                                </Link>
                            )}
                        </div>
                    )}
                </div>
            </aside>

            {/* Mobile Top Navbar */}
            <header className="md:hidden sticky top-0 left-0 w-full h-16 bg-black border-b border-white/10 flex items-center justify-between px-4 z-40 font-sans">
                <Link href="/" className="font-black text-2xl tracking-tighter hover:scale-105 transition-transform bg-secondary border-2 border-black p-1 -rotate-3 shadow-neo-sm ml-0 z-50 text-black inline-block">
                    VARSAYIM
                </Link>

                <button
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                    className="p-2 text-white hover:text-primary transition-colors focus:outline-none"
                >
                    {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </header>

            {/* Mobile Drawer Menu */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 top-16 bg-black/95 z-40 overflow-y-auto font-sans animate-in fade-in duration-300">
                    <div className="flex flex-col p-6 space-y-6">
                        <nav className="flex flex-col space-y-2">
                            {links.map((link) => {
                                const active = isLinkActive(link.href);
                                const Icon = link.icon;
                                return (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className={`flex items-center gap-4 px-4 py-3.5 rounded-full text-base font-bold transition-all ${
                                            active
                                                ? 'text-primary bg-white/10'
                                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                                        }`}
                                    >
                                        <Icon className={`w-5 h-5 ${active ? 'text-primary' : 'text-gray-400'}`} />
                                        <span>{link.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>

                        <div className="border-t border-white/10 pt-6 space-y-4">
                            <Link
                                href="/admin-secret-panel"
                                onClick={() => setIsMobileMenuOpen(false)}
                                className="block w-full bg-primary text-black font-black uppercase text-xs tracking-wider text-center py-4 px-6 rounded-full border-2 border-black shadow-neo-sm"
                            >
                                Yönetim Paneli
                            </Link>

                            <div className="flex items-center justify-between p-3 bg-white/5 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black ${
                                        user ? 'bg-primary text-black' : 'bg-white/10 text-white'
                                    }`}>
                                        {user ? (user.email?.[0].toUpperCase() || 'A') : <UserIcon className="w-4 h-4" />}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-black text-white">
                                            {user ? 'Yönetici' : 'Ziyaretçi'}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {user ? `@${user.email?.split('@')[0]}` : '@misafir'}
                                        </p>
                                    </div>
                                </div>
                                {user ? (
                                    <button 
                                        onClick={() => {
                                            setIsMobileMenuOpen(false);
                                            handleLogout();
                                        }}
                                        className="p-2 text-red-400 hover:text-red-300"
                                    >
                                        <LogOut className="w-5 h-5" />
                                    </button>
                                ) : (
                                    <Link 
                                        href="/admin-secret-panel/login"
                                        onClick={() => setIsMobileMenuOpen(false)}
                                        className="p-2 text-primary"
                                    >
                                        <LogIn className="w-5 h-5" />
                                    </Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
