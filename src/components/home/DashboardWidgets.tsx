"use client";

import { useMemo } from 'react';
import { DisciplinaryAction, Statement } from '@/types';
import Link from 'next/link';
import { MatchItem, MatchGroupedOpinions } from '@/components/matches/MatchItem';
import { getTeamName, resolveTeamId } from '@/lib/teams';

// ─── Yardımcı Fonksiyonlar ─────────────────────────────────────────────

/**
 * Maçları haftalarına göre gruplar ve haftaları büyükten küçüğe sıralar.
 * regex ve parse işlemlerinde güvenli fallback'ler kullanılmıştır.
 */
const groupByWeek = (matches: MatchGroupedOpinions[]) => {
    const groups: { [key: number]: MatchGroupedOpinions[] } = {};
    
    matches.forEach(m => {
        const name = m.matchName || '';
        const weekMatch = name.match(/^(\d+)\./);
        const week = weekMatch ? parseInt(weekMatch[1], 10) : 0;
        
        if (!groups[week]) groups[week] = [];
        groups[week].push(m);
    });

    return Object.entries(groups)
        .sort(([a], [b]) => Number(b) - Number(a))
        .map(([week, matches]) => ({ week: Number(week), matches }));
};

/**
 * Hem DD.MM.YYYY hem de YYYY-MM-DD formatlarındaki tarih metinlerini
 * güvenli bir şekilde parse eder. Geçersiz tarihlerde Epoch (0) döner.
 */
const parseDate = (dateStr: string): Date => {
    if (!dateStr) return new Date(0);
    const cleanStr = dateStr.trim();
    
    // DD.MM.YYYY Formatı
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(cleanStr)) {
        const [d, m, y] = cleanStr.split('.').map(Number);
        return new Date(y, m - 1, d);
    }
    
    // YYYY-MM-DD Formatı
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
        const [y, m, d] = cleanStr.split('-').map(Number);
        return new Date(y, m - 1, d);
    }
    
    const parsed = new Date(cleanStr);
    return isNaN(parsed.getTime()) ? new Date(0) : parsed;
};

// ─── Alt Bileşenler (Sub-Components) ───────────────────────────────────

/**
 * TFF ve Kulüp açıklamalarını listeleyen ortak, DRY uyumlu kart bileşeni.
 */
const StatementItem = ({ statement, compact = false }: { statement: Statement; compact?: boolean }) => {
    const className = compact 
        ? "block bg-[#1d2129] hover:bg-secondary/20 border border-white/10 rounded-none p-2.5 transition-colors hover:translate-x-[-2px] hover:translate-y-[-2px]"
        : "p-3 hover:bg-white/5 transition-colors block group";

    return (
        <Link href="/statements" className={className}>
            <div className="flex justify-between items-center mb-1">
                <span className={`text-[9px] font-black uppercase tracking-wider text-black bg-secondary px-1 ${!compact ? 'border border-black' : ''}`}>
                    {statement.entity}
                </span>
                <span className="text-[9px] text-gray-400 font-mono">{statement.date}</span>
            </div>
            <h4 className={`font-black text-white mb-1 line-clamp-1 ${compact ? 'text-[11px]' : 'text-xs'}`}>
                {statement.title}
            </h4>
            <p className={`text-gray-300 line-clamp-1 leading-tight ${compact ? 'text-[10px]' : 'text-xs line-clamp-2'}`}>
                {statement.content}
            </p>
        </Link>
    );
};

/**
 * Tüm widget'ların genel kart yapısını oluşturan base bileşen.
 * OCP (Open-Closed Principle) prensibine uygun olarak href dışarıdan parametre olarak alınır.
 */
const WidgetCard = ({ 
    title, 
    icon, 
    subtitle, 
    href, 
    children, 
    headerColor = "text-white" 
}: { 
    title: string; 
    icon: string; 
    subtitle?: string; 
    href?: string; 
    children: React.ReactNode; 
    headerColor?: string; 
}) => (
    <div className="bg-[#161b22] text-white rounded-xl shadow-neo border-2 border-white/20 h-full flex flex-col overflow-hidden transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-neo-lg">
        <div className="p-4 border-b border-white/10 bg-linear-to-r from-[#1d2129] to-[#161b22] flex items-center justify-between">
            <Link href={href || '#'} className="group flex items-center gap-3 hover:opacity-90 transition-opacity">
                <div className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl border border-white/10 text-2xl group-hover:scale-110 transition-transform">
                    {icon}
                </div>
                <div>
                    <h3 className={`font-black text-sm uppercase tracking-tighter leading-none ${headerColor}`}>
                        {title}
                    </h3>
                    {subtitle && (
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1 opacity-80 group-hover:opacity-100 transition-opacity">
                            {subtitle}
                        </p>
                    )}
                </div>
            </Link>
            {href && href !== '#' && (
                <Link href={href} className="text-[9px] font-black text-black bg-secondary px-2 py-1 rounded-lg transition-all hover:bg-white hover:scale-105 active:scale-95 shadow-sm">
                    TÜMÜNÜ GÖR
                </Link>
            )}
        </div>
        <div className="flex-1 overflow-y-auto no-scrollbar bg-[#161b22]">
            {children}
        </div>
    </div>
);

/**
 * Trio ve Yorumcu listelerindeki genişletilebilir maç listesi yapısı.
 */
const ExpandableListSection = ({ groupedOpinions, headerColor }: { groupedOpinions: MatchGroupedOpinions[]; headerColor: string }) => {
    const weeks = useMemo(() => groupByWeek(groupedOpinions), [groupedOpinions]);

    if (groupedOpinions.length === 0) {
        return <div className="p-8 text-center text-xs text-gray-400 italic">Veri bulunamadı.</div>;
    }

    return (
        <div>
            {weeks.map((w) => {
                // reduce fonksiyonunda boş dizi durumunda runtime hatası oluşmaması için w.matches[0] başlangıç değeri olarak verilmiştir.
                const mostCriticalMatch = w.matches.reduce((prev, current) => {
                    return (prev.againstCount || 0) > (current.againstCount || 0) ? prev : current;
                }, w.matches[0]);

                return (
                    <div key={w.week} className="border-b border-white/20 last:border-0 pb-2">
                        <div className="bg-secondary px-3 py-1 text-[10px] font-black text-black uppercase tracking-widest sticky top-0 z-10 mx-1 rounded-sm border border-black mt-1 shadow-sm">
                            {w.week > 0 ? `${w.week}. HAFTA` : 'GENEL'}
                        </div>
                        <div className="pt-2 px-1">
                            <div className="text-center mb-1">
                                <span className="text-[9px] font-black text-white bg-[#1d2129] uppercase tracking-tight px-2 py-0.5 rounded-sm border border-white/20">
                                    HAFTANIN EN KRİTİK MAÇI
                                </span>
                            </div>

                            <div className="border border-white/20 rounded-lg overflow-hidden bg-[#1d2129] mt-2">
                                <MatchItem match={mostCriticalMatch} headerColor={headerColor} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ─── Ana Dışa Aktarılan Bölümler (Exported Widgets) ────────────────────

export const TrioSection = ({ groupedOpinions }: { groupedOpinions: MatchGroupedOpinions[] }) => (
    <WidgetCard
        title="Trio Yorumları"
        icon="📺"
        subtitle="RESMİ YAYINCI ANALİZLERİ"
        href="/trio"
        headerColor="text-white"
    >
        <ExpandableListSection groupedOpinions={groupedOpinions} headerColor="text-white" />
    </WidgetCard>
);

export const GeneralCommentsSection = ({ groupedOpinions }: { groupedOpinions: MatchGroupedOpinions[] }) => (
    <WidgetCard
        title="Yorumcular"
        icon="🎙️"
        subtitle="BAĞIMSIZ UZMAN GÖRÜŞLERİ"
        href="/critics"
        headerColor="text-white"
    >
        <ExpandableListSection groupedOpinions={groupedOpinions} headerColor="text-white" />
    </WidgetCard>
);

export const PfdkSection = ({ actions, statements }: { actions: DisciplinaryAction[]; statements?: Statement[] }) => {
    const groupedData = useMemo(() => {
        const actionsByDate: Record<string, DisciplinaryAction[]> = {};
        
        actions.forEach(act => {
            const date = act.date || 'Tarihsiz';
            if (!actionsByDate[date]) actionsByDate[date] = [];
            actionsByDate[date].push(act);
        });

        // split('.') ile sabit sıralama yerine robust parseDate ile iki format da güvenle sort edilir
        const sortedDates = Object.keys(actionsByDate).sort((a, b) => {
            return parseDate(b).getTime() - parseDate(a).getTime();
        });

        return sortedDates.map(date => {
            const teamsGroups: Record<string, DisciplinaryAction[]> = {};
            actionsByDate[date].forEach(act => {
                const rawName = act.teamName || 'DİĞER';
                // resolveTeamId tek sefer çağrılarak performans optimizasyonu sağlanmıştır (O(1) local cache)
                const teamId = resolveTeamId(rawName);
                const cleanName = teamId ? getTeamName(teamId) : rawName;
                
                if (!teamsGroups[cleanName]) teamsGroups[cleanName] = [];
                teamsGroups[cleanName].push(act);
            });

            const sortedTeamsInDate = Object.keys(teamsGroups).sort((a, b) => a.localeCompare(b, 'tr'));
            return { date, sortedTeams: sortedTeamsInDate, teamsGroups };
        });
    }, [actions]);

    return (
        <WidgetCard title="PFDK & Kararlar" icon="⚖️" href="/pfdk" headerColor="text-white">
            <div className="p-3 grid gap-6">
                {groupedData.length === 0 ? (
                    <span className="text-xs text-gray-400 italic text-center">Kayıt yok.</span>
                ) : (
                    groupedData.map(({ date, sortedTeams, teamsGroups }) => (
                        <div key={date} className="space-y-3">
                            <div className="sticky top-0 z-10 bg-[#1d2129] py-2 border-b border-white/20">
                                <h4 className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-secondary"></span>
                                    {date}
                                </h4>
                            </div>

                            <div className="space-y-4 pl-2">
                                {sortedTeams.map(team => (
                                    <div key={team} className="space-y-2">
                                        <div className="flex items-center gap-2 opacity-80">
                                            <div className="h-px bg-white/20 flex-1"></div>
                                            <h5 className="text-[10px] font-bold text-gray-300 uppercase tracking-tight">{team}</h5>
                                            <div className="h-px bg-white/20 flex-1"></div>
                                        </div>

                                        <div className="space-y-2">
                                            {teamsGroups[team].map((act, i) => {
                                                const href = act.matchId ? `/matches/${act.matchId}?tab=${act.type === 'performance' ? 'performance' : 'pfdk'}` : null;
                                                const content = (
                                                    <div className="bg-[#1d2129] hover:bg-secondary/20 rounded-none border border-white/10 p-2.5 transition-colors">
                                                        <div className="flex justify-between font-black text-white text-xs mb-1">
                                                            <span>{act.subject}</span>
                                                            {act.type === 'performance' && <span className="text-[9px] bg-white text-black px-1.5 border border-black ml-2">PERFORMANS</span>}
                                                        </div>
                                                        <p className="text-[11px] text-gray-300 line-clamp-2 italic leading-relaxed">&ldquo;{act.reason}&rdquo;</p>
                                                        {act.penalty && <div className="mt-1.5 text-[10px] font-black uppercase flex flex-wrap items-center gap-1.5">
                                                            <span className="w-1 h-1 bg-secondary"></span>
                                                            <span className={`${act.appealStatus === 'accepted' || act.appealStatus === 'partially_accepted' ? 'line-through opacity-60 text-secondary' : 'text-secondary'}`}>
                                                                {act.penalty}
                                                            </span>
                                                            {act.appealStatus && act.appealStatus !== 'none' && (
                                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                                                                    act.appealStatus === 'accepted' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                    act.appealStatus === 'partially_accepted' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                                    act.appealStatus === 'rejected' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                                    'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                                }`}>
                                                                    {act.appealStatus === 'accepted' ? 'Tahkim: İptal' :
                                                                     act.appealStatus === 'partially_accepted' ? `Tahkim: İndirildi (${act.appealedPenalty})` :
                                                                     act.appealStatus === 'rejected' ? 'Tahkim: Red' : 'Tahkim: Karar Bekleniyor'}
                                                                </span>
                                                            )}
                                                        </div>}
                                                    </div>
                                                );
                                                return href ? <Link key={act.id || i} href={href} className="block">{content}</Link> : <div key={act.id || i}>{content}</div>;
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}

                {statements && statements.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                        <div className="flex items-center gap-2 mb-3 px-1">
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">İLGİLİ AÇIKLAMALAR</span>
                            <div className="h-0.5 bg-white/20 flex-1"></div>
                        </div>
                        <div className="space-y-2">
                            {statements.map((st, i) => (
                                <StatementItem key={st.id || i} statement={st} compact={true} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </WidgetCard>
    );
};

export const StatementsSection = ({ statements }: { statements: Statement[] }) => (
    <WidgetCard
        title="Açıklamalar"
        icon="📢"
        subtitle="TFF VE KULÜP DUYURULARI"
        href="/statements"
        headerColor="text-white"
    >
        <div className="divide-y divide-white/10">
            {statements.map((st, i) => (
                <StatementItem key={st.id || i} statement={st} compact={false} />
            ))}
            {statements.length === 0 && <div className="p-4 text-center text-xs text-gray-500">Açıklama yok.</div>}
        </div>
    </WidgetCard>
);
