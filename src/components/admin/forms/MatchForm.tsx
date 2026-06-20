"use client";

import { useState } from 'react';
import { Match, MatchStats } from '@/types';
import { resolveTeamId, getTeamName } from '@/lib/teams';
import { parseMatchData } from '@/lib/matchParser';
import { MatchSelect } from '../ExtraForms';
import { toast } from 'sonner';

// Auto-generate ID helper
const generateMatchId = (m: Partial<Match>) => {
    const activeWeek = m.week || 1;
    const prefix = m.competition === 'cup' ? 'cup' : 'week';
    const groupPart = (m.competition === 'cup' && m.group) ? `-${m.group}` : '';

    if (m.homeTeamId && m.awayTeamId && m.date) {
        const d = new Date(m.date);
        if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${prefix}${activeWeek}${groupPart}-${m.homeTeamId}-${m.awayTeamId}-${yyyy}-${mm}-${dd}`;
        }
    }
    return m.id || '';
};

interface MatchFormProps {
    apiKey: string;
    authToken?: string;
    preloadedMatch?: Match | null;
    season?: string;
    onSuccess?: (savedMatchId: string, week: number) => void;
}

export const MatchForm = ({ apiKey, authToken, preloadedMatch, season, onSuccess }: MatchFormProps) => {
    const [match, setMatch] = useState<Partial<Match>>(() => ({
        id: '',
        week: 1,
        date: new Date().toISOString(),
        status: 'draft',
        competition: 'league',
        group: '',
        season: season || '2025-2026',
        ...preloadedMatch
    }));
    const [originalId, setOriginalId] = useState<string>(preloadedMatch?.id || '');

    // Local states for raw paste data
    const [smartRaw, setSmartRaw] = useState('');
    const [statsRaw, setStatsRaw] = useState('');

    const updateMatchState = (updates: Partial<Match> | ((prev: Partial<Match>) => Partial<Match>)) => {
        setMatch(prev => {
            const next = typeof updates === 'function' ? updates(prev) : { ...prev, ...updates };
            if (!originalId) {
                const newId = generateMatchId(next);
                if (newId) next.id = newId;
            }
            return next;
        });
    };

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

    const updateBallInPlayTime = (val: string) => {
        setMatch(prev => {
            const currentStats = prev.refereeStats;
            const prevVal = currentStats?.ballInPlayTime || '';
            
            let finalVal = val;
            if (val.length > prevVal.length) {
                // If it ends with MM:SS, append " / "
                const matchPattern = val.match(/^(\d+:\d{2})$/);
                if (matchPattern) {
                    finalVal = val + ' / ';
                }
            }

            const hasOtherFields = !!(currentStats && (
                (currentStats.fouls !== undefined && currentStats.fouls !== 0) ||
                (currentStats.yellowCards !== undefined && currentStats.yellowCards !== 0) ||
                (currentStats.redCards !== undefined && currentStats.redCards !== 0) ||
                (currentStats.incorrectDecisions !== undefined && currentStats.incorrectDecisions !== 0) ||
                (currentStats.errorsFavoringHome !== undefined && currentStats.errorsFavoringAway !== 0) ||
                (currentStats.homeErrors && currentStats.homeErrors.length > 0) ||
                (currentStats.awayErrors && currentStats.awayErrors.length > 0) ||
                (currentStats.performanceNotes && currentStats.performanceNotes.length > 0)
            ));

            if (!finalVal && !hasOtherFields) {
                const { refereeStats, ...rest } = prev;
                return rest;
            }

            return {
                ...prev,
                refereeStats: {
                    fouls: currentStats?.fouls ?? 0,
                    yellowCards: currentStats?.yellowCards ?? 0,
                    redCards: currentStats?.redCards ?? 0,
                    incorrectDecisions: currentStats?.incorrectDecisions ?? 0,
                    errorsFavoringHome: currentStats?.errorsFavoringHome ?? 0,
                    errorsFavoringAway: currentStats?.errorsFavoringAway ?? 0,
                    homeErrors: currentStats?.homeErrors ?? [],
                    awayErrors: currentStats?.awayErrors ?? [],
                    performanceNotes: currentStats?.performanceNotes ?? [],
                    ...currentStats,
                    ballInPlayTime: finalVal
                }
            };
        });
    };

    const updateOfficial = (key: 'referees' | 'varReferees' | 'observers' | 'representatives', index: number, value: string) => {
        setMatch(prev => {
            const oldOfficials = prev.officials || {
                referees: [],
                varReferees: [],
                observers: [],
                representatives: []
            };
            const currentArray = [...(oldOfficials[key] || [])];
            currentArray[index] = value;
            return {
                ...prev,
                officials: {
                    referees: oldOfficials.referees || [],
                    varReferees: oldOfficials.varReferees || [],
                    observers: oldOfficials.observers || [],
                    representatives: oldOfficials.representatives || [],
                    [key]: currentArray
                }
            };
        });
    };

    const addOfficial = (key: 'referees' | 'varReferees' | 'observers' | 'representatives') => {
        setMatch(prev => {
            const oldOfficials = prev.officials || {
                referees: [],
                varReferees: [],
                observers: [],
                representatives: []
            };
            const currentArray = [...(oldOfficials[key] || [])];
            return {
                ...prev,
                officials: {
                    referees: oldOfficials.referees || [],
                    varReferees: oldOfficials.varReferees || [],
                    observers: oldOfficials.observers || [],
                    representatives: oldOfficials.representatives || [],
                    [key]: [...currentArray, '']
                }
            };
        });
    };

    const removeOfficial = (key: 'referees' | 'varReferees' | 'observers' | 'representatives', index: number) => {
        setMatch(prev => {
            const oldOfficials = prev.officials || {
                referees: [],
                varReferees: [],
                observers: [],
                representatives: []
            };
            const currentArray = [...(oldOfficials[key] || [])].filter((_, idx) => idx !== index);
            return {
                ...prev,
                officials: {
                    referees: oldOfficials.referees || [],
                    varReferees: oldOfficials.varReferees || [],
                    observers: oldOfficials.observers || [],
                    representatives: oldOfficials.representatives || [],
                    [key]: currentArray
                }
            };
        });
    };

    const prepareMatchForSave = (m: Partial<Match>) => {
        const payload = { ...m };
        if (payload.officials) {
            const refs = payload.officials.referees || [];
            if (refs[0]) payload.referee = refs[0];
            payload.officials.assistants = refs.slice(1, 3).filter(Boolean);
            if (refs[3]) payload.officials.fourthOfficial = refs[3];

            const vars = payload.officials.varReferees || [];
            if (vars[0]) payload.varReferee = vars[0];
            payload.officials.avarReferees = vars.slice(1).filter(Boolean);
        }

        if (payload.stats) {
            const cleanStats: Record<string, number> = {};
            let hasValue = false;
            Object.entries(payload.stats).forEach(([key, val]) => {
                if (val !== '' && val !== null && val !== undefined) {
                    cleanStats[key] = Number(val);
                    hasValue = true;
                }
            });
            // If No stats provided and it's a cup match, just remove the stats object
            if (!hasValue && payload.competition === 'cup') {
                delete payload.stats;
            } else {
                payload.stats = cleanStats;
            }
        }

        if (payload.refereeStats) {
            const rs = payload.refereeStats;
            const isEmpty = !rs.ballInPlayTime &&
                !rs.fouls &&
                !rs.yellowCards &&
                !rs.redCards &&
                !rs.incorrectDecisions &&
                !rs.errorsFavoringHome &&
                !rs.errorsFavoringAway &&
                (!rs.homeErrors || rs.homeErrors.length === 0) &&
                (!rs.awayErrors || rs.awayErrors.length === 0) &&
                (!rs.performanceNotes || rs.performanceNotes.length === 0);

            if (isEmpty) {
                delete payload.refereeStats;
            } else {
                payload.refereeStats = {
                    fouls: rs.fouls || 0,
                    yellowCards: rs.yellowCards || 0,
                    redCards: rs.redCards || 0,
                    incorrectDecisions: rs.incorrectDecisions || 0,
                    errorsFavoringHome: rs.errorsFavoringHome || 0,
                    errorsFavoringAway: rs.errorsFavoringAway || 0,
                    ballInPlayTime: rs.ballInPlayTime || '00:00',
                    homeErrors: rs.homeErrors || [],
                    awayErrors: rs.awayErrors || [],
                    performanceNotes: rs.performanceNotes || [],
                };
            }
        }

        return payload;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let activeId = match.id;

        if (!activeId) {
            if (match.homeTeamId && match.awayTeamId && match.date) {
                const d = new Date(match.date);
                if (!isNaN(d.getTime())) {
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    const prefix = match.competition === 'cup' ? 'cup' : 'week';
                    const groupPart = (match.competition === 'cup' && match.group) ? `-${match.group}` : '';
                    activeId = `${prefix}${match.week || 1}${groupPart}-${match.homeTeamId}-${match.awayTeamId}-${yyyy}-${mm}-${dd}`;
                    setMatch(prev => ({ ...prev, id: activeId }));
                }
            }
        }

        if (!activeId) return toast.error('Lütfen önce Maç ID giriniz (veya verileri yapıştırınız).');

        const payload = prepareMatchForSave({ ...match, id: activeId, season: season || match.season });
        const res = await fetch('/api/admin/matches', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': apiKey,
                ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
            },
            body: JSON.stringify(payload),
        });
        if (res.ok) {
            toast.success(`Maç Başarıyla Kaydedildi! ✅`);
            window.scrollTo({ top: 0, behavior: 'smooth' });
            // Reset form
            setMatch({
                id: '',
                week: match.week || 1,
                date: new Date().toISOString(),
                status: 'draft',
                competition: match.competition || 'league',
                group: match.group || '',
                season: season || match.season
            });
            setOriginalId('');
            setSmartRaw('');
            setStatsRaw('');
            if (onSuccess) {
                onSuccess(activeId, match.week || 1);
            }
        } else {
            const err = await res.json();
            toast.error(`Hata: ${err.error}`);
        }
    };

    const handleLoad = async () => {
        if (!match.id) return toast.error('Lütfen Maç ID giriniz');
        const targetId = match.id.trim();
        try {
            const res = await fetch(`/api/admin/matches?id=${targetId}`, {
                method: 'GET',
                headers: {
                    'x-admin-key': apiKey,
                    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
                },
            });
            if (res.ok) {
                const data = await res.json();
                setMatch(data);
                setOriginalId(data.id);

                let stats = '';
                if (data.stats) {
                    const m: Record<string, string> = {
                        'Topla Oynama': 'Possession', 'Toplam Şut': 'Shots', 'Kaleyi Bulan Şut': 'ShotsOnTarget',
                        'Net Gol Şansı': 'BigChances', 'Köşe Vuruşu': 'Corners', 'Ofsayt': 'Offsides',
                        'Kurtarışlar': 'Saves', 'Fauller': 'Fouls', 'Sarı Kart': 'YellowCards', 'Kırmızı Kart': 'RedCards'
                    };
                    const statsRecord = data.stats as Record<string, number | undefined>;
                    Object.entries(m).forEach(([label, key]) => {
                        const h = statsRecord[`home${key}`];
                        const a = statsRecord[`away${key}`];
                        if (h !== undefined || a !== undefined) {
                            stats += `${label}\n${h ?? ''}\n${a ?? ''}\n`;
                        }
                    });
                }
                setStatsRaw(stats);


                toast.success('Maç başarıyla yüklendi! 📥');
            } else {
                toast.error(`"${targetId}" ID'li maç bulunamadı.`);
            }
        } catch (e) {
            console.error(e);
            toast.error('Maç yüklenirken bir hata oluştu.');
        }
    };

    const handleRenameMatch = async () => {
        if (!originalId) return toast.error('Önce düzenlemek istediğiniz maçı "Getir" butonuyla yükleyiniz.');
        if (!match.id || match.id === originalId) return toast.error('Lütfen ID alanına YENİ bir ID giriniz.');

        if (!confirm(`Bu maçı ${match.id} olarak değiştirmek istediğinize emin misiniz?`)) return;

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
                toast.success('Maç ID başarıyla değiştirildi! 🚀');
                setOriginalId(match.id as string);
                window.location.reload();
            } else {
                const err = await res.json();
                toast.error(`İşlem Hatası: ${err.error}`);
            }
        } catch (error) {
            console.error(error);
            toast.error('Ağ hatası oluştu');
        }
    };

    const handleAutoFillFromId = () => {
        const idInput = (match.id || '').toLowerCase().trim();
        if (!idInput) return;

        let weekVal = match.week || 1;
        let homeStr = '';
        let awayStr = '';
        let dateStr = '';

        const updates: Partial<Match> = { week: weekVal };

        const shortcodeMatch = idInput.match(/^(w|week|l|league|c|cup)(\d+)([abc]?)([a-z0-9şçöğüı]{3})([a-z0-9şçöğüı]{3})$/);

        if (shortcodeMatch) {
            weekVal = parseInt(shortcodeMatch[2]);
            const groupCode = shortcodeMatch[3];
            homeStr = shortcodeMatch[4];
            awayStr = shortcodeMatch[5];
            if (['c', 'cup'].includes(shortcodeMatch[1])) {
                updates.competition = 'cup';
                if (groupCode) updates.group = groupCode.toUpperCase();
            } else {
                updates.competition = 'league';
            }
        } else {
            const parts = idInput.split('-');
            if (parts.length >= 2) {
                const isCup = parts[0].startsWith('cup') || parts[0].startsWith('c');

                const prefixMatch = parts[0].match(/^(?:week|cup|league|l|c|w)(\d+)(?:-([abc]))?$/i);
                if (prefixMatch) {
                    weekVal = parseInt(prefixMatch[1]);
                    if (prefixMatch[2]) updates.group = prefixMatch[2].toUpperCase();

                    if (isCup && parts[1]?.length === 1 && ['a', 'b', 'c'].includes(parts[1].toLowerCase()) && !updates.group) {
                        updates.group = parts[1].toUpperCase();
                        homeStr = parts[2] || '';
                        awayStr = parts[3] || '';
                    } else {
                        homeStr = parts[1] || '';
                        awayStr = parts[2] || '';
                    }
                } else {
                    homeStr = parts[0];
                    awayStr = parts[1] || '';
                }
                updates.competition = isCup ? 'cup' : 'league';
            }
        }

        updates.week = weekVal;
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

        if (match.date) {
            const d = new Date(match.date);
            if (!isNaN(d.getTime())) {
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                dateStr = `${year}-${month}-${day}`;
            }
        }

        let finalId = `${match.competition === 'cup' ? 'cup' : 'week'}${weekVal}`;
        if (match.competition === 'cup' && updates.group) finalId += `-${updates.group}`;

        if (finalHomeId) finalId += `-${finalHomeId}`;
        if (finalAwayId) finalId += `-${finalAwayId}`;

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
                headers: {
                    'x-admin-key': apiKey,
                    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
                },
            });
            if (res.ok) {
                alert('Maç başarıyla silindi! 🗑️');
                setMatch({
                    id: '', homeTeamId: '', awayTeamId: '', homeTeamName: '', awayTeamName: '', week: 1, season: '2025-2026', stadium: 'Rams Park', date: new Date().toISOString(),
                    status: 'draft'
                });
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
                {/* Competition Selector */}
                <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <button
                        type="button"
                        onClick={() => setMatch({ ...match, competition: 'league' })}
                        className={`flex-1 py-2 px-3 rounded font-bold text-[10px] uppercase tracking-wider transition-all ${match.competition !== 'cup' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        SÜPER LİG
                    </button>
                    <button
                        type="button"
                        onClick={() => setMatch({ ...match, competition: 'cup' })}
                        className={`flex-1 py-2 px-3 rounded font-bold text-[10px] uppercase tracking-wider transition-all ${match.competition === 'cup' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        TÜRKİYE KUPASI
                    </button>
                </div>

                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Mevcut Maç Seçiniz</label>
                        <MatchSelect
                            value={match.id || ''}
                            competition={match.competition || 'league'}
                            group={match.group}
                            season={season}
                            onChange={(val, week) => {
                                const updates: Partial<Match> = { id: val };
                                if (week) updates.week = week;
                                setMatch(prev => ({ ...prev, ...updates }));
                            }}
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <button type="button" onClick={handleLoad} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded font-bold text-sm shadow-sm transition-all h-[38px]">Getir</button>
                        <button type="button" onClick={handleRenameMatch} className="bg-orange-50 text-orange-600 px-4 py-2 rounded font-bold text-sm border border-orange-200 hover:bg-orange-100 transition-all h-[38px]">ID Değiştir</button>
                        <button type="button" onClick={handleDeleteMatch} className="bg-red-50 text-red-600 px-4 py-2 rounded font-bold text-sm border border-red-200 hover:bg-red-100 transition-all h-[38px]">Sil</button>
                        <button type="button" onClick={() => { setMatch({ id: '', week: 1, date: new Date().toISOString(), status: 'draft', competition: match.competition || 'league', group: match.group || '', season }); setOriginalId(''); setSmartRaw(''); setStatsRaw(''); }} className="bg-white text-slate-600 px-4 py-2 rounded font-bold text-sm border border-slate-200 hover:bg-slate-50 transition-all h-[38px]">Yeni</button>
                    </div>
                </div>

                {match.competition === 'cup' && (
                    <div className="flex gap-2 bg-white p-2 rounded-lg border border-red-100">
                        <div className="flex-1 flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-red-600 uppercase">Grup Seçimi</label>
                            <div className="flex gap-1">
                                {['A', 'B', 'C'].map(g => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setMatch({ ...match, group: g })}
                                        className={`flex-1 py-1 rounded font-bold text-xs border transition-all ${match.group === g ? 'bg-red-600 text-white border-red-600 shadow-sm' : 'bg-white text-red-600 border-red-200 hover:bg-red-50'}`}
                                    >
                                        {g} GRUBU
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setMatch({ ...match, group: '' })}
                                    className={`flex-1 py-1 rounded font-bold text-xs border transition-all ${!match.group ? 'bg-slate-600 text-white border-slate-600 shadow-sm' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                >
                                    FİNAL/DİĞER
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Maç Kayıt ID (week1-takim-takim)</label>
                    <input
                        placeholder="Örn: week1-gs-fb"
                        className="w-full border border-slate-300 p-2 rounded text-sm font-mono bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        value={match.id || ''}
                        onChange={e => {
                            let val = e.target.value;
                            if (/^l\d/.test(val) && !val.startsWith('league')) {
                                val = val.replace(/^l(\d+)/, 'week$1');
                            }
                            if (/^w\d/.test(val) && !val.startsWith('week')) {
                                val = val.replace(/^w(\d+)/, 'week$1');
                            }
                            let nextWeek = match.week;
                            const weekMatch = val.match(/(?:league|week|cup)(\d+)/);
                            if (weekMatch) {
                                nextWeek = parseInt(weekMatch[1]);
                            }
                            setMatch({ ...match, id: val, week: nextWeek });
                        }}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAutoFillFromId())}
                    />
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 mt-2 mb-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                Topun Oyunda Kaldığı Süre / Maçın Süresi
                            </label>
                            <input
                                placeholder="Örn: 54:30 / 98:15"
                                className="w-full border border-slate-300 p-2 rounded text-sm font-mono bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                value={match.refereeStats?.ballInPlayTime || ''}
                                onChange={e => updateBallInPlayTime(e.target.value)}
                            />
                        </div>
                        
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                                Maç Skoru (Ev - Deplasman)
                            </label>
                            <div className="flex gap-2 max-w-[200px]">
                                <input
                                    placeholder="Ev"
                                    type="number"
                                    className="border border-slate-300 p-2 w-full rounded font-bold bg-white text-sm text-center focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    value={match.homeScore ?? ''}
                                    onChange={e => {
                                        const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                        setMatch(prev => ({ ...prev, homeScore: val, score: (val !== undefined && prev.awayScore !== undefined) ? `${val}-${prev.awayScore}` : prev.score }));
                                    }}
                                />
                                <span className="flex items-center text-slate-400 font-bold">-</span>
                                <input
                                    placeholder="Dep"
                                    type="number"
                                    className="border border-slate-300 p-2 w-full rounded font-bold bg-white text-sm text-center focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                    value={match.awayScore ?? ''}
                                    onChange={e => {
                                        const val = e.target.value === '' ? undefined : parseInt(e.target.value);
                                        setMatch(prev => ({ ...prev, awayScore: val, score: (prev.homeScore !== undefined && val !== undefined) ? `${prev.homeScore}-${val}` : prev.score }));
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={() => setMatch({ ...match, status: match.status === 'published' ? 'draft' : 'published' })}
                            className={`flex-1 py-2 rounded font-bold text-xs border transition-all cursor-pointer ${
                                match.status === 'published'
                                    ? 'bg-green-600 text-white border-green-700 hover:bg-green-700 shadow-sm'
                                    : 'bg-slate-200 text-slate-700 border-slate-300 hover:bg-slate-300 shadow-sm'
                            }`}
                        >
                            {match.status === 'published' ? '🟢 YAYINDA' : '⚪ TASLAK'}
                        </button>
                        <button
                            type="submit"
                            className="flex-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-black text-xs shadow-md transition-all cursor-pointer uppercase tracking-wider"
                        >
                            Maçı Kaydet 🚀
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Ev Sahibi</label>
                        <div className="flex flex-col gap-1">
                            <input
                                placeholder="ID (örn: gs)"
                                className="border border-slate-200 p-2 w-full rounded text-sm bg-white"
                                value={match.homeTeamId || ''}
                                onChange={e => updateMatchState({ homeTeamId: e.target.value })}
                                onBlur={() => {
                                    if (!match.homeTeamId) return;
                                    const rid = resolveTeamId(match.homeTeamId);
                                    if (rid) updateMatchState({ homeTeamId: rid, homeTeamName: getTeamName(rid) });
                                }}
                            />
                            <input
                                placeholder="Adı (örn: Galatasaray)"
                                className="border border-slate-200 p-2 w-full rounded text-xs bg-slate-50"
                                value={match.homeTeamName || ''}
                                onChange={e => updateMatchState({ homeTeamName: e.target.value })}
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
                                onChange={e => updateMatchState({ awayTeamId: e.target.value })}
                                onBlur={() => {
                                    if (!match.awayTeamId) return;
                                    const rid = resolveTeamId(match.awayTeamId);
                                    if (rid) updateMatchState({ awayTeamId: rid, awayTeamName: getTeamName(rid) });
                                }}
                            />
                            <input
                                placeholder="Adı (örn: Fenerbahçe)"
                                className="border border-slate-200 p-2 w-full rounded text-xs bg-slate-50"
                                value={match.awayTeamName || ''}
                                onChange={e => updateMatchState({ awayTeamName: e.target.value })}
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
                            updateMatchState({ week: isNaN(num) ? 1 : num });
                        }} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Tarih / Saat</label>
                        <input
                            type="datetime-local"
                            className="border border-slate-200 p-2 w-full rounded font-bold bg-white text-sm"
                            value={match.date ? (() => {
                                const d = new Date(match.date);
                                const offset = d.getTimezoneOffset() * 60000;
                                return new Date(d.getTime() - offset).toISOString().slice(0, 16);
                            })() : ''}
                            onChange={e => {
                                const d = new Date(e.target.value);
                                if (!isNaN(d.getTime())) updateMatchState({ date: d.toISOString() });
                            }}
                        />
                    </div>
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-200">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Stadyum</label>
                    <input
                        placeholder="Örn: Rams Park"
                        className="w-full border border-slate-300 p-2 rounded text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                        value={match.stadium || ''}
                        onChange={e => updateMatchState({ stadium: e.target.value })}
                    />
                </div>
            </div>

            <div className="bg-indigo-50 p-3 rounded mb-4 border border-indigo-100 relative">
                <h4 className="font-bold text-xs text-indigo-800 uppercase mb-1 flex items-center gap-2">
                    <span className="text-lg">✨</span> AKILLI MAÇ GİRİŞİ (TÜM VERİLER)
                </h4>
                <div className="text-[10px] text-indigo-600 mb-2">
                    Takımlar, hakemler, kadrolar, goller ve kartları içeren tam metni buraya yapıştırın. Sistem otomatik ayrıştıracaktır.
                </div>
                <textarea
                    className="w-full text-xs p-3 border border-indigo-200 rounded-lg h-48 font-mono text-gray-700 focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    placeholder="Tüm maç raporunu buraya yapıştırın..."
                    value={smartRaw}
                    onChange={(e) => {
                        const text = e.target.value;
                        setSmartRaw(text);
                        if (!text.trim()) return;

                        const parsedMatch = parseMatchData(text, match);
                        setMatch(parsedMatch);
                    }}
                />


            </div>

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
                        const map: Record<string, string> = {
                            'Topla Oynama': 'Possession', 'Toplam Şut': 'Shots', 'Kaleyi Bulan Şut': 'ShotsOnTarget',
                            'İsabetli Şut': 'ShotsOnTarget', 'Net Gol Şansı': 'BigChances', 'Köşe Vuruşu': 'Corners',
                            'Ofsayt': 'Offsides', 'Kurtarışlar': 'Saves', 'Kurtarış': 'Saves', 'Fauller': 'Fouls',
                            'Faul': 'Fouls', 'Sarı Kart': 'YellowCards', 'Kırmızı Kart': 'RedCards'
                        };

                        let processed = text;
                        Object.keys(map).forEach(key => {
                            // Fix merged lines like "0Topla Oynama" or "0 Topla Oynama"
                            // Also handles cases where value ends with % or digit or just :
                            const regex = new RegExp(`(\\d|%|:)\\s*(${key})`, 'g');
                            processed = processed.replace(regex, '$1\n$2');
                        });
                        const lines = processed.split('\n').map(l => l.trim()).filter(l => l);
                        const values: Record<string, string[]> = {};

                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i];
                            let matchedKey: string | undefined;
                            // Check exact match or starts with key+colon
                            for (const k in map) {
                                if (line === k || line.startsWith(k + ':') || line.startsWith(k + ' ')) {
                                    matchedKey = k;
                                    break;
                                }
                            }

                            if (matchedKey) {
                                let val = line.includes(':') ? line.split(':')[1].trim() : '';
                                if (!val) {
                                    // Look ahead for value
                                    for (let j = i + 1; j < lines.length; j++) {
                                        let isNextLabel = false;
                                        for (const k2 in map) { if (lines[j].startsWith(k2)) { isNextLabel = true; break; } }
                                        if (isNextLabel) break;
                                        if (lines[j].trim()) { val = lines[j].trim(); break; }
                                    }
                                }
                                if (val) {
                                    const cleanVal = val.replace('%', '').trim();
                                    if (!values[matchedKey]) values[matchedKey] = [];
                                    values[matchedKey].push(cleanVal);
                                }
                            }
                        }

                        Object.keys(map).forEach(k => {
                            const internalKey = map[k]; const vals = values[k];
                            const parseVal = (v: string) => internalKey === 'Possession' ? parseFloat(v) : parseInt(v);
                            const statsRecord = newMatch.stats as Record<string, number | undefined>;
                            if (vals && vals.length >= 2) {
                                statsRecord[`home${internalKey}`] = parseVal(vals[0]);
                                statsRecord[`away${internalKey}`] = parseVal(vals[1]);
                            } else if (vals && vals.length === 1) {
                                statsRecord[`home${internalKey}`] = parseVal(vals[0]);
                            }
                        });
                        setMatch(newMatch);
                    }}
                />
            </div>

            {match.events && match.events.length > 0 && (
                <div className="bg-blue-50 p-3 rounded mb-4 border border-blue-100">
                    <h4 className="font-bold text-xs text-blue-800 mb-2 uppercase">Ayrıştırılan Olaylar (Kontrol)</h4>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                        {match.events.map((ev, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs bg-white p-1 rounded border border-blue-100">
                                <span className={`font-bold w-12 text-right ${ev.teamId === 'home' ? 'text-green-600' : 'text-red-600'}`}>{ev.minute}</span>
                                <span className="font-bold text-gray-500 uppercase text-[10px] w-16 text-center border p-0.5 rounded bg-gray-50">{ev.type}</span>
                                <span className="font-medium text-gray-700">{ev.player}</span>
                                <button type="button" onClick={() => {
                                    const newEvents = match.events!.filter((_, idx) => idx !== i);
                                    setMatch({ ...match, events: newEvents });
                                }} className="ml-auto text-red-400 hover:text-red-600 px-2 font-bold">×</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="border-t pt-2 mt-2">
                <h4 className="font-bold text-sm text-gray-600 mb-1">Maç İstatistikleri</h4>

                <div className="space-y-4 text-sm">
                    {[
                        { label: 'Topla Oynama', key: 'Possession', step: '0.1' },
                        { label: 'Toplam Şut', key: 'Shots', step: '1' },
                        { label: 'İsabetli Şut', key: 'ShotsOnTarget', step: '1' },
                        { label: 'Net Gol Şansı', key: 'BigChances', step: '1' },
                        { label: 'Köşe Vuruşu', key: 'Corners', step: '1' },
                        { label: 'Ofsayt', key: 'Offsides', step: '1' },
                        { label: 'Kurtarış', key: 'Saves', step: '1' },
                        { label: 'Faul', key: 'Fouls', step: '1' },
                        { label: 'Sarı Kart', key: 'YellowCards', step: '1', className: 'bg-yellow-50' },
                        { label: 'Kırmızı Kart', key: 'RedCards', step: '1', className: 'bg-red-50' }
                    ].map(st => {
                        const statsRecord = match.stats as Record<string, number | undefined> | undefined;
                        const hVal = Number(statsRecord?.[`home${st.key}`] || 0);
                        const aVal = Number(statsRecord?.[`away${st.key}`] || 0);
                        const total = hVal + aVal;
                        const hPercent = total > 0 ? (hVal / total) * 100 : 50;
                        const aPercent = total > 0 ? (aVal / total) * 100 : 50;

                        return (
                            <div key={st.key} className="flex flex-col">
                                <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center mb-1">
                                    <input type="number" step={st.step} className={`border p-2 rounded text-center font-mono font-bold ${st.className || ''}`} placeholder="0" value={statsRecord?.[`home${st.key}`] ?? ''} onChange={e => updateStat(`home${st.key}`, e.target.value)} />
                                    <span className="text-center text-[10px] font-bold uppercase text-slate-400 w-24 truncate">{st.label}</span>
                                    <input type="number" step={st.step} className={`border p-2 rounded text-center font-mono font-bold ${st.className || ''}`} placeholder="0" value={statsRecord?.[`away${st.key}`] ?? ''} onChange={e => updateStat(`away${st.key}`, e.target.value)} />
                                </div>
                                <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100">
                                    <div style={{ width: `${hPercent}%` }} className={`transition-all duration-500 ${st.key.includes('Card') ? (st.key.includes('Yellow') ? 'bg-yellow-400' : 'bg-red-500') : 'bg-blue-500'}`}></div>
                                    <div style={{ width: `${aPercent}%` }} className={`transition-all duration-500 ${st.key.includes('Card') ? (st.key.includes('Yellow') ? 'bg-yellow-400' : 'bg-red-500') : 'bg-red-500'} opacity-80`}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="border-t pt-2 mt-2">
                <h4 className="font-bold text-sm text-gray-600 mb-2">Hakemler, Gözlemciler ve Temsilciler</h4>
                
                {/* 1. Hakemler */}
                <div className="mb-4 bg-gray-50 p-2.5 rounded border border-gray-100">
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-xs uppercase text-gray-700">Hakemler (Masa & Saha)</span>
                        <button 
                            type="button" 
                            onClick={() => addOfficial('referees')} 
                            className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs px-2 py-1 rounded transition-colors"
                        >
                            Ekle +
                        </button>
                    </div>
                    {(match.officials?.referees || []).map((ref, i) => (
                        <div key={i} className="flex gap-2 items-center mb-1.5">
                            <span className="text-xs font-bold text-slate-500 w-36 shrink-0">
                                {i === 0 ? 'Hakem:' : i === 1 ? '1. Yardımcı Hakem:' : i === 2 ? '2. Yardımcı Hakem:' : i === 3 ? 'Dördüncü Hakem:' : `${i + 1}. Hakem:`}
                            </span>
                            <input 
                                className="border border-gray-300 p-1.5 w-full rounded text-sm bg-white" 
                                placeholder="Hakem Adı"
                                value={ref} 
                                onChange={(e) => updateOfficial('referees', i, e.target.value)} 
                            />
                            <button 
                                type="button" 
                                onClick={() => removeOfficial('referees', i)} 
                                className="text-red-500 font-bold px-2 hover:text-red-700 transition-colors"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>

                {/* 2. VAR Ekibi */}
                <div className="mb-4 bg-gray-50 p-2.5 rounded border border-gray-100">
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-xs uppercase text-gray-700">VAR & AVAR Ekibi</span>
                        <button 
                            type="button" 
                            onClick={() => addOfficial('varReferees')} 
                            className="bg-purple-100 hover:bg-purple-200 text-purple-700 text-xs px-2 py-1 rounded transition-colors"
                        >
                            Ekle +
                        </button>
                    </div>
                    {(match.officials?.varReferees || []).map((v, i) => (
                        <div key={i} className="flex gap-2 items-center mb-1.5">
                            <span className="text-xs font-bold text-slate-500 w-36 shrink-0">
                                {i === 0 ? 'VAR:' : i === 1 ? 'AVAR:' : `AVAR ${i}:`}
                            </span>
                            <input 
                                className="border border-gray-300 p-1.5 w-full rounded text-sm bg-white" 
                                placeholder="VAR/AVAR Adı"
                                value={v} 
                                onChange={(e) => updateOfficial('varReferees', i, e.target.value)} 
                            />
                            <button 
                                type="button" 
                                onClick={() => removeOfficial('varReferees', i)} 
                                className="text-red-500 font-bold px-2 hover:text-red-700 transition-colors"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>

                {/* 3. Gözlemciler */}
                <div className="mb-4 bg-gray-50 p-2.5 rounded border border-gray-100">
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-xs uppercase text-gray-700">Gözlemciler</span>
                        <button 
                            type="button" 
                            onClick={() => addOfficial('observers')} 
                            className="bg-amber-100 hover:bg-amber-200 text-amber-700 text-xs px-2 py-1 rounded transition-colors"
                        >
                            Ekle +
                        </button>
                    </div>
                    {(match.officials?.observers || []).map((obs, i) => (
                        <div key={i} className="flex gap-2 items-center mb-1.5">
                            <span className="text-xs font-bold text-slate-500 w-36 shrink-0">
                                {i === 0 ? 'Gözlemci:' : `${i + 1}. Gözlemci:`}
                            </span>
                            <input 
                                className="border border-gray-300 p-1.5 w-full rounded text-sm bg-white" 
                                placeholder="Gözlemci Adı"
                                value={obs} 
                                onChange={(e) => updateOfficial('observers', i, e.target.value)} 
                            />
                            <button 
                                type="button" 
                                onClick={() => removeOfficial('observers', i)} 
                                className="text-red-500 font-bold px-2 hover:text-red-700 transition-colors"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>

                {/* 4. Temsilciler */}
                <div className="mb-4 bg-gray-50 p-2.5 rounded border border-gray-100">
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-xs uppercase text-gray-700">Temsilciler</span>
                        <button 
                            type="button" 
                            onClick={() => addOfficial('representatives')} 
                            className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs px-2 py-1 rounded transition-colors"
                        >
                            Ekle +
                        </button>
                    </div>
                    {(match.officials?.representatives || []).map((rep, i) => (
                        <div key={i} className="flex gap-2 items-center mb-1.5">
                            <span className="text-xs font-bold text-slate-500 w-36 shrink-0">
                                {i === 0 ? 'Temsilci:' : `${i + 1}. Temsilci:`}
                            </span>
                            <input 
                                className="border border-gray-300 p-1.5 w-full rounded text-sm bg-white" 
                                placeholder="Temsilci Adı"
                                value={rep} 
                                onChange={(e) => updateOfficial('representatives', i, e.target.value)} 
                            />
                            <button 
                                type="button" 
                                onClick={() => removeOfficial('representatives', i)} 
                                className="text-red-500 font-bold px-2 hover:text-red-700 transition-colors"
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            </div>

        </form>
    );
};
