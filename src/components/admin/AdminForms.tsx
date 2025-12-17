"use client";

import { useState } from 'react';
import { Team, Match, MatchStats, Incident, Opinion } from '@/types';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { useRouter } from 'next/navigation';

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
    const [match, setMatch] = useState<Partial<Match>>({
        id: '', homeTeamId: '', awayTeamId: '', homeTeamName: '', awayTeamName: '', week: 1, season: '2024-2025', stadium: 'Rams Park', date: new Date().toISOString(),
        status: 'draft'
    });

    // Update form when preloaded data changes
    if (preloadedMatch && match.id !== preloadedMatch.id) {
        setMatch(preloadedMatch);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/admin/matches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': apiKey, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
            body: JSON.stringify(match),
        });
        if (res.ok) alert('Match Added!');
        else alert('Error adding match');
    };

    const handleQuickSave = async () => {
        if (!match.id) return alert('Lütfen önce aşağıdaki kutucuktan bir Maç ID (örn: week1-gfk-gs) giriniz.');

        try {
            const res = await fetch('/api/admin/matches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-key': apiKey, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
                body: JSON.stringify(match),
            });
            if (res.ok) {
                alert('Veriler başarıyla kaydedildi! ✅');
            } else {
                alert('Kaydederken hata oluştu.');
            }
        } catch (error) {
            console.error(error);
            alert('Bağlantı hatası.');
        }
    };

    const handleLoad = async () => {
        if (!match.id) return alert('Lütfen Maç ID giriniz');
        try {
            const snap = await getDoc(doc(db, 'matches', match.id));
            if (snap.exists()) {
                setMatch(snap.data() as Match);
                alert('Maç verisi yüklendi!');
            } else {
                alert('Maç bulunamadı.');
            }
        } catch (e) {
            console.error(e);
            alert('Yükleme hatası');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-gray-200 bg-white rounded shadow-sm">
            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Maç Ekle / Düzenle</h3>

            {/* Smart Paste Section */}
            <div className="bg-blue-50 p-3 rounded mb-4 border border-blue-100">
                <h4 className="font-bold text-xs text-blue-800 mb-1 uppercase">Hızlı Veri Girişi (TFF Kopyala-Yapıştır)</h4>
                <textarea
                    className="w-full text-xs p-2 border rounded h-24 font-mono text-gray-700"
                    placeholder="TFF sayfasından maç detaylarını kopyalayıp buraya yapıştırın..."
                    onChange={(e) => {
                        const text = e.target.value;
                        if (!text.trim()) return;

                        const newMatch = { ...match };
                        if (!newMatch.officials) newMatch.officials = { referees: [], varReferees: [], observers: [], representatives: [] };

                        // Reset lists to avoid duplicates on re-paste
                        newMatch.officials.referees = ['', '', '', '']; // Main, Asst1, Asst2, 4th
                        newMatch.officials.varReferees = [];
                        newMatch.officials.observers = [];
                        newMatch.officials.representatives = [];

                        const lines = text.split('\n').map(l => l.trim()).filter(l => l);

                        lines.forEach(line => {
                            // Date Detection (e.g. 8.08.2025 - 21:30)
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
                                    }
                                }
                            }
                            // Stadium Detection (Heuristic: Ends with STADYUMU or contains STADI)
                            else if (line.includes('STADYUMU') || line.includes('STADI') || line.includes('PARK')) {
                                newMatch.stadium = line.split('-')[0].trim(); // Take part before '-' if exists
                            }
                            // Officials Parsing
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
                        });

                        setMatch(newMatch);
                    }}
                />
                <button type="button" onClick={handleQuickSave} className="w-full bg-blue-100 text-blue-800 text-xs font-bold py-1 rounded hover:bg-blue-200 mt-1">
                    Bilgileri Kaydet 💾
                </button>
            </div>

            {/* Lineup Paste Section */}
            <div className="bg-green-50 p-3 rounded mb-4 border border-green-100">
                <h4 className="font-bold text-xs text-green-800 mb-1 uppercase">Kadro Girişi (Mackolik/TFF Kopyala-Yapıştır)</h4>
                <textarea
                    className="w-full text-xs p-2 border rounded h-24 font-mono text-gray-700"
                    placeholder="Kadro listesini yapıştırın (Numara - İsim - İsim - Numara formatında)..."
                    onChange={(e) => {
                        const text = e.target.value;
                        if (!text.trim()) return;

                        const newMatch = { ...match };
                        if (!newMatch.lineups) newMatch.lineups = { home: [], away: [], homeSubs: [], awaySubs: [], homeCoach: '', awayCoach: '' };

                        // --- ROBUST TOKENIZER & PARSER ---
                        const lines = text.split('\n').map(l => l.trim()).filter(l => l);
                        const homeXI: any[] = [];
                        const awayXI: any[] = [];
                        const homeSubs: any[] = [];
                        const awaySubs: any[] = [];
                        let hCoach = '';
                        let aCoach = '';

                        let section = 'xi'; // xi, subs, coach

                        // State Machine Data
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

                        // 1. ITERATE LINES
                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i];
                            const lower = line.toLowerCase();

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
                <button type="button" onClick={handleQuickSave} className="w-full bg-green-100 text-green-800 text-xs font-bold py-1 rounded hover:bg-green-200">
                    Kadroyu Kaydet 💾
                </button>
            </div>

            {/* Stats Paste Section */}
            <div className="bg-orange-50 p-3 rounded mb-4 border border-orange-100">
                <h4 className="font-bold text-xs text-orange-800 mb-1 uppercase">İstatistik Girişi (Mackolik Kopyala-Yapıştır)</h4>
                <textarea
                    className="w-full text-xs p-2 border rounded h-24 font-mono text-gray-700"
                    placeholder="İstatistikleri yapıştırın (Topla Oynama, Şut vb)..."
                    onChange={(e) => {
                        const text = e.target.value;
                        if (!text.trim()) return;

                        const newMatch = { ...match };
                        if (!newMatch.stats) newMatch.stats = {} as MatchStats;

                        const lines = text.split('\n').map(l => l.trim()).filter(l => l);

                        // Map labels to keys (Using specific string union for keys we care about to likely avoid full MatchStats keyof complexity)
                        const map: Record<string, string> = {
                            'Topla Oynama': 'Possession',
                            'Toplam Şut': 'Shots',
                            'Kaleyi Bulan Şut': 'ShotsOnTarget',
                            'İsabetli Şut': 'ShotsOnTarget',
                            'Net Gol Şansı': 'BigChances',
                            'Köşe Vuruşu': 'Corners',
                            'Ofsayt': 'Offsides',
                            'Kurtarışlar': 'Saves',
                            'Kurtarış': 'Saves',
                            'Fauller': 'Fouls',
                            'Faul': 'Fouls',
                            'Sarı Kart': 'YellowCards',
                            'Kırmızı Kart': 'RedCards'
                        };

                        // Store values in arrays [homeVal, awayVal]
                        // Since we don't know if Home is first or Away is first from just the text, 
                        // we usually assume Home Block then Away Block if sequential, or Interleaved?
                        // The user example had:
                        // Block 1 (Home) ... Block 2 (Away)
                        // This means we will encounter "Topla Oynama" twice.
                        // 1st time -> Home, 2nd time -> Away.

                        const values: Record<string, string[]> = {};

                        for (let i = 0; i < lines.length; i++) {
                            const line = lines[i].replace(':', ''); // Remove colon if present

                            // Check if line matches a known key
                            let matchedKey: string | undefined;
                            // Check exact match or starts with
                            for (const k in map) {
                                if (line.startsWith(k)) matchedKey = k;
                            }

                            if (matchedKey) {
                                // Value is likely on the next line
                                const valLine = lines[i + 1];
                                if (valLine) {
                                    const cleanVal = valLine.replace('%', '').trim();
                                    if (!values[matchedKey]) values[matchedKey] = [];
                                    values[matchedKey].push(cleanVal);
                                }
                            }
                        }

                        // Now assign to match.stats
                        const statKeys = Object.keys(map);
                        statKeys.forEach(k => {
                            const internalKey = map[k];
                            // internalKey e.g. 'Possession' -> 'homePossession', 'awayPossession'
                            // Typescript key for MatchStats is camelCase like homePossession

                            const vals = values[k];
                            if (vals && vals.length >= 2) {
                                // Assume 0 is Home, 1 is Away based on typical copy order
                                (newMatch.stats as any)[`home${internalKey}`] = vals[0];
                                (newMatch.stats as any)[`away${internalKey}`] = vals[1];
                            } else if (vals && vals.length === 1) {
                                // Maybe only one side parsed?
                                (newMatch.stats as any)[`home${internalKey}`] = vals[0];
                            }
                        });

                        setMatch(newMatch);
                    }}
                />
                <button type="button" onClick={handleQuickSave} className="w-full bg-orange-100 text-orange-800 text-xs font-bold py-1 rounded hover:bg-orange-200 mt-1">
                    İstatistikleri Kaydet 💾
                </button>
            </div>

            <div className="flex gap-2">
                <input placeholder="Maç ID (örn: week1-gfk-gs)" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={match.id} onChange={e => setMatch({ ...match, id: e.target.value })} required />
                <button type="button" onClick={handleLoad} className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded text-gray-700 font-bold">Getir</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <input placeholder="Ev Sahibi ID" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={match.homeTeamId} onChange={e => setMatch({ ...match, homeTeamId: e.target.value })} required />
                <input placeholder="Ev Sahibi Adı" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={match.homeTeamName} onChange={e => setMatch({ ...match, homeTeamName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <input placeholder="Deplasman ID" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={match.awayTeamId} onChange={e => setMatch({ ...match, awayTeamId: e.target.value })} required />
                <input placeholder="Deplasman Adı" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={match.awayTeamName} onChange={e => setMatch({ ...match, awayTeamName: e.target.value })} />
            </div>


            {/* Stats & Officials Expansion */}
            <div className="border-t pt-2 mt-2">
                <h4 className="font-bold text-sm text-gray-600 mb-1">Maç İstatistikleri</h4>
                <div className="space-y-2 text-sm">
                    {/* Possession */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="0.01" placeholder="Ev Topla Oyn" className="border p-2 rounded"
                            value={match.stats?.homePossession ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, homePossession: e.target.value === '' ? undefined : e.target.value as any } })}
                        />
                        <span className="text-center text-xs font-bold uppercase">Topla Oynama</span>
                        <input type="number" step="0.01" placeholder="Dep Topla Oyn" className="border p-2 rounded"
                            value={match.stats?.awayPossession ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, awayPossession: e.target.value === '' ? undefined : e.target.value as any } })}
                        />
                    </div>

                    {/* Shots */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="0.01" placeholder="Ev Şut" className="border p-2 rounded"
                            value={match.stats?.homeShots ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, homeShots: e.target.value === '' ? undefined : e.target.value as any } })}
                        />
                        <span className="text-center text-xs font-bold uppercase">Toplam Şut</span>
                        <input type="number" step="0.01" placeholder="Dep Şut" className="border p-2 rounded"
                            value={match.stats?.awayShots ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, awayShots: e.target.value === '' ? undefined : e.target.value as any } })}
                        />
                    </div>

                    {/* Shots on Target */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="0.01" placeholder="Ev İsabetli" className="border p-2 rounded"
                            value={match.stats?.homeShotsOnTarget ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, homeShotsOnTarget: e.target.value === '' ? undefined : e.target.value as any } })}
                        />
                        <span className="text-center text-xs font-bold uppercase">İsabetli Şut</span>
                        <input type="number" step="0.01" placeholder="Dep İsabetli" className="border p-2 rounded"
                            value={match.stats?.awayShotsOnTarget ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, awayShotsOnTarget: e.target.value === '' ? undefined : e.target.value as any } })}
                        />
                    </div>

                    {/* Big Chances */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="0.01" placeholder="Ev Net Gol" className="border p-2 rounded"
                            value={match.stats?.homeBigChances ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, homeBigChances: e.target.value === '' ? undefined : e.target.value as any } })}
                        />
                        <span className="text-center text-xs font-bold uppercase">Net Gol Şansı</span>
                        <input type="number" step="0.01" placeholder="Dep Net Gol" className="border p-2 rounded"
                            value={match.stats?.awayBigChances ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, awayBigChances: e.target.value === '' ? undefined : e.target.value as any } })}
                        />
                    </div>

                    {/* Corners */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="0.01" placeholder="Ev Korner" className="border p-2 rounded"
                            value={match.stats?.homeCorners ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, homeCorners: e.target.value === '' ? undefined : e.target.value as any } })}
                        />
                        <span className="text-center text-xs font-bold uppercase">Köşe Vuruşu</span>
                        <input type="number" step="0.01" placeholder="Dep Korner" className="border p-2 rounded"
                            value={match.stats?.awayCorners ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, awayCorners: e.target.value === '' ? undefined : e.target.value as any } })}
                        />
                    </div>

                    {/* Offsides */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="0.01" placeholder="Ev Ofsayt" className="border p-2 rounded"
                            value={match.stats?.homeOffsides ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, homeOffsides: e.target.value === '' ? undefined : e.target.value as any } })}
                        />
                        <span className="text-center text-xs font-bold uppercase">Ofsayt</span>
                        <input type="number" step="0.01" placeholder="Dep Ofsayt" className="border p-2 rounded"
                            value={match.stats?.awayOffsides ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, awayOffsides: e.target.value === '' ? undefined : e.target.value as any } })}
                        />
                    </div>

                    {/* Saves */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="0.01" placeholder="Ev Kurtarış" className="border p-2 rounded"
                            value={match.stats?.homeSaves ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, homeSaves: e.target.value === '' ? undefined : e.target.value as any } })}
                        />
                        <span className="text-center text-xs font-bold uppercase">Kurtarış</span>
                        <input type="number" step="0.01" placeholder="Dep Kurtarış" className="border p-2 rounded"
                            value={match.stats?.awaySaves ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, awaySaves: e.target.value === '' ? undefined : e.target.value as any } })}
                        />
                    </div>

                    {/* Fouls */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="0.01" placeholder="Ev Faul" className="border p-2 rounded"
                            value={match.stats?.homeFouls ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, homeFouls: e.target.value === '' ? undefined : e.target.value as any } })}
                        />
                        <span className="text-center text-xs font-bold uppercase">Faul</span>
                        <input type="number" step="0.01" placeholder="Dep Faul" className="border p-2 rounded"
                            value={match.stats?.awayFouls ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, awayFouls: e.target.value === '' ? undefined : e.target.value as any } })}
                        />
                    </div>

                    {/* Yellow Cards */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="0.01" placeholder="Ev Sarı" className="border p-2 rounded bg-yellow-50"
                            value={match.stats?.homeYellowCards ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, homeYellowCards: e.target.value === '' ? undefined : e.target.value as any } })}
                        />
                        <span className="text-center text-xs font-bold uppercase">Sarı Kart</span>
                        <input type="number" step="0.01" placeholder="Dep Sarı" className="border p-2 rounded bg-yellow-50"
                            value={match.stats?.awayYellowCards ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, awayYellowCards: e.target.value === '' ? undefined : e.target.value as any } })}
                        />
                    </div>

                    {/* Red Cards */}
                    <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" step="0.01" placeholder="Ev Kırmızı" className="border p-2 rounded bg-red-50"
                            value={match.stats?.homeRedCards ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, homeRedCards: e.target.value === '' ? undefined : e.target.value as any } })}
                        />
                        <span className="text-center text-xs font-bold uppercase">Kırmızı Kart</span>
                        <input type="number" step="0.01" placeholder="Dep Kırmızı" className="border p-2 rounded bg-red-50"
                            value={match.stats?.awayRedCards ?? ''}
                            onChange={e => setMatch({ ...match, stats: { ...match.stats!, awayRedCards: e.target.value === '' ? undefined : e.target.value as any } })}
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
            <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded w-full font-medium">Maçı Kaydet</button>
        </form >
    );
};

export const IncidentForm = ({ apiKey, authToken, defaultMatchId, existingIncidents, onSuccess }: BaseProps) => {
    const [matchId, setMatchId] = useState('week1-gfk-gs');
    const [incident, setIncident] = useState<Partial<Incident>>({
        id: '', minute: 1, description: '', refereeDecision: '', finalDecision: '', impact: 'none'
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
                <input type="number" placeholder="Dk" className="border border-gray-300 p-2 w-24 rounded text-gray-900" value={incident.minute || ''} onChange={e => setIncident({ ...incident, minute: e.target.value ? parseInt(e.target.value) : 0 })} />
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
                        <option value="Taç / Korner">Taç / Korner</option>
                        <option value="Sarı Kart">Sarı Kart</option>
                        <option value="Kırmızı Kart">Kırmızı Kart</option>
                        <option value="Penaltı">Penaltı</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">VAR Kararı</label>
                    <select className="border border-gray-300 p-2 w-full rounded text-gray-900" value={incident.varDecision || ''} onChange={e => setIncident({ ...incident, varDecision: e.target.value })}>
                        <option value="">(Yok/Seçiniz)</option>
                        <option value="Müdahale Yok">Müdahale Yok</option>
                        <option value="İnceleme Önerisi">İnceleme Önerisi</option>
                        <option value="Gol İptal">Gol İptal</option>
                        <option value="Gol Onay">Gol Onay</option>
                        <option value="Penaltı Verildi">Penaltı Verildi</option>
                        <option value="Penaltı İptal">Penaltı İptal</option>
                        <option value="Kart Değişimi">Kart Değişimi</option>
                    </select>
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
        </form >
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
            if (onSuccess) onSuccess();
        } else alert('Error adding opinion');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-gray-200 bg-white rounded shadow-sm">
            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Yorum Ekle (Opinion)</h3>
            <div className="grid grid-cols-2 gap-2">
                <input placeholder="Match ID" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={matchId} onChange={e => setMatchId(e.target.value)} required />
                <input placeholder="Incident ID" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={incidentId} onChange={e => setIncidentId(e.target.value)} required />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <input placeholder="Yorum ID" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={opinion.id} onChange={e => setOpinion({ ...opinion, id: e.target.value })} required />
                <select className="border border-gray-300 p-2 w-full rounded text-gray-900" value={opinion.type || 'trio'} onChange={e => setOpinion({ ...opinion, type: e.target.value as any })}>
                    <option value="trio">Trio Yorumu</option>
                    <option value="general">Genel Yorumcu</option>
                </select>
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
                                key={op.id}
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
