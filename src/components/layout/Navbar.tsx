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
        { href: '/pfdk/teams', label: 'TAKIM ANALİZİ' },
        { href: '/statements', label: 'AÇIKLAMALAR' },
        { href: '/referees', label: 'HAKEM İSTATİSTİKLERİ' },
        { href: '/officials', label: 'GÖREVLİLER' },
    ];

    return (
        <nav className="sticky top-0 z-50 bg-[#0d1117] border-b border-white/10 text-foreground overflow-visible">
            <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-start gap-4">

                {/* Logo Area */}
                <Link href="/" className="font-black text-2xl tracking-tighter hover:scale-105 transition-transform bg-secondary border-2 border-black p-1 -rotate-3 shadow-neo-sm ml-[-10px] z-50 text-black">
                    VARSAYIM
                </Link>

                {/* Desktop Links */}
                <div className="hidden md:flex gap-2 lg:gap-4 items-center">
                    {links.map((link) => {
                        // Check if current pathname starts with link.href
                        const isPrimaryPrefix = pathname.startsWith(link.href);

                        // Exact match or specialized sub-path check
                        let isActive = pathname === link.href;

                        if (!isActive && link.href !== '/') {
                            // If this is /pfdk, only be active if it's NOT /pfdk/teams
                            if (link.href === '/pfdk') {
                                isActive = pathname.startsWith('/pfdk') && !pathname.startsWith('/pfdk/teams');
                            } else if (link.href === '/matches') {
                                isActive = pathname.startsWith('/matches');
                            } else if (link.href === '/trio') {
                                isActive = pathname.startsWith('/trio');
                            } else {
                                isActive = pathname === link.href;
                            }
                        }

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`px-2 py-1.5 border-2 border-black font-black uppercase tracking-wide text-[10px] rounded-md transition-all whitespace-nowrap ${isActive
                                    ? 'bg-secondary text-black shadow-neo-sm translate-x-[-2px] translate-y-[-2px] -rotate-1'
                                    : 'bg-[#18181B] text-muted-foreground border-white/10 hover:bg-secondary hover:text-black hover:shadow-neo-sm hover:translate-x-[-2px] hover:translate-y-[-2px] hover:-rotate-1'
                                    }`}
                            >
                                {link.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 border-2 border-white/20 rounded bg-[#18181B] text-foreground hover:bg-secondary hover:text-black transition-colors ml-auto"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {isMobileMenuOpen ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                        ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16M4 18h16" />
                        )}
                    </svg>
                </button>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="md:hidden bg-[#0d1117] border-b border-white/20 absolute w-full left-0 top-16 shadow-2xl z-50">
                    <div className="flex flex-col p-4 space-y-3">
                        {links.map((link) => {
                            let isActive = pathname === link.href;

                            if (!isActive && link.href !== '/') {
                                if (link.href === '/pfdk') {
                                    isActive = pathname.startsWith('/pfdk') && !pathname.startsWith('/pfdk/teams');
                                } else if (link.href === '/matches') {
                                    isActive = pathname.startsWith('/matches');
                                } else if (link.href === '/trio') {
                                    isActive = pathname.startsWith('/trio');
                                } else {
                                    isActive = pathname === link.href;
                                }
                            }

                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={`px-4 py-3 border-2 font-bold uppercase tracking-widest transition-all ${isActive
                                        ? 'bg-secondary text-black border-black shadow-neo-sm'
                                        : 'bg-[#18181B] text-foreground border-white/10 hover:bg-secondary hover:text-black'
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
