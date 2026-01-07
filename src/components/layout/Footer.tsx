import Link from 'next/link';
import { Shield, Mail, Twitter, Github } from 'lucide-react';

export const Footer = () => {
    return (
        <footer className="bg-background border-t border-border mt-20 pb-10 pt-16">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    {/* Brand Section */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex items-center gap-2 group cursor-pointer">
                            <div className="bg-primary p-2 rounded-lg group-hover:rotate-12 transition-transform shadow-lg shadow-primary/20">
                                <Shield className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <span className="font-black text-xl tracking-tighter uppercase italic">
                                Referee<span className="text-primary">Lig</span>
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                            Türkiye Süper Lig hakem performanslarını, tartışmalı pozisyonları ve PFDK kararlarını derinlemesine analiz eden bağımsız bir platform. Şeffaflık ve adil analiz için buradayız.
                        </p>
                        <div className="flex gap-4 pt-2">
                            <a href="#" className="p-2 rounded-full border border-border hover:bg-muted hover:text-primary transition-colors">
                                <Twitter className="w-4 h-4" />
                            </a>
                            <a href="#" className="p-2 rounded-full border border-border hover:bg-muted hover:text-primary transition-colors">
                                <Github className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-sm tracking-wider uppercase">Hızlı Linkler</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/pfdk" className="hover:text-primary transition-colors">PFDK Kararları</Link></li>
                            <li><Link href="/statements" className="hover:text-primary transition-colors">Resmi Açıklamalar</Link></li>
                            <li><Link href="/#trio" className="hover:text-primary transition-colors">Trio Yorumları</Link></li>
                            <li><Link href="/standings" className="hover:text-primary transition-colors">Puan Durumu</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div className="space-y-4">
                        <h4 className="font-bold text-sm tracking-wider uppercase">Destek & İletişim</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/about" className="hover:text-primary transition-colors">Hakkımızda</Link></li>
                            <li><Link href="/contact" className="hover:text-primary transition-colors">İletişim</Link></li>
                            <li className="flex items-center gap-2 pt-2">
                                <Mail className="w-4 h-4" />
                                <span>info@referelig.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-border gap-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                        © {new Date().getFullYear()} RefereeLig. Tüm hakları saklıdır.
                    </p>
                    <div className="flex gap-6 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                        <Link href="/privacy" className="hover:text-primary transition-colors">Gizlilik Politikası</Link>
                        <Link href="/terms" className="hover:text-primary transition-colors">Kullanım Şartları</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};
