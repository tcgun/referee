"use client";

import { useState, useEffect } from 'react';
import { Team, Match, MatchStats, Incident, Opinion } from '@/types';
import { resolveTeamId, getTeamName } from '@/lib/teams';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { useRouter } from 'next/navigation';
import { MatchSelect } from './ExtraForms';

interface BaseProps {
    apiKey: string;
    authToken?: string;
    preloadedMatch?: Match | null;
    defaultMatchId?: string;
    existingIncidents?: any[];
    onSuccess?: () => void;
}

export const TeamForm = ({ apiKey, authToken }: BaseProps) => {
    const [team, setTeam] = useState<Partial<Team>>({
        id: '', name: '', logo: '', colors: { primary: '#000000', secondary: '#ffffff', text: '#ffffff' }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/admin/teams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': apiKey, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
            body: JSON.stringify(team),
        });
        if (res.ok) alert('Team Added!');
        else alert('Error adding team');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-gray-200 bg-white rounded shadow-sm">
            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Takım Ekle</h3>
            <input placeholder="ID (örn: galatasaray)" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={team.id} onChange={e => setTeam({ ...team, id: e.target.value })} required />
            <input placeholder="Takım Adı" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={team.name} onChange={e => setTeam({ ...team, name: e.target.value })} required />
            <input placeholder="Logo URL" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={team.logo} onChange={e => setTeam({ ...team, logo: e.target.value })} />
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="text-xs text-gray-500 block">Birincil Renk</label>
                    <input type="color" className="w-full h-8" value={team.colors?.primary} onChange={e => setTeam({ ...team, colors: { ...team.colors!, primary: e.target.value } })} />
                </div>
                <div className="flex-1">
                    <label className="text-xs text-gray-500 block">İkincil Renk</label>
                    <input type="color" className="w-full h-8" value={team.colors?.secondary} onChange={e => setTeam({ ...team, colors: { ...team.colors!, secondary: e.target.value } })} />
                </div>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded w-full font-medium">Takımı Kaydet</button>
        </form>
    );
};

export const MatchForm = ({ apiKey, authToken, preloadedMatch }: BaseProps) => {
    const router = useRouter();
    const [match, setMatch] = useState<Partial<Match>>({ id: '', week: 1, date: new Date().toISOString(), status: 'draft' });
    const [originalId, setOriginalId] = useState<string>('');
    const [localDate, setLocalDate] = useState('');

    // Local states for raw paste data
    const [tffRaw, setTffRaw] = useState('');
    const [lineupRaw, setLineupRaw] = useState('');
    const [statsRaw, setStatsRaw] = useState('');

    useEffect(() => {
        if (match.date) {
            const d = new Date(match.date);
            if (!isNaN(d.getTime())) {
                // Ensure we display in Istanbul time (TRT)
                const formatter = new Intl.DateTimeFormat('tr-TR', {
                    year: 'numeric', month: '2-digit', day: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                    timeZone: 'Europe/Istanbul'
                });
                // toLocaleString returns "dd.mm.yyyy hh:mm"
                // formatter.format(d) might return "08.08.2025 21:30"
                setLocalDate(formatter.format(d));
            }
        } else {
            setLocalDate('');
        }
    }, [match.date]);

    // Update form when preloaded data changes
    if (preloadedMatch && match.id !== preloadedMatch.id) {
        setMatch(preloadedMatch);
    }

    const updateStat = (key: string, val: string) => {
        const num = val === '' ? undefined : Number(val);
        setMatch(prev => ({
            ...prev,
            stats: {
                ...(prev.stats || {}),
                [key]: num
            }
        }));
    };

    // Helper to sync officials lists to specific fields
    const prepareMatchForSave = (m: Partial<Match>) => {
        const payload = { ...m };
        if (payload.officials) {
            // Sync Referees
            const refs = payload.officials.referees || [];
            if (refs[0]) payload.referee = refs[0];
            payload.officials.assistants = refs.slice(1, 3).filter(Boolean); // Index 1, 2 -> Assistants
            if (refs[3]) payload.officials.fourthOfficial = refs[3]; // Index 3 -> 4th Official

            // Sync VAR
            const vars = payload.officials.varReferees || [];
            if (vars[0]) payload.varReferee = vars[0];
            payload.officials.avarReferees = vars.slice(1).filter(Boolean); // Index 1+ -> AVARs
        }

        // Force convert all stats to numbers
        if (payload.stats) {
            const cleanStats: any = {};
            Object.entries(payload.stats).forEach(([key, val]) => {
                if (val === '' || val === null || val === undefined) {
                    cleanStats[key] = undefined;
                } else {
                    cleanStats[key] = Number(val);
                }
            });
            payload.stats = cleanStats;
        }

        return payload;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let activeId = match.id;

        // Auto-Generate ID if missing
        if (!activeId) {
            if (match.homeTeamId && match.awayTeamId && match.date) {
                const d = new Date(match.date);
                if (!isNaN(d.getTime())) {
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    activeId = `week${match.week || 1}-${match.homeTeamId}-${match.awayTeamId}-${yyyy}-${mm}-${dd}`;
                    setMatch(prev => ({ ...prev, id: activeId }));
                }
            }
        }

        if (!activeId) return alert('Lütfen önce Maç ID giriniz (veya verileri yapıştırınız).');

        const payload = prepareMatchForSave({ ...match, id: activeId });
        const res = await fetch('/api/admin/matches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': apiKey, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            alert(`Maç Başarıyla Kaydedildi! ✅\nID: ${activeId}`);
        } else {
            const err = await res.json();
            alert(`Hata: ${err.error}\n${JSON.stringify(err.details || '', null, 2)}`);
        }
    };



    const handleLoad = async () => {
        if (!match.id) return alert('Lütfen Maç ID giriniz');
        const targetId = match.id.trim();
        try {
            const res = await fetch(`/api/admin/matches?id=${targetId}`, {
                method: 'GET',
                headers: { 'x-admin-key': apiKey, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
            });
            if (res.ok) {
                const data = await res.json();
                setMatch(data);
                setOriginalId(data.id);

                // --- Reconstruct Raw Paste Data ---

                // 1. TFF Raw
                let tff = '';
                if (data.date) {
                    const d = new Date(data.date);
                    tff += `${d.toLocaleDateString('tr-TR')} - ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}\n`;
                }
                if (data.stadium) tff += `${data.stadium}\n`;
                if (data.officials) {
                    const { referees, varReferees, observers, representatives } = data.officials;
                    if (referees?.[0]) tff += `${referees[0]} (Hakem)\n`;
                    if (referees?.[1]) tff += `${referees[1]} (1. Yardımcı Hakem)\n`;
                    if (referees?.[2]) tff += `${referees[2]} (2. Yardımcı Hakem)\n`;
                    if (referees?.[3]) tff += `${referees[3]} (Dördüncü Hakem)\n`;
                    if (varReferees?.length) {
                        tff += `${varReferees[0]} (VAR)\n`;
                        varReferees.slice(1).forEach((v: string) => tff += `${v} (AVAR)\n`);
                    }
                    observers?.forEach((o: string) => tff += `${o} (Gözlemci)\n`);
                    representatives?.forEach((r: string) => tff += `${r} (Temsilci)\n`);
                }
                setTffRaw(tff);

                // 2. Lineup Raw
                let lineup = '';
                if (data.lineups) {
                    const { home, away, homeSubs, awaySubs, homeCoach, awayCoach } = data.lineups;
                    const maxXI = Math.max(home?.length || 0, away?.length || 0);
                    for (let i = 0; i < maxXI; i++) {
                        const h = home?.[i];
                        const a = away?.[i];
                        lineup += `${h?.number || ''} ${h?.name || ''} ${a?.name || ''} ${a?.number || ''}\n`;
                    }
                    if (homeSubs?.length || awaySubs?.length) {
                        lineup += "Yedekler\n";
                        const maxSubs = Math.max(homeSubs?.length || 0, awaySubs?.length || 0);
                        for (let i = 0; i < maxSubs; i++) {
                            const h = homeSubs?.[i];
                            const a = awaySubs?.[i];
                            lineup += `${h?.number || ''} ${h?.name || ''} ${a?.name || ''} ${a?.number || ''}\n`;
                        }
                    }
                    if (homeCoach || awayCoach) {
                        lineup += `Teknik Sorumlusu\n${homeCoach || ''} ${awayCoach || ''}\n`;
                    }
                }
                setLineupRaw(lineup);

                // 3. Stats Raw
                let stats = '';
                if (data.stats) {
                    const m: Record<string, string> = {
                        'Topla Oynama': 'Possession', 'Toplam Şut': 'Shots', 'Kaleyi Bulan Şut': 'ShotsOnTarget',
                        'Net Gol Şansı': 'BigChances', 'Köşe Vuruşu': 'Corners', 'Ofsayt': 'Offsides',
                        'Kurtarışlar': 'Saves', 'Fauller': 'Fouls', 'Sarı Kart': 'YellowCards', 'Kırmızı Kart': 'RedCards'
                    };
                    Object.entries(m).forEach(([label, key]) => {
                        const h = (data.stats as any)[`home${key}`];
                        const a = (data.stats as any)[`away${key}`];
                        if (h !== undefined || a !== undefined) {
                            stats += `${label}\n${h ?? ''}\n${a ?? ''}\n`;
                        }
                    });
                }
                setStatsRaw(stats);

                alert('Maç yüklendi!');
            } else {
                alert(`"${targetId}" ID'li maç bulunamadı. (Uzunluk: ${targetId.length})`);
            }
        } catch (e) {
            console.error(e);
            alert('Yükleme hatası');
        }
    };

    const handleRenameMatch = async () => {
        if (!originalId) return alert('Önce düzenlemek istediğiniz maçı "Getir" butonuyla yükleyiniz.');
        if (!match.id || match.id === originalId) return alert('Lütfen ID alanına YENİ bir ID giriniz.');

        if (!confirm(`Eski ID: ${originalId}\nYeni ID: ${match.id}\n\nBu işlem maçı ve ona bağlı TÜM verileri (olaylar, yorumlar, pfdk sevkleri) yeni ID'ye taşıyacaktır. Emin misiniz?`)) return;

        try {
            const res = await fetch(`/api/admin/matches/rename`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': apiKey,
                    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
                },
                body: JSON.stringify({ oldId: originalId, newId: match.id })
            });
            if (res.ok) {
                alert('Maç ID başarıyla değiştirildi! 🚀');
                setOriginalId(match.id as string);
                // Refresh list if external component depends on it, but reload is safest
                window.location.reload();
            } else {
                const err = await res.json();
                alert(`İşlem Hatası: ${err.error}\n${err.details || ''}`);
            }
        } catch (error) {
            console.error(error);
            alert('Ağ hatası oluştu');
        }
    };

    // Updated Auto-Fill to support w1galfen -> week1-gal-fen-YYYY-MM-DD
    const handleAutoFillFromId = () => {
        const idInput = (match.id || '').toLowerCase().trim();
        if (!idInput) return;

        let weekVal = match.week || 1;
        let homeStr = '';
        let awayStr = '';
        let dateStr = ''; // YYYY-MM-DD

        // Pattern 1: w{Week}{Home}{Away} (e.g. w1galfen or w12galfen)
        // Heuristic: "w" + digits + 3 chars + 3 chars
        const shortcodeMatch = idInput.match(/^w(\d+)([a-z]{3})([a-z]{3})$/);

        if (shortcodeMatch) {
            weekVal = parseInt(shortcodeMatch[1]);
            homeStr = shortcodeMatch[2];
            awayStr = shortcodeMatch[3];
        } else {
            // Pattern 2: Standard week1-gal-fen...
            const parts = idInput.split('-');
            if (parts.length >= 2) {
                if (parts[0].startsWith('week')) {
                    const w = parseInt(parts[0].replace('week', ''));
                    if (!isNaN(w)) weekVal = w;
                    homeStr = parts[1];
                    awayStr = parts[2] || '';
                } else {
                    homeStr = parts[0];
                    awayStr = parts[1] || '';
                }
            }
        }

        const updates: any = { week: weekVal };
        let finalHomeId = homeStr;
        let finalAwayId = awayStr;

        if (homeStr) {
            const hId = resolveTeamId(homeStr);
            if (hId) {
                updates.homeTeamId = hId;
                updates.homeTeamName = getTeamName(hId);
                finalHomeId = hId;
            }
        }

        if (awayStr) {
            const aId = resolveTeamId(awayStr);
            if (aId) {
                updates.awayTeamId = aId;
                updates.awayTeamName = getTeamName(aId);
                finalAwayId = aId;
            }
        }

        // Try to append Date if available in Match state
        if (match.date) {
            const d = new Date(match.date);
            if (!isNaN(d.getTime())) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                dateStr = `${year}-${month}-${day}`;
            }
        }

        // Reconstruct ID
        let finalId = `week${weekVal}`;
        if (finalHomeId) finalId += `-${finalHomeId}`;
        if (finalAwayId) finalId += `-${finalAwayId}`;

        // Append date if we have a valid 3-part ID already
        if (finalHomeId && finalAwayId && dateStr) {
            finalId += `-${dateStr}`;
        }

        updates.id = finalId;
        setMatch(prev => ({ ...prev, ...updates }));
    };

    const handleDeleteMatch = async () => {
        if (!match.id) return alert('Silmek için bir maç seçiniz.');
        if (!confirm(`${match.id} ID'li maçı TAMAMEN silmek istediğinize emin misiniz? Bu işlem geri alınamaz!`)) return;

        try {
            const res = await fetch(`/api/admin/matches?id=${match.id}`, {
                method: 'DELETE',
                headers: { 'x-admin-key': apiKey, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
            });
            if (res.ok) {
                alert('Maç başarıyla silindi! 🗑️');
                setMatch({
                    id: '', homeTeamId: '', awayTeamId: '', homeTeamName: '', awayTeamName: '', week: 1, season: '2024-2025', stadium: 'Rams Park', date: new Date().toISOString(),
                    status: 'draft'
                });
                // Simple way to refresh the select list
                window.location.reload();
            } else {
                const err = await res.json();
                alert(`Silme Hatası: ${err.error}`);
            }
        } catch (error) {
            console.error(error);
            alert('Ağ hatası oluştu');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-gray-200 bg-white rounded shadow-sm">
            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Maç Ekle / Düzenle</h3>

            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Mevcut Maç Seçiniz</label>
                        <MatchSelect value={match.id || ''} onChange={val => setMatch({ ...match, id: val })} />
                    </div>
                    <div className="flex items-end gap-2">
                        <button type="button" onClick={handleLoad} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold text-sm shadow-sm transition-all h-[38px]">Getir</button>
                        <button type="button" onClick={handleRenameMatch} className="bg-orange-50 text-orange-600 px-4 py-2 rounded font-bold text-sm border border-orange-200 hover:bg-orange-100 transition-all h-[38px]">ID Değiştir</button>
                        <button type="button" onClick={handleDeleteMatch} className="bg-red-50 text-red-600 px-4 py-2 rounded font-bold text-sm border border-red-200 hover:bg-red-100 transition-all h-[38px]">Sil</button>
                        <button type="button" onClick={() => { setMatch({ id: '', week: 1, date: new Date().toISOString(), status: 'draft' }); setOriginalId(''); setTffRaw(''); setLineupRaw(''); setStatsRaw(''); }} className="bg-white text-slate-600 px-4 py-2 rounded font-bold text-sm border border-slate-200 hover:bg-slate-50 transition-all h-[38px]">Yeni</button>
                    </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Maç Kayıt ID (week1-takim-takim)</label>
                    <input
                        placeholder="Örn: week1-gs-fb"
                        className="w-full border border-slate-300 p-2 rounded text-sm font-mono bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        value={match.id || ''}
                        onChange={e => {
                            let val = e.target.value;
                            // Auto-expand w[digit] -> week[digit]
                            // Examples: 'w1' -> 'week1', 'w12' -> 'week12'
                            if (/^w\d/.test(val) && !val.startsWith('week')) {
                                val = val.replace(/^w(\d+)/, 'week$1');
                            }

                            // Auto-update Week field if ID starts with weekN
                            let nextWeek = match.week;
                            const weekMatch = val.match(/^week(\d+)/);
                            if (weekMatch) {
                                nextWeek = parseInt(weekMatch[1]);
                            }

                            setMatch({ ...match, id: val, week: nextWeek });
                        }}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAutoFillFromId())}
                    />
                    <p className="text-[9px] text-slate-400 italic">Enter'a basınca takımları otomatik tanır. {match.id?.includes('ı') || match.id?.includes('ğ') || match.id?.includes('ü') || match.id?.includes('ş') || match.id?.includes('ö') || match.id?.includes('ç') ? <span className="text-red-500 font-bold">Uyarı: Türkçe karakter kullanmayınız!</span> : 'Mevcut ID formatı uygun.'}</p>
                </div>

                {/* Team & Date Info pushed to top group */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Ev Sahibi</label>
                        <div className="flex flex-col gap-1">
                            <input
                                placeholder="ID (örn: gs)"
                                className="border border-slate-200 p-2 w-full rounded text-sm bg-white"
                                value={match.homeTeamId || ''}
                                onChange={e => setMatch({ ...match, homeTeamId: e.target.value })}
                                onBlur={() => {
                                    if (!match.homeTeamId) return;
                                    const rid = resolveTeamId(match.homeTeamId);
                                    if (rid) setMatch(prev => ({ ...prev, homeTeamId: rid, homeTeamName: getTeamName(rid) }));
                                }}
                            />
                            <input
                                placeholder="Adı (örn: Galatasaray)"
                                className="border border-slate-200 p-2 w-full rounded text-xs bg-slate-50"
                                value={match.homeTeamName || ''}
                                onChange={e => setMatch({ ...match, homeTeamName: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Deplasman</label>
                        <div className="flex flex-col gap-1">
                            <input
                                placeholder="ID (örn: fb)"
                                className="border border-slate-200 p-2 w-full rounded text-sm bg-white"
                                value={match.awayTeamId || ''}
                                onChange={e => setMatch({ ...match, awayTeamId: e.target.value })}
                                onBlur={() => {
                                    if (!match.awayTeamId) return;
                                    const rid = resolveTeamId(match.awayTeamId);
                                    if (rid) setMatch(prev => ({ ...prev, awayTeamId: rid, awayTeamName: getTeamName(rid) }));
                                }}
                            />
                            <input
                                placeholder="Adı (örn: Fenerbahçe)"
                                className="border border-slate-200 p-2 w-full rounded text-xs bg-slate-50"
                                value={match.awayTeamName || ''}
                                onChange={e => setMatch({ ...match, awayTeamName: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Hafta</label>
                        <input type="text" className="border border-slate-200 p-2 w-full rounded font-bold bg-white text-sm" value={match.week || 1} onChange={e => {
                            const val = e.target.value;
                            const num = parseInt(val);
                            setMatch({ ...match, week: isNaN(num) ? val as any : num });
                        }} />
                    </div>

                </div>


            </div>

            {/* Smart Paste Section */}
            <div className="bg-blue-50 p-3 rounded mb-4 border border-blue-100 relative">
                <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-xs text-blue-800 uppercase">Hızlı Veri Girişi (TFF Kopyala-Yapıştır)</h4>
                    <div className="flex items-center gap-1">
                        <label className="text-[10px] text-blue-600 font-bold uppercase">Hafta:</label>
                        <input
                            type="number"
                            className="w-12 text-xs p-1 border border-blue-200 rounded text-center font-bold"
                            value={match.week || 1}
                            onChange={(e) => {
                                const w = parseInt(e.target.value) || 1;
                                const updates: any = { week: w };
                                if (match.homeTeamId && match.awayTeamId && match.date) {
                                    const d = new Date(match.date);
                                    if (!isNaN(d.getTime())) {
                                        const yyyy = d.getFullYear();
                                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                                        const dd = String(d.getDate()).padStart(2, '0');
                                        updates.id = `week${w}-${match.homeTeamId}-${match.awayTeamId}-${yyyy}-${mm}-${dd}`;
                                    }
                                }
                                setMatch({ ...match, ...updates });
                            }}
                        />
                    </div>
                </div>

                <textarea
                    className="w-full text-xs p-2 border rounded h-24 font-mono text-gray-700"
                    placeholder="TFF sayfasından maç detaylarını kopyalayıp buraya yapıştırın..."
                    value={tffRaw}
                    onChange={(e) => {
                        const text = e.target.value;
                        setTffRaw(text);
                        if (!text.trim()) return;

                        const newMatch = { ...match };
                        if (!newMatch.officials) newMatch.officials = { referees: [], varReferees: [], observers: [], representatives: [] };

                        // Reset lists
                        newMatch.officials.referees = ['', '', '', ''];
                        newMatch.officials.varReferees = [];
                        newMatch.officials.observers = [];
                        newMatch.officials.representatives = [];

                        const lines = text.split('\n').map(l => l.trim()).filter(l => l);

                        let foundHomeId = '';
                        let foundAwayId = '';
                        let foundDate = null;
                        let foundStadium = '';

                        // Stage 1: Try to find a specific "Home - Away" line first (Strong Signal)
                        for (const line of lines) {
                            if (line.includes(' - ') || line.includes(' vs ')) {
                                const sep = line.includes(' - ') ? ' - ' : ' vs ';
                                const parts = line.split(sep);
                                if (parts.length === 2) {
                                    const hId = resolveTeamId(parts[0]);
                                    const aId = resolveTeamId(parts[1]);
                                    if (hId && aId) {
                                        foundHomeId = hId;
                                        foundAwayId = aId;
                                        break;
                                    }
                                }
                            }
                        }

                        // Stage 2: If Stage 1 failed, scan ALL lines for team names (Weak Signal)
                        if (!foundHomeId || !foundAwayId) {
                            const foundTeams = new Set<string>();
                            lines.forEach(line => {
                                // Avoid lines that look like officials or dates
                                if (line.includes('(Hakem)') || line.match(/\d{2}\.\d{2}\.\d{4}/)) return;

                                // Try to resolve the whole line (e.g. "Göztepe")
                                // or parts of it? resolveTeamId handles fuzzy containment.
                                const tId = resolveTeamId(line);
                                if (tId) foundTeams.add(tId);
                            });

                            if (foundTeams.size === 2) {
                                const arr = Array.from(foundTeams);
                                // Heuristic: First found in text is likely Home
                                // But Set iteration order matches insertion order usually.
                                // Let's re-scan to be sure of order
                                const orderedTeams: string[] = [];
                                lines.forEach(line => {
                                    const tId = resolveTeamId(line);
                                    if (tId && foundTeams.has(tId) && !orderedTeams.includes(tId)) {
                                        orderedTeams.push(tId);
                                    }
                                });

                                if (orderedTeams.length === 2) {
                                    foundHomeId = orderedTeams[0];
                                    foundAwayId = orderedTeams[1];
                                }
                            }
                        }

                        // Apply Teams if found
                        if (foundHomeId && foundAwayId) {
                            newMatch.homeTeamId = foundHomeId;
                            newMatch.homeTeamName = getTeamName(foundHomeId);
                            newMatch.awayTeamId = foundAwayId;
                            newMatch.awayTeamName = getTeamName(foundAwayId);
                        }

                        lines.forEach(line => {
                            // Date Detection (e.g. 08.07.2025 - 21:00)
                            if (line.match(/\d{1,2}\.\d{1,2}\.\d{4}/)) {
                                const parts = line.split('-');
                                if (parts.length > 0) {
                                    const datePart = parts[0].trim();
                                    const timePart = parts[1] ? parts[1].trim() : '00:00';
                                    const [day, month, year] = datePart.split('.');
                                    const [hour, minute] = timePart.split(':');
                                    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
                                    if (!isNaN(d.getTime())) {
                                        newMatch.date = d.toISOString();
                                        foundDate = d;
                                    }
                                }
                            }

                            // Official Parsing
                            else if (line.includes('(Hakem)')) {
                                newMatch.referee = line.replace('(Hakem)', '').trim();
                                newMatch.officials!.referees[0] = newMatch.referee;
                            }
                            else if (line.includes('(1. Yardımcı Hakem)')) {
                                newMatch.officials!.referees[1] = line.replace('(1. Yardımcı Hakem)', '').trim();
                            }
                            else if (line.includes('(2. Yardımcı Hakem)')) {
                                newMatch.officials!.referees[2] = line.replace('(2. Yardımcı Hakem)', '').trim();
                            }
                            else if (line.includes('(Dördüncü Hakem)')) {
                                newMatch.officials!.referees[3] = line.replace('(Dördüncü Hakem)', '').trim();
                            }
                            else if (line.includes('(VAR)')) {
                                newMatch.varReferee = line.replace('(VAR)', '').trim();
                                newMatch.officials!.varReferees.push(newMatch.varReferee);
                            }
                            else if (line.includes('(AVAR)')) {
                                newMatch.officials!.varReferees.push(line.replace('(AVAR)', '').trim());
                            }
                            else if (line.includes('(Gözlemci)')) {
                                newMatch.officials!.observers.push(line.replace('(Gözlemci)', '').trim());
                            }
                            else if (line.includes('(Temsilci)')) {
                                newMatch.officials!.representatives.push(line.replace('(Temsilci)', '').trim());
                            }
                            // Stadium Detection
                            else if (line.includes('STADYUMU') || line.includes('STADI') || line.includes('PARK') || line.includes('ARENA')) {
                                if (line.includes(' - ')) {
                                    newMatch.stadium = line.split(' - ')[0].trim();
                                } else {
                                    newMatch.stadium = line.trim();
                                }
                            }
                        });

                        // ID GENERATION (Immediate)
                        const activeWeek = match.week || 1; // Use current state week (from input)
                        if (activeWeek && newMatch.homeTeamId && newMatch.awayTeamId && newMatch.date) {
                            const d = new Date(newMatch.date);
                            const yyyy = d.getFullYear();
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const dd = String(d.getDate()).padStart(2, '0');

                            const newId = `week${activeWeek}-${newMatch.homeTeamId}-${newMatch.awayTeamId}-${yyyy}-${mm}-${dd}`;
                            newMatch.id = newId;
                        }

                        // Reformat TFF Raw to be clean
                        // We will just keep user's input for now or do minimal cleaning,
                        // as aggressive cleaning might be annoying while typing.

                        setMatch(newMatch);
                    }}
                />

            </div>

            {/* Lineup Paste Section */}
            <div className="bg-green-50 p-3 rounded mb-4 border border-green-100">
                <h4 className="font-bold text-xs text-green-800 mb-1 uppercase">Kadro Girişi (Beinsport Kopyala-Yapıştır)</h4>
                <textarea
                    className="w-full text-xs p-2 border rounded h-24 font-mono text-gray-700"
                    placeholder="Kadro listesini yapıştırın (Numara - İsim - İsim - Numara formatında)..."
                    value={lineupRaw}
                    onChange={(e) => {
                        const text = e.target.value;
                        setLineupRaw(text);
                        if (!text.trim()) return;

                        const newMatch = { ...match };
                        if (!newMatch.lineups) newMatch.lineups = { home: [], away: [], homeSubs: [], awaySubs: [], homeCoach: '', awayCoach: '' };

                        const lines = text.split('\n').map(l => l.trim()).filter(l => l);

                        // --- TOKENIZER & PARSER ---
                        // 1. Identity Detection (Teams & Date) - Allowing Lineup Paste to Initialize Match
                        let foundHomeId = '';
                        let foundAwayId = '';
                        let foundDate = null;

                        // Stage 1: Try to find "Home - Away" (Unlikely in lineup text, but possible)
                        for (const line of lines) {
                            if (line.includes(' - ') || line.includes(' vs ')) {
                                const sep = line.includes(' - ') ? ' - ' : ' vs ';
                                const parts = line.split(sep);
                                if (parts.length === 2) {
                                    const hId = resolveTeamId(parts[0]);
                                    const aId = resolveTeamId(parts[1]);
                                    if (hId && aId) {
                                        foundHomeId = hId;
                                        foundAwayId = aId;
                                        break;
                                    }
                                }
                            }
                        }

                        // Stage 2: Scan for any team Names (Common in Lineup headers)
                        if (!foundHomeId || !foundAwayId) {
                            const foundTeams = new Set<string>();
                            const orderedTeams: string[] = [];

                            lines.forEach(line => {
                                // Skip obvious non-team lines
                                if (line.match(/\d+/) || line.includes('Teknik') || line.includes('Yedekler')) return;

                                const tId = resolveTeamId(line);
                                if (tId && !foundTeams.has(tId)) {
                                    foundTeams.add(tId);
                                    orderedTeams.push(tId);
                                }
                            });

                            if (orderedTeams.length >= 2) {
                                // Assume first two unique teams found are Home and Away
                                foundHomeId = orderedTeams[0];
                                foundAwayId = orderedTeams[1];
                            }
                        }

                        // Stage 3: Date Detection
                        lines.forEach(line => {
                            if (line.match(/\d{1,2}\.\d{1,2}\.\d{4}/)) {
                                const parts = line.split('-'); // Try split by - or space
                                const datePart = parts[0].trim(); // First part usually date
                                const [day, month, year] = datePart.split('.');
                                // Try finding time
                                let hour = '00', minute = '00';
                                const timeMatch = line.match(/(\d{2}):(\d{2})/);
                                if (timeMatch) {
                                    hour = timeMatch[1];
                                    minute = timeMatch[2];
                                }

                                const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
                                if (!isNaN(d.getTime())) {
                                    newMatch.date = d.toISOString();
                                }
                            }
                        });


                        if (foundHomeId && foundAwayId) {
                            newMatch.homeTeamId = foundHomeId;
                            newMatch.homeTeamName = getTeamName(foundHomeId);
                            newMatch.awayTeamId = foundAwayId;
                            newMatch.awayTeamName = getTeamName(foundAwayId);
                        }

                        // Auto-ID Logic
                        const activeWeek = match.week || 1;
                        if (activeWeek && newMatch.homeTeamId && newMatch.awayTeamId && newMatch.date) {
                            const d = new Date(newMatch.date);
                            const yyyy = d.getFullYear();
                            const mm = String(d.getMonth() + 1).padStart(2, '0');
                            const dd = String(d.getDate()).padStart(2, '0');
                            const newId = `week${activeWeek}-${newMatch.homeTeamId}-${newMatch.awayTeamId}-${yyyy}-${mm}-${dd}`;
                            newMatch.id = newId;
                        }

                        // --- ROBUST PLAYER PARSER ---
                        const homeXI: any[] = [];
                        const awayXI: any[] = [];
                        const homeSubs: any[] = [];
                        const awaySubs: any[] = [];
                        let hCoach = '';
                        let aCoach = '';

                        let section = 'xi'; // xi, subs, coach

                        // ... (Rest of the player parser state machine)
                        let buffer = {
                            hNum: null as string | null,
                            hName: null as string | null,
                            aName: null as string | null
                        };

                        // Helper to finalize a row
                        const flushRow = (aNum: string | null) => {
                            if (buffer.hNum && buffer.hName) {
                                const hP = { number: buffer.hNum, name: buffer.hName };
                                const aP = { number: aNum || '', name: buffer.aName || '' }; // aName might be empty

                                const targetH = section === 'xi' ? homeXI : homeSubs;
                                const targetA = section === 'xi' ? awayXI : awaySubs;

                                targetH.push(hP);
                                // Only push away player if data exists
                                if (aP.number || aP.name) targetA.push(aP);
                            }
                            // Reset
                            buffer = { hNum: null, hName: null, aName: null };
                        };

                        // 1. ITERATE LINES (Player Parsing)
                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i];
                            const lower = line.toLowerCase();

                            // Skip lines that were likely identified as Team Names (heuristic) if we want? 
                            // Actually, let's just let the parser run, it filters headers usually.

                            // Section switching
                            if (lower.includes('yedekler')) {
                                buffer = { hNum: null, hName: null, aName: null };
                                section = 'subs'; continue;
                            }
                            if (lower.includes('teknik direktör') || lower.includes('teknik sorumlusu') || /^(t\.?d\.?)$/i.test(line.trim())) {
                                buffer = { hNum: null, hName: null, aName: null };
                                section = 'coach'; continue;
                            }

                            // Coach Parsing
                            if (section === 'coach') {
                                // Aggressive cleaning of labels
                                let clean = line.replace(/(?:Teknik Direktör|Teknik Sorumlusu|T\.D\.|T\.D|TD)/gi, '').trim();
                                // Remove any leading/trailing punctuation like ":" or "-"
                                clean = clean.replace(/^[:\-\s]+|[:\-\s]+$/g, '');

                                if (clean.length < 3) continue;
                                // Specific blacklist for leftovers which might just be "TD" case insensitive
                                if (/^(td|t\.d|t\.d\.)$/i.test(clean)) continue;

                                const parts = clean.split(/\s{2,}|\t/);
                                if (parts.length >= 2) {
                                    hCoach = parts[0]; aCoach = parts[1];
                                } else {
                                    if (!hCoach) hCoach = clean; else if (!aCoach) aCoach = clean;
                                }
                                continue;
                            }

                            // Player Parsing: Tokenize the line
                            const tokens = [];

                            // Heuristic: If line looks like "1 Name Name 2", split it
                            const fullMatch = line.match(/^(\d+)\s+(.+?)\s+(.+?)\s+(\d+)$/);
                            if (fullMatch) {
                                tokens.push({ type: 'num', val: fullMatch[1] });
                                tokens.push({ type: 'str', val: fullMatch[2] });
                                tokens.push({ type: 'str', val: fullMatch[3] });
                                tokens.push({ type: 'num', val: fullMatch[4] });
                            } else {
                                // Sub-heuristic: "1 Name"
                                const startN = line.match(/^(\d+)\s+(.+)$/);
                                // Sub-heuristic: "Name 1"
                                const endN = line.match(/^(.+?)\s+(\d+)$/);
                                const justN = line.match(/^(\d+)$/);

                                if (justN) {
                                    tokens.push({ type: 'num', val: justN[1] });
                                } else if (startN) {
                                    tokens.push({ type: 'num', val: startN[1] });
                                    tokens.push({ type: 'str', val: startN[2] });
                                } else if (endN) {
                                    tokens.push({ type: 'str', val: endN[1] });
                                    tokens.push({ type: 'num', val: endN[2] });
                                } else {
                                    // Just text
                                    tokens.push({ type: 'str', val: line });
                                }
                            }

                            // 2. PROCESS TOKENS IN STATE MACHINE
                            for (const t of tokens) {
                                if (t.type === 'num') {
                                    if (!buffer.hNum) {
                                        // Found Home Num
                                        buffer.hNum = t.val;
                                    } else {
                                        // Found Away Num (End of Row)
                                        flushRow(t.val);
                                    }
                                } else {
                                    // Text token
                                    if (buffer.hNum && !buffer.hName) {
                                        buffer.hName = t.val;
                                    } else if (buffer.hNum && buffer.hName && !buffer.aName) {
                                        buffer.aName = t.val;
                                    }
                                }
                            }
                        }

                        // --- END PARSER ---

                        newMatch.lineups = {
                            home: homeXI,
                            away: awayXI,
                            homeSubs: homeSubs,
                            awaySubs: awaySubs,
                            homeCoach: hCoach || newMatch.lineups.homeCoach,
                            awayCoach: aCoach || newMatch.lineups.awayCoach
                        };
                        setMatch(newMatch);
                    }}
                />
                <div className="flex justify-between text-[10px] text-gray-500 px-1 mb-2">
                    <span>Tespit Edilen İlk 11: <strong>{match.lineups?.home?.length || 0}</strong> - <strong>{match.lineups?.away?.length || 0}</strong></span>
                    <span>Yedek: <strong>{match.lineups?.homeSubs?.length || 0}</strong> - <strong>{match.lineups?.awaySubs?.length || 0}</strong></span>
                </div>

            </div>




            {/* Stats Paste Section moved here, right above manual stats */}
            <div className="bg-orange-50 p-3 rounded mb-4 border border-orange-100">
                <h4 className="font-bold text-xs text-orange-800 mb-1 uppercase">İstatistik Girişi (TFF Kopyala-Yapıştır)</h4>
                <textarea
                    className="w-full text-xs p-2 border rounded h-24 font-mono text-gray-700"
                    placeholder="İstatistikleri yapıştırın (Topla Oynama, Şut vb)..."
                    value={statsRaw}
                    onChange={(e) => {
                        const text = e.target.value;
                        setStatsRaw(text);
                        if (!text.trim()) return;

                        const newMatch = { ...match };
                        if (!newMatch.stats) newMatch.stats = {} as MatchStats;

                        // Define map first so we can use keys for pre-processing
                        const map: Record<string, string> = {
                            'Topla Oynama': 'Possession', 'Toplam Şut': 'Shots', 'Kaleyi Bulan Şut': 'ShotsOnTarget',
                            'İsabetli Şut': 'ShotsOnTarget', 'Net Gol Şansı': 'BigChances', 'Köşe Vuruşu': 'Corners',
                            'Ofsayt': 'Offsides', 'Kurtarışlar': 'Saves', 'Kurtarış': 'Saves', 'Fauller': 'Fouls',
                            'Faul': 'Fouls', 'Sarı Kart': 'YellowCards', 'Kırmızı Kart': 'RedCards'
                        };

                        // Pre-Process: Separate merged values/keys (e.g. "0Topla Oynama" -> "0\nTopla Oynama")
                        let processed = text;
                        Object.keys(map).forEach(key => {
                            // Regex: Look for (Digit or %) followed immediately by the Key
                            const regex = new RegExp(`(\\d|%)(${key})`, 'g');
                            processed = processed.replace(regex, '$1\n$2');
                        });

                        // Normalize text
                        const lines = processed.split('\n').map(l => l.trim()).filter(l => l);

                        const values: Record<string, string[]> = {};

                        // Robust multi-format parser
                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i];
                            // Check if line starts with any of our map labels (ignoring trailing colons)
                            let matchedKey: string | undefined;
                            for (const k in map) {
                                // Clear label from possible colon etc for comparison
                                const cleanLine = line.split(':')[0].trim();
                                if (cleanLine === k) {
                                    matchedKey = k;
                                    break;
                                }
                            }

                            if (matchedKey) {
                                // The value could be on the same line (after :) or on the next lines
                                let val = '';
                                if (line.includes(':')) {
                                    val = line.split(':')[1].trim();
                                }

                                // If no value after colon, check next lines until we hit another label or end
                                if (!val) {
                                    let j = i + 1;
                                    while (j < lines.length) {
                                        const nextLine = lines[j];
                                        // If next line is another label, stop
                                        let isNextLabel = false;
                                        for (const k2 in map) { if (nextLine.startsWith(k2)) { isNextLabel = true; break; } }
                                        if (isNextLabel) break;

                                        // Otherwise, if it has any characters, take it as value and stop
                                        if (nextLine.trim()) {
                                            val = nextLine.trim();
                                            break;
                                        }
                                        j++;
                                    }
                                }

                                if (val) {
                                    const cleanVal = val.replace('%', '').trim();
                                    if (!values[matchedKey]) values[matchedKey] = [];
                                    values[matchedKey].push(cleanVal);
                                }
                            }
                        }

                        // Assign values: 1st time seen -> Home, 2nd time seen -> Away
                        const statKeys = Object.keys(map);
                        statKeys.forEach(k => {
                            const internalKey = map[k];
                            const vals = values[k];

                            const parseVal = (v: string) => {
                                if (internalKey === 'Possession') return parseFloat(v);
                                return parseInt(v);
                            };

                            if (vals && vals.length >= 2) {
                                (newMatch.stats as any)[`home${internalKey}`] = parseVal(vals[0]);
                                (newMatch.stats as any)[`away${internalKey}`] = parseVal(vals[1]);
                            } else if (vals && vals.length === 1) {
                                (newMatch.stats as any)[`home${internalKey}`] = parseVal(vals[0]);
                            }
                        });
                        setMatch(newMatch);
                    }}
                />

            </div>

            <div className="border-t pt-2 mt-2">
                <h4 className="font-bold text-sm text-gray-600 mb-1">Maç İstatistikleri</h4>
                <div className="space-y-2 text-sm">
                    {/* Possession */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="0.1" placeholder="Ev Topla Oyn" className="border p-2 rounded"
                            value={match.stats?.homePossession ?? ''}
                            onChange={e => updateStat('homePossession', e.target.value)}
                        />
                        <span className="text-center text-xs font-bold uppercase">Topla Oynama</span>
                        <input type="number" step="0.1" placeholder="Dep Topla Oyn" className="border p-2 rounded"
                            value={match.stats?.awayPossession ?? ''}
                            onChange={e => updateStat('awayPossession', e.target.value)}
                        />
                    </div>

                    {/* Shots */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="1" placeholder="Ev Şut" className="border p-2 rounded"
                            value={match.stats?.homeShots ?? ''}
                            onChange={e => updateStat('homeShots', e.target.value)}
                        />
                        <span className="text-center text-xs font-bold uppercase">Toplam Şut</span>
                        <input type="number" step="1" placeholder="Dep Şut" className="border p-2 rounded"
                            value={match.stats?.awayShots ?? ''}
                            onChange={e => updateStat('awayShots', e.target.value)}
                        />
                    </div>

                    {/* Shots on Target */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="1" placeholder="Ev İsabetli" className="border p-2 rounded"
                            value={match.stats?.homeShotsOnTarget ?? ''}
                            onChange={e => updateStat('homeShotsOnTarget', e.target.value)}
                        />
                        <span className="text-center text-xs font-bold uppercase">İsabetli Şut</span>
                        <input type="number" step="1" placeholder="Dep İsabetli" className="border p-2 rounded"
                            value={match.stats?.awayShotsOnTarget ?? ''}
                            onChange={e => updateStat('awayShotsOnTarget', e.target.value)}
                        />
                    </div>

                    {/* Big Chances */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="1" placeholder="Ev Net Gol" className="border p-2 rounded"
                            value={match.stats?.homeBigChances ?? ''}
                            onChange={e => updateStat('homeBigChances', e.target.value)}
                        />
                        <span className="text-center text-xs font-bold uppercase">Net Gol Şansı</span>
                        <input type="number" step="1" placeholder="Dep Net Gol" className="border p-2 rounded"
                            value={match.stats?.awayBigChances ?? ''}
                            onChange={e => updateStat('awayBigChances', e.target.value)}
                        />
                    </div>

                    {/* Corners */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="1" placeholder="Ev Korner" className="border p-2 rounded"
                            value={match.stats?.homeCorners ?? ''}
                            onChange={e => updateStat('homeCorners', e.target.value)}
                        />
                        <span className="text-center text-xs font-bold uppercase">Köşe Vuruşu</span>
                        <input type="number" step="1" placeholder="Dep Korner" className="border p-2 rounded"
                            value={match.stats?.awayCorners ?? ''}
                            onChange={e => updateStat('awayCorners', e.target.value)}
                        />
                    </div>

                    {/* Offsides */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="1" placeholder="Ev Ofsayt" className="border p-2 rounded"
                            value={match.stats?.homeOffsides ?? ''}
                            onChange={e => updateStat('homeOffsides', e.target.value)}
                        />
                        <span className="text-center text-xs font-bold uppercase">Ofsayt</span>
                        <input type="number" step="1" placeholder="Dep Ofsayt" className="border p-2 rounded"
                            value={match.stats?.awayOffsides ?? ''}
                            onChange={e => updateStat('awayOffsides', e.target.value)}
                        />
                    </div>

                    {/* Saves */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="1" placeholder="Ev Kurtarış" className="border p-2 rounded"
                            value={match.stats?.homeSaves ?? ''}
                            onChange={e => updateStat('homeSaves', e.target.value)}
                        />
                        <span className="text-center text-xs font-bold uppercase">Kurtarış</span>
                        <input type="number" step="1" placeholder="Dep Kurtarış" className="border p-2 rounded"
                            value={match.stats?.awaySaves ?? ''}
                            onChange={e => updateStat('awaySaves', e.target.value)}
                        />
                    </div>

                    {/* Fouls */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="1" placeholder="Ev Faul" className="border p-2 rounded"
                            value={match.stats?.homeFouls ?? ''}
                            onChange={e => updateStat('homeFouls', e.target.value)}
                        />
                        <span className="text-center text-xs font-bold uppercase">Faul</span>
                        <input type="number" step="1" placeholder="Dep Faul" className="border p-2 rounded"
                            value={match.stats?.awayFouls ?? ''}
                            onChange={e => updateStat('awayFouls', e.target.value)}
                        />
                    </div>

                    {/* Yellow Cards */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="1" placeholder="Ev Sarı" className="border p-2 rounded bg-yellow-50"
                            value={match.stats?.homeYellowCards ?? ''}
                            onChange={e => updateStat('homeYellowCards', e.target.value)}
                        />
                        <span className="text-center text-xs font-bold uppercase">Sarı Kart</span>
                        <input type="number" step="1" placeholder="Dep Sarı" className="border p-2 rounded bg-yellow-50"
                            value={match.stats?.awayYellowCards ?? ''}
                            onChange={e => updateStat('awayYellowCards', e.target.value)}
                        />
                    </div>

                    {/* Red Cards */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="1" placeholder="Ev Kırmızı" className="border p-2 rounded bg-red-50"
                            value={match.stats?.homeRedCards ?? ''}
                            onChange={e => updateStat('homeRedCards', e.target.value)}
                        />
                        <span className="text-center text-xs font-bold uppercase">Kırmızı Kart</span>
                        <input type="number" step="1" placeholder="Dep Kırmızı" className="border p-2 rounded bg-red-50"
                            value={match.stats?.awayRedCards ?? ''}
                            onChange={e => updateStat('awayRedCards', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div className="border-t pt-2 mt-2">

                <h4 className="font-bold text-sm text-gray-600 mb-2">Hakemler ve Görevliler</h4>

                {/* Helper Component for List Management */}
                {/* We'll inline list management for simplicity for now */}

                {/* Referees */}
                <div className="mb-4 bg-gray-50 p-2 rounded">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs uppercase text-gray-700">Hakemler (Max 4)</span>
                        <button type="button"
                            onClick={() => {
                                const refs = match.officials?.referees || [];
                                if (refs.length < 4) setMatch({ ...match, officials: { ...match.officials!, referees: [...refs, ''] } });
                            }}
                            className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded hover:bg-blue-200"
                        >Ekle +</button>
                    </div>
                    {(match.officials?.referees || []).map((ref, i) => (
                        <div key={i} className="flex gap-1 mb-1">
                            <input
                                placeholder={i === 0 ? "Orta Hakem" : i === 3 ? "4. Hakem" : `Yardımcı ${i}`}
                                className="border border-gray-300 p-1 w-full rounded text-sm"
                                value={ref}
                                onChange={(e) => {
                                    const newRefs = [...(match.officials?.referees || [])];
                                    newRefs[i] = e.target.value;
                                    setMatch({ ...match, officials: { ...match.officials!, referees: newRefs } });
                                }}
                            />
                            <button type="button"
                                onClick={() => {
                                    const newRefs = (match.officials?.referees || []).filter((_, idx) => idx !== i);
                                    setMatch({ ...match, officials: { ...match.officials!, referees: newRefs } });
                                }}
                                className="text-red-500 font-bold px-2 hover:bg-red-100 rounded"
                            >×</button>
                        </div>
                    ))}
                    {(!match.officials?.referees?.length) && <span className="text-xs text-gray-400 italic">Hiç hakem eklenmedi.</span>}
                </div>

                {/* VAR */}
                <div className="mb-4 bg-gray-50 p-2 rounded">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs uppercase text-gray-700">VAR Ekibi (Max 3)</span>
                        <button type="button"
                            onClick={() => {
                                const vars = match.officials?.varReferees || [];
                                if (vars.length < 3) setMatch({ ...match, officials: { ...match.officials!, varReferees: [...vars, ''] } });
                            }}
                            className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded hover:bg-purple-200"
                        >Ekle +</button>
                    </div>
                    {(match.officials?.varReferees || []).map((v, i) => (
                        <div key={i} className="flex gap-1 mb-1">
                            <input
                                placeholder={i === 0 ? "VAR" : "AVAR"}
                                className="border border-gray-300 p-1 w-full rounded text-sm"
                                value={v}
                                onChange={(e) => {
                                    const newVars = [...(match.officials?.varReferees || [])];
                                    newVars[i] = e.target.value;
                                    setMatch({ ...match, officials: { ...match.officials!, varReferees: newVars } });
                                }}
                            />
                            <button type="button"
                                onClick={() => {
                                    const newVars = (match.officials?.varReferees || []).filter((_, idx) => idx !== i);
                                    setMatch({ ...match, officials: { ...match.officials!, varReferees: newVars } });
                                }}
                                className="text-red-500 font-bold px-2 hover:bg-red-100 rounded"
                            >×</button>
                        </div>
                    ))}
                </div>

                {/* Observers */}
                <div className="mb-4 bg-gray-50 p-2 rounded">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs uppercase text-gray-700">Gözlemciler</span>
                        <button type="button"
                            onClick={() => {
                                const obs = match.officials?.observers || [];
                                setMatch({ ...match, officials: { ...match.officials!, observers: [...obs, ''] } });
                            }}
                            className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded hover:bg-green-200"
                        >Ekle +</button>
                    </div>
                    {(match.officials?.observers || []).map((o, i) => (
                        <div key={i} className="flex gap-1 mb-1">
                            <input
                                placeholder="Gözlemci Adı"
                                className="border border-gray-300 p-1 w-full rounded text-sm"
                                value={o}
                                onChange={(e) => {
                                    const newObs = [...(match.officials?.observers || [])];
                                    newObs[i] = e.target.value;
                                    setMatch({ ...match, officials: { ...match.officials!, observers: newObs } });
                                }}
                            />
                            <button type="button"
                                onClick={() => {
                                    const newObs = (match.officials?.observers || []).filter((_, idx) => idx !== i);
                                    setMatch({ ...match, officials: { ...match.officials!, observers: newObs } });
                                }}
                                className="text-red-500 font-bold px-2 hover:bg-red-100 rounded"
                            >×</button>
                        </div>
                    ))}
                </div>

                {/* Representatives */}
                <div className="mb-4 bg-gray-50 p-2 rounded">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-xs uppercase text-gray-700">Temsilciler</span>
                        <button type="button"
                            onClick={() => {
                                const reps = match.officials?.representatives || [];
                                setMatch({ ...match, officials: { ...match.officials!, representatives: [...reps, ''] } });
                            }}
                            className="bg-orange-100 text-orange-700 text-xs px-2 py-1 rounded hover:bg-orange-200"
                        >Ekle +</button>
                    </div>
                    {(match.officials?.representatives || []).map((r, i) => (
                        <div key={i} className="flex gap-1 mb-1">
                            <input
                                placeholder="Temsilci Adı"
                                className="border border-gray-300 p-1 w-full rounded text-sm"
                                value={r}
                                onChange={(e) => {
                                    const newReps = [...(match.officials?.representatives || [])];
                                    newReps[i] = e.target.value;
                                    setMatch({ ...match, officials: { ...match.officials!, representatives: newReps } });
                                }}
                            />
                            <button type="button"
                                onClick={() => {
                                    const newReps = (match.officials?.representatives || []).filter((_, idx) => idx !== i);
                                    setMatch({ ...match, officials: { ...match.officials!, representatives: newReps } });
                                }}
                                className="text-red-500 font-bold px-2 hover:bg-red-100 rounded"
                            >×</button>
                        </div>
                    ))}
                </div>

            </div>

            <button
                type="button"
                onClick={() => setMatch({ ...match, status: match.status === 'published' ? 'draft' : 'published' })}
                className={`mb-2 p-2 rounded w-full font-bold border ${match.status === 'published' ? 'bg-green-100 text-green-700 border-green-300' : 'bg-gray-100 text-gray-500 border-gray-300'}`}
            >
                {match.status === 'published' ? 'YAYINDA (Published)' : 'TASLAK (Draft)'}
            </button>
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded w-full font-medium">Maçı Kaydet</button>
        </form>
    );
};

export const IncidentForm = ({ apiKey, authToken, defaultMatchId, existingIncidents, onSuccess }: BaseProps) => {
    const [matchId, setMatchId] = useState('week1-gfk-gs');
    const [incident, setIncident] = useState<Partial<Incident>>({
        id: '',
        minute: 1,
        description: '',
        refereeDecision: '',
        finalDecision: '',
        impact: 'none',
        varRecommendation: 'none',
        correctDecision: ''
    });

    // Sync with global match ID
    if (defaultMatchId && matchId !== defaultMatchId) {
        setMatchId(defaultMatchId);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/admin/incidents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': apiKey, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
            body: JSON.stringify({ ...incident, matchId }),
        });
        if (res.ok) {
            alert('Incident Added!');
            // Reset form but keep matched matchId
            setIncident({
                id: '',
                minute: 1,
                description: '',
                refereeDecision: '',
                finalDecision: '',
                impact: 'none',
                varRecommendation: 'none',
                correctDecision: '',
                varDecision: '',
                favorOf: '',
                against: '',
                videoUrl: ''
            });
            if (onSuccess) onSuccess();
        } else alert('Error adding incident');
    };

    const handleLoad = async () => {
        if (!matchId || !incident.id) return alert('Lütfen Maç ID ve Pozisyon ID giriniz');
        try {
            const snap = await getDoc(doc(db, 'matches', matchId, 'incidents', incident.id!));
            if (snap.exists()) {
                setIncident(snap.data() as Incident);
                alert('Pozisyon verisi yüklendi!');
            } else {
                alert('Pozisyon bulunamadı.');
            }
        } catch (e) {
            console.error(e);
            alert('Yükleme hatası seçili IDs');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-gray-200 bg-white rounded shadow-sm">
            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Pozisyon Ekle (Incident)</h3>
            <input placeholder="Hangi Maç ID?" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={matchId} onChange={e => setMatchId(e.target.value)} required />
            <div className="flex gap-2">
                <input type="text" placeholder="Dk (örn: 45+2)" className="border border-gray-300 p-2 w-24 rounded text-gray-900" value={incident.minute || ''} onChange={e => setIncident({ ...incident, minute: e.target.value })} />
                <input placeholder="Pozisyon ID (örn: inc1)" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={incident.id} onChange={e => setIncident({ ...incident, id: e.target.value })} required />
                <button type="button" onClick={handleLoad} className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded text-gray-700 font-bold whitespace-nowrap">Getir</button>
            </div>
            <textarea placeholder="Pozisyon Açıklaması" rows={3} className="border border-gray-300 p-2 w-full rounded text-gray-900" value={incident.description} onChange={e => setIncident({ ...incident, description: e.target.value })} />
            <input placeholder="YouTube Linki (örn: https://youtu.be/...?t=120)" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={incident.videoUrl || ''} onChange={e => setIncident({ ...incident, videoUrl: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Hakem Kararı</label>
                    <select className="border border-gray-300 p-2 w-full rounded text-gray-900" value={incident.refereeDecision} onChange={e => setIncident({ ...incident, refereeDecision: e.target.value })}>
                        <option value="">(Seçiniz)</option>
                        <option value="Devam">Devam</option>
                        <option value="Faul">Faul</option>
                        <option value="Gol">Gol</option>
                        <option value="Ofsayt">Ofsayt</option>
                        <option value="Taç">Taç</option>
                        <option value="Korner">Korner</option>
                        <option value="Sarı Kart">Sarı Kart</option>
                        <option value="Sarı Kart Verilmedi">Sarı Kart Verilmedi</option>
                        <option value="Kırmızı Kart">Kırmızı Kart</option>
                        <option value="Kırmızı Kart Verilmedi">Kırmızı Kart Verilmedi</option>
                        <option value="Penaltı">Penaltı</option>
                        <option value="Penaltı İptal">Penaltı İptal</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">VAR Önerisi (Yeni)</label>
                    <select className="border border-gray-300 p-2 w-full rounded text-gray-900" value={incident.varRecommendation || 'none'} onChange={e => setIncident({ ...incident, varRecommendation: e.target.value as any })}>
                        <option value="none">İnceleme Önerisi Yok</option>
                        <option value="review">İnceleme Önerisi</option>
                        <option value="monitor_only">Sadece Takip</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">VAR Sonucu</label>
                    <select className="border border-gray-300 p-2 w-full rounded text-gray-900" value={incident.varDecision || ''} onChange={e => setIncident({ ...incident, varDecision: e.target.value })}>
                        <option value="">(Yok/Seçiniz)</option>
                        <option value="Müdahale Yok">Müdahale Yok</option>
                        <option value="İnceleme Önerisi">İnceleme Önerisi</option>
                        <option value="Gol İptal">Gol İptal</option>
                        <option value="Gol Onay">Gol Onay</option>
                        <option value="Penaltı Verildi">Penaltı Verildi</option>
                        <option value="Penaltı İptal">Penaltı İptal</option>
                        <option value="Kırmızı Kart">Kırmızı Kart</option>
                        <option value="Kart İptal">Kart İptal</option>
                        <option value="Ofsayt">Ofsayt</option>
                    </select>
                </div>
                <div className="col-span-2 space-y-1">
                    <label className="text-xs font-bold text-green-700">Hakem Ne Yapmalıydı?</label>
                    <input placeholder="Örn: Net Penaltı, Devam Kararı Doğru" className="border border-green-300 bg-green-50 p-2 w-full rounded text-gray-900 placeholder-green-700" value={incident.correctDecision || ''} onChange={e => setIncident({ ...incident, correctDecision: e.target.value })} />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-green-600">Lehe (Takım ID)</label>
                    <input placeholder="Örn: galatasaray" className="border border-green-200 bg-green-50 p-2 w-full rounded text-gray-900" value={incident.favorOf || ''} onChange={e => setIncident({ ...incident, favorOf: e.target.value })} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-red-600">Aleyhe (Takım ID)</label>
                    <input placeholder="Örn: fenerbahce" className="border border-red-200 bg-red-50 p-2 w-full rounded text-gray-900" value={incident.against || ''} onChange={e => setIncident({ ...incident, against: e.target.value })} />
                </div>
            </div>


            <div className="mt-2">
                <label className="text-xs font-bold text-gray-500">Verilmesi Gereken Karar (Nihai)</label>
                <input placeholder="Örn: Net Penaltı, Devam Doğru vb." className="border border-gray-300 p-2 w-full rounded text-gray-900" value={incident.finalDecision || ''} onChange={e => setIncident({ ...incident, finalDecision: e.target.value })} />
            </div>
            <div className='flex gap-2'>
                <button type="submit" className="bg-red-600 hover:bg-red-700 text-white p-2 rounded flex-1 font-medium">Pozisyonu Kaydet</button>
                {incident.id && (
                    <button
                        type="button"
                        onClick={async () => {
                            if (!confirm('Pozisyonu silmek istediğine emin misin?')) return;
                            const res = await fetch(`/api/admin/incidents?matchId=${incident.matchId}&id=${incident.id}`, {
                                method: 'DELETE',
                                headers: { 'x-admin-key': apiKey, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
                            });
                            if (res.ok) {
                                alert('Pozisyon Silindi!');
                                setIncident({ ...incident, id: '', description: '', refereeDecision: '', finalDecision: '' });
                                if (onSuccess) onSuccess();
                            } else {
                                alert('Silme başarısız!');
                            }
                        }}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded w-16"
                    >
                        Sil
                    </button>
                )}
            </div>

            {/* Existing Incidents List */}
            {
                existingIncidents && existingIncidents.length > 0 && (
                    <div className="mt-4 border-t pt-4">
                        <h4 className="font-bold text-gray-700 mb-2">Ekli Pozisyonlar (Düzenlemek için tıkla):</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {existingIncidents.map((inc: any) => (
                                <div
                                    key={inc.id}
                                    onClick={() => setIncident(inc)}
                                    className="p-2 border rounded bg-white hover:bg-red-50 cursor-pointer text-sm"
                                >
                                    <span className="font-bold text-red-600 mr-2">{inc.minute}'</span>
                                    <span className="font-mono text-xs text-gray-400">[{inc.id}]</span>
                                    <p className="truncate text-gray-800">{inc.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }
        </form>
    );
};

export const OpinionForm = ({ apiKey, authToken, defaultMatchId, existingIncidents, onSuccess }: BaseProps) => {
    const [matchId, setMatchId] = useState('week1-gfk-gs');
    const [incidentId, setIncidentId] = useState('');
    const [opinion, setOpinion] = useState<Partial<Opinion>>({
        id: '', criticName: 'Deniz Çoban', opinion: '', shortOpinion: '', reasoning: '', judgment: 'correct'
    });

    if (defaultMatchId && matchId !== defaultMatchId) {
        setMatchId(defaultMatchId);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/admin/opinions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': apiKey, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
            body: JSON.stringify({ ...opinion, matchId, incidentId }),
        });
        if (res.ok) {
            alert('Opinion Added!');
            // Reset fields
            setOpinion({
                id: '',
                criticName: opinion.criticName || 'Deniz Çoban', // Keep name for convenience
                opinion: '',
                shortOpinion: '',
                reasoning: '',
                judgment: 'correct',
                type: 'trio'
            });
            // We keep matchId and incidentId for convenience of adding multiple opinions to same incident
            if (onSuccess) onSuccess();
        } else {
            const errData = await res.json();
            alert(`Error adding opinion: ${errData.error} - ${JSON.stringify(errData.details || '')}`);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-gray-200 bg-white rounded shadow-sm">
            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Yorum Ekle (Opinion)</h3>
            <div className="grid grid-cols-2 gap-2">
                <input placeholder="Match ID" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={matchId} onChange={e => setMatchId(e.target.value)} required />
                <div className="flex flex-col">
                    <select
                        className="border border-gray-300 p-2 w-full rounded text-gray-900"
                        value={incidentId}
                        onChange={e => setIncidentId(e.target.value)}
                        required
                    >
                        <option value="">(Pozisyon Seçiniz)</option>
                        {existingIncidents && [...existingIncidents].sort((a: any, b: any) => a.id.localeCompare(b.id, undefined, { numeric: true })).map((inc: any) => (
                            <option key={inc.id} value={inc.id}>
                                {inc.minute}' - {inc.id} - {inc.description?.substring(0, 30)}...
                            </option>
                        ))}
                    </select>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <input placeholder="Yorum ID" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={opinion.id} onChange={e => setOpinion({ ...opinion, id: e.target.value })} required />
                <select className="border border-gray-300 p-2 w-full rounded text-gray-900" value={opinion.type || 'trio'} onChange={e => setOpinion({ ...opinion, type: e.target.value as any })}>
                    <option value="trio">Trio Yorumu</option>
                    <option value="general">Genel Yorumcu</option>
                </select>
            </div>
            {/* Manual Judgment Selection */}
            <div className="mb-2">
                <label className="text-xs font-bold text-gray-500 block mb-1">Karar Durumu (Görsel İçin)</label>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setOpinion({ ...opinion, judgment: 'correct' })}
                        className={`flex-1 p-2 rounded border text-sm font-bold flex items-center justify-center gap-2 ${opinion.judgment === 'correct' ? 'bg-green-100 border-green-500 text-green-700 ring-2 ring-green-500/20' : 'bg-white border-gray-300 text-gray-400 hover:bg-gray-50'}`}
                    >
                        <span>✅</span> Doğru
                    </button>
                    <button
                        type="button"
                        onClick={() => setOpinion({ ...opinion, judgment: 'incorrect' })}
                        className={`flex-1 p-2 rounded border text-sm font-bold flex items-center justify-center gap-2 ${opinion.judgment === 'incorrect' ? 'bg-red-100 border-red-500 text-red-700 ring-2 ring-red-500/20' : 'bg-white border-gray-300 text-gray-400 hover:bg-gray-50'}`}
                    >
                        <span>❌</span> Hatalı
                    </button>
                    <button
                        type="button"
                        onClick={() => setOpinion({ ...opinion, judgment: 'controversial' })}
                        className={`flex-1 p-2 rounded border text-sm font-bold flex items-center justify-center gap-2 ${opinion.judgment === 'controversial' ? 'bg-amber-100 border-amber-500 text-amber-700 ring-2 ring-amber-500/20' : 'bg-white border-gray-300 text-gray-400 hover:bg-gray-50'}`}
                    >
                        <span>⚠️</span> Tartışmalı
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <input placeholder="Yorumcu İsmi" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={opinion.criticName} onChange={e => setOpinion({ ...opinion, criticName: e.target.value })} required />
                {/* Predefined for Trio just in case */}
                <select className="border border-gray-300 p-2 w-full rounded text-gray-900" onChange={e => setOpinion({ ...opinion, criticName: e.target.value })}>
                    <option value="">(İsim Seç)</option>
                    <option value="Deniz Çoban">Deniz Çoban</option>
                    <option value="Bahattin Duran">Bahattin Duran</option>
                    <option value="Bülent Yıldırım">Bülent Yıldırım</option>
                </select>
            </div>
            <textarea placeholder="Kısa Yorum (Özet)..." rows={2} className="border border-gray-300 p-2 w-full rounded text-gray-900 mb-2" value={opinion.shortOpinion || ''} onChange={e => setOpinion({ ...opinion, shortOpinion: e.target.value })} />
            <textarea placeholder="Uzun Yorum (Detaylı)..." rows={4} className="border border-gray-300 p-2 w-full rounded text-gray-900" value={opinion.opinion} onChange={e => setOpinion({ ...opinion, opinion: e.target.value })} />
            <div className='flex gap-2'>
                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white p-2 rounded flex-1 font-medium">Yorumu Kaydet</button>
                {opinion.id && (
                    <button
                        type="button"
                        onClick={async () => {
                            if (!confirm('Yorumu silmek istediğine emin misin?')) return;
                            const res = await fetch(`/api/admin/opinions?matchId=${matchId}&incidentId=${incidentId}&id=${opinion.id}`, {
                                method: 'DELETE',
                                headers: { 'x-admin-key': apiKey, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
                            });
                            if (res.ok) {
                                alert('Yorum Silindi!');
                                setOpinion({ ...opinion, id: '', opinion: '', reasoning: '' });
                                if (onSuccess) onSuccess();
                            } else {
                                alert('Silme başarısız!');
                            }
                        }}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded w-16"
                    >
                        Sil
                    </button>
                )}
            </div>

            {/* Existing Opinions List */}
            {existingIncidents && existingIncidents.length > 0 && (
                <div className="mt-4 border-t pt-4">
                    <h4 className="font-bold text-gray-700 mb-2">Ekli Yorumlar (Düzenlemek için tıkla):</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {existingIncidents.flatMap((inc: any) =>
                            (inc.opinions || []).map((op: any) => ({ ...op, incidentData: inc }))
                        ).map((op: any) => (
                            <div
                                key={`${op.incidentData.id}-${op.id}`}
                                onClick={() => {
                                    setIncidentId(op.incidentData.id);
                                    setOpinion(op);
                                }}
                                className="p-2 border rounded bg-white hover:bg-green-50 cursor-pointer text-sm"
                            >
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>{op.incidentData.minute}' - {op.incidentData.id}</span>
                                    <span className="font-mono">[{op.id}]</span>
                                </div>
                                <div className="font-bold text-gray-800">{op.criticName}</div>
                                <p className="truncate text-gray-600">{op.opinion}</p>
                            </div>
                        ))}
                        {existingIncidents.every(i => !i.opinions?.length) && <p className="text-gray-400 text-sm">Henüz bir yorum yok.</p>}
                    </div>
                </div>
            )}
        </form>
    );
};

// Incident and Opinion forms would be similar...
