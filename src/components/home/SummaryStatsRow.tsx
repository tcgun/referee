"use client";

import { useEffect, useState } from 'react';

interface SummaryData {
    controversial: { matchName: string; count: number };
    referee: { name: string; count: number };
    pfdk: { count: number };
}

export function SummaryStatsRow() {
    const [data, setData] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/stats/summary')
            .then(res => res.json())
            .then(resData => {
                if (resData.error) console.error(resData.error);
                else setData(resData);
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const cards = [
        {
            title: 'HAFTANIN EN TARTIŞMALI MAÇI',
            value: data?.controversial.matchName || '-',
            subValue: `${data?.controversial.count || 0} Tartışmalı Pozisyon`,
            color: 'bg-orange-50 text-orange-700 border-orange-200',
            icon: '🔥'
        },
        {
            title: 'EN ÇOK HATA İDDİASI OLAN HAKEM',
            value: data?.referee.name || '-',
            subValue: `${data?.referee.count || 0} Hatalı Karar Şüphesi`,
            color: 'bg-red-50 text-red-700 border-red-200',
            icon: '🚩'
        },
        {
            title: 'PFDK GÜNDEMİ (SON 7 GÜN)',
            value: `${data?.pfdk.count || 0} Karar`,
            subValue: 'Disiplin Kurulu Sevkleri',
            color: 'bg-slate-50 text-slate-700 border-slate-200',
            icon: '⚖️'
        }
    ];

    if (loading) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-8">
                <div className="md:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="h-24 bg-slate-100 animate-pulse rounded-xl"></div>
                    <div className="h-24 bg-slate-100 animate-pulse rounded-xl"></div>
                </div>
                <div className="md:col-span-3 h-24 bg-slate-100 animate-pulse rounded-xl"></div>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-10 gap-4 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="md:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4">
                {cards.slice(0, 2).map((card, idx) => (
                    <div key={idx} className={`rounded-xl border border-white/10 p-4 flex items-center justify-between shadow-neo-sm hover:shadow-neo transition-all transform hover:-translate-y-1 bg-[#161b22]`}>
                        <div>
                            <h3 className="text-[10px] font-black uppercase text-white/50 tracking-widest mb-1">{card.title}</h3>
                            <div className="text-lg font-black leading-tight mb-0.5 text-white">{card.value}</div>
                            <div className="text-xs font-bold text-white/40">{card.subValue}</div>
                        </div>
                        <div className="text-2xl opacity-100 grayscale-0 p-2 bg-secondary border-2 border-black rounded-lg shadow-sm">
                            {card.icon}
                        </div>
                    </div>
                ))}
            </div>
            <div className={`md:col-span-3 rounded-xl border border-white/10 p-4 flex items-center justify-between shadow-neo-sm hover:shadow-neo transition-all transform hover:-translate-y-1 bg-[#161b22]`}>
                <div>
                    <h3 className="text-[10px] font-black uppercase text-white/50 tracking-widest mb-1">{cards[2].title}</h3>
                    <div className="text-lg font-black leading-tight mb-0.5 text-white">{cards[2].value}</div>
                    <div className="text-xs font-bold text-white/40">{cards[2].subValue}</div>
                </div>
                <div className="text-2xl opacity-100 grayscale-0 p-2 bg-secondary border-2 border-black rounded-lg shadow-sm">
                    {cards[2].icon}
                </div>
            </div>
        </div>
    );
}
