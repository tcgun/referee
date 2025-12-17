"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const pathname = usePathname();

    const links = [
        { href: '/', label: 'ANA SAYFA' },
        { href: '/#trio', label: 'TRİO YORUMLARI' }, // Using hash links for now since they are currently widgets on home
        { href: '/#comments', label: 'YORUMCULAR' },
        { href: '/#pfdk', label: 'PFDK KARARLAR' },
        { href: '/#statements', label: 'AÇIKLAMALAR' },
        { href: '/referees', label: 'HAKEM İSTATİSTİKLERİ' },
    ];

    return (
        <nav className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white shadow-lg backdrop-blur-md bg-opacity-90">
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">

                {/* Logo Area */}
                <Link href="/" className="font-black text-xl tracking-tighter hover:opacity-80 transition-opacity">
                    REFEREE<span className="text-blue-500">LIG</span>
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex gap-1">
                    {links.map((link) => {
                        const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-4 py-2 rounded-md text-[10px] font-bold uppercase tracking-widest transition-colors ${isActive
                                    ? 'bg-blue-600 text-white'
                                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Mobile Menu Placeholder (Simple) */}
                <div className="md:hidden text-xs font-bold text-slate-500 uppercase">
                    MENU
                </div>
            </div>
        </nav>
    );
}
