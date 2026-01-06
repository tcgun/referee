"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navbar() {
    const pathname = usePathname();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const links = [
        { href: '/', label: 'ANA SAYFA' },
        { href: '/matches', label: 'MAÇLAR' },
        { href: '/trio', label: 'TRİO YORUMLARI' },
        { href: '/critics', label: 'YORUMCULAR' },
        { href: '/pfdk', label: 'PFDK KARARLAR' },
        { href: '/statements', label: 'AÇIKLAMALAR' },
        { href: '/referees', label: 'HAKEM İSTATİSTİKLERİ' },
        { href: '/officials', label: 'GÖREVLİLER' },
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

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden text-slate-300 hover:text-white focus:outline-none"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isMobileMenuOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-slate-900 border-b border-slate-800 absolute w-full left-0 top-14 shadow-xl">
                    <div className="flex flex-col p-2 space-y-1">
                        {links.map((link) => {
                            const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`px-4 py-3 rounded-md text-xs font-bold uppercase tracking-widest transition-colors ${isActive
                                        ? 'bg-blue-600 text-white'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                        }`}
                                >
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </nav>
    );
}
