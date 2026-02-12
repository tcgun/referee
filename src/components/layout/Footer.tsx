import Link from 'next/link';
import { Shield, Mail, Twitter, Github } from 'lucide-react';

export const Footer = () => {
    return (
        <footer className="bg-white border-t-4 border-black mt-20 pb-10 pt-16 relative">
            {/* Decorative pattern or heavy border */}
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                    {/* Brand Section */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex items-center gap-2 group cursor-pointer w-fit">
                            <div className="bg-primary p-2 border-2 border-black shadow-neo-sm group-hover:rotate-12 transition-transform">
                                <Shield className="w-5 h-5 text-black" />
                            </div>
                            <span className="font-black text-2xl tracking-tighter uppercase italic text-black">
                                Varsayım
                            </span>
                        </div>
                        <p className="text-sm font-medium text-black max-w-md leading-relaxed border-l-4 border-secondary pl-4">
                            Türkiye Süper Lig hakem performanslarını, tartışmalı pozisyonları ve PFDK kararlarını derinlemesine analiz eden bağımsız bir platform. Şeffaflık ve adil analiz için buradayız.
                        </p>
                        <div className="flex gap-4 pt-2">
                            <a href="#" className="p-2 border-2 border-black hover:bg-secondary hover:shadow-neo-sm transition-all transform hover:-translate-y-1 text-black">
                                <Twitter className="w-4 h-4" />
                            </a>
                            <a href="#" className="p-2 border-2 border-black hover:bg-secondary hover:shadow-neo-sm transition-all transform hover:-translate-y-1 text-black">
                                <Github className="w-4 h-4" />
                            </a>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-4">
                        <h4 className="font-black text-sm tracking-wider uppercase border-b-2 border-primary w-fit pb-1 text-black">Hızlı Linkler</h4>
                        <ul className="space-y-2 text-sm font-bold text-black">
                            <li><Link href="/pfdk" className="hover:bg-secondary hover:text-black hover:shadow-neo-sm border-2 border-transparent hover:border-black px-1 rounded transition-all">PFDK Kararları</Link></li>
                            <li><Link href="/statements" className="hover:bg-secondary hover:text-black hover:shadow-neo-sm border-2 border-transparent hover:border-black px-1 rounded transition-all">Resmi Açıklamalar</Link></li>
                            <li><Link href="/#trio" className="hover:bg-secondary hover:text-black hover:shadow-neo-sm border-2 border-transparent hover:border-black px-1 rounded transition-all">Trio Yorumları</Link></li>
                            <li><Link href="/standings" className="hover:bg-secondary hover:text-black hover:shadow-neo-sm border-2 border-transparent hover:border-black px-1 rounded transition-all">Puan Durumu</Link></li>
                        </ul>
                    </div>

                    {/* Support */}
                    <div className="space-y-4">
                        <h4 className="font-black text-sm tracking-wider uppercase border-b-2 border-primary w-fit pb-1 text-black">Destek & İletişim</h4>
                        <ul className="space-y-2 text-sm font-bold text-gray-800">
                            <li><Link href="/about" className="hover:text-primary hover:underline decoration-4 decoration-secondary transition-all">Hakkımızda</Link></li>
                            <li><Link href="/contact" className="hover:text-primary hover:underline decoration-4 decoration-secondary transition-all">İletişim</Link></li>
                            <li className="flex items-center gap-2 pt-2">
                                <Mail className="w-4 h-4" />
                                <span>info@varsayim.com</span>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t-2 border-gray-200 gap-4">
                    <p className="text-[10px] text-gray-600 uppercase tracking-widest font-black">
                        © {new Date().getFullYear()} Varsayım. Tüm hakları saklıdır.
                    </p>
                    <div className="flex gap-6 text-[10px] font-black text-gray-600 uppercase tracking-widest">
                        <Link href="/privacy" className="hover:text-primary transition-colors">Gizlilik Politikası</Link>
                        <Link href="/terms" className="hover:text-primary transition-colors">Kullanım Şartları</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};
