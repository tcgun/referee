"use client";

import { useState, useEffect } from 'react';
import { Standing, Statement, DisciplinaryAction, RefereeStats, Match } from '@/types';
import { toast } from 'sonner';

interface BaseProps {
    apiKey: string;
    authToken?: string;
}

export const StandingForm = ({ apiKey, authToken }: BaseProps) => {
    const [gridItems, setGridItems] = useState<Standing[]>([]);
    const [loading, setLoading] = useState(false);
    const [bulkText, setBulkText] = useState('');

    useEffect(() => {
        fetchStandings();
    }, []);

    const fetchStandings = async () => {
        setLoading(true);
        try {
            const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
            const { db } = await import('@/firebase/client');
            const q = query(collection(db, 'standings'), orderBy('rank', 'asc'));
            const snap = await getDocs(q);

            const fetched = snap.docs.map(d => ({ ...d.data(), id: d.id } as Standing));

            // Fill up to 18 items
            const fullGrid: Standing[] = [];
            for (let i = 0; i < 18; i++) {
                if (fetched[i]) {
                    fullGrid.push(fetched[i]);
                } else {
                    fullGrid.push({
                        id: '', rank: i + 1, teamName: '',
                        played: 0, won: 0, drawn: 0, lost: 0,
                        goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0
                    });
                }
            }
            setGridItems(fullGrid);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleBulkPaste = async () => {
        if (!bulkText.trim()) return;
        const allLines = bulkText.split('\n').map(l => l.trim()).filter(l => l);
        const newItems: Standing[] = [...gridItems];
        const { resolveTeamId, getTeamName } = await import('@/lib/teams');

        let currentIndex = 0;
        for (let i = 0; i < allLines.length; i++) {
            if (currentIndex >= 18) break;
            const line = allLines[i];

            // Stats line identification: 8+ numbers (O G B M AG YG AV P)
            // Using a loose filter to handle both tab and space separation
            const numbers = line.split(/\s+/).filter(p => p.match(/^-?\d+$/));

            if (numbers.length >= 8) {
                // We found a stats row. Now find the team name.
                let candidateName = "";

                // Look BACKWARDS for the team name (up to 4 lines)
                for (let j = 1; j <= 4; j++) {
                    const prevIdx = i - j;
                    if (prevIdx < 0) break;
                    const prev = allLines[prevIdx];

                    // A candidate name should not be just a number and should be long enough
                    if (prev && isNaN(Number(prev)) && prev.length > 2 && !prev.includes('\t')) {
                        candidateName = prev;
                        break;
                    }
                }

                // If not found backwards, check if it's on the SAME line (tab separated usually)
                if (!candidateName) {
                    const parts = line.split('\t');
                    candidateName = parts.find(p => p.match(/[a-zA-ZçğıöşüÇĞİÖŞÜ]/)) || "";
                }

                if (candidateName) {
                    const teamId = resolveTeamId(candidateName) || candidateName.toLowerCase().replace(/\s+/g, '-');
                    const cleanName = getTeamName(teamId);

                    newItems[currentIndex] = {
                        ...newItems[currentIndex],
                        id: teamId,
                        teamName: cleanName,
                        played: parseInt(numbers[0]) || 0,
                        won: parseInt(numbers[1]) || 0,
                        drawn: parseInt(numbers[2]) || 0,
                        lost: parseInt(numbers[3]) || 0,
                        goalDiff: parseInt(numbers[6]) || 0, // AV is index 6 usually
                        points: parseInt(numbers[7]) || 0,   // P is index 7 usually
                        rank: currentIndex + 1
                    };
                    currentIndex++;
                }
            }
        }
        setGridItems(newItems);
        toast.info(`${currentIndex} takım verisi başarıyla aktarıldı. Kaydetmeyi unutmayın!`);
    };

    const handleGridChange = (index: number, field: keyof Standing, val: any) => {
        const newGrid = [...gridItems];
        newGrid[index] = { ...newGrid[index], [field]: val };
        if (field === 'goalsFor' || field === 'goalsAgainst') {
            newGrid[index].goalDiff = (newGrid[index].goalsFor || 0) - (newGrid[index].goalsAgainst || 0);
        }

        setGridItems(newGrid);
    };

    const handleSaveAll = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!confirm('Tüm tabloyu kaydetmek istediğinize emin misiniz?')) return;

        try {
            setLoading(true);

            const validItems = gridItems
                .map((item, index) => ({
                    ...item,
                    rank: index + 1,
                    teamName: item.teamName || item.id
                }))
                .filter(item => item.id && item.id.trim() !== '');

            if (validItems.length === 0) {
                toast.warning('Kaydedilecek geçerli veri bulunamadı. Lütfen tabloyu doldurun.');
                setLoading(false);
                return;
            }

            console.log('Sending bulk payload:', validItems);

            const res = await fetch('/api/admin/standings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': apiKey,
                    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
                },
                body: JSON.stringify(validItems),
            });

            if (!res.ok) {
                const rawText = await res.text();
                console.error('Bulk save failed:', res.status, 'Raw:', rawText);

                let errMsg = 'Sunucu Hatası';
                try {
                    const errData = JSON.parse(rawText);
                    errMsg = errData.error || rawText;
                } catch (e) {
                    errMsg = rawText || `Status ${res.status}`;
                }
                toast.error(`Kayıt hatası: ${errMsg}`);
            } else {
                toast.success(`${validItems.length} takım başarıyla kaydedildi! ✅`);
            }

        } catch (error) {
            console.error(error);
            toast.error('Hata: Tablo kaydedilirken bir sorun oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // Helper to resolve team name on blur
    // Helper to resolve team name on blur
    const handleIdBlur = async (index: number) => {
        const item = gridItems[index];
        if (item.id) {
            const { resolveTeamId, getTeamName } = await import('@/lib/teams');
            const resolvedId = resolveTeamId(item.id);
            if (resolvedId) {
                handleGridChange(index, 'id', resolvedId);
                if (!item.teamName || item.teamName.toLowerCase() === item.id.toLowerCase()) {
                    handleGridChange(index, 'teamName', getTeamName(resolvedId));
                }
                return true;
            }
        }
        return false;
    };

    const handleIdKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === 'Tab') {
            handleIdBlur(index);
        }
    };

    return (
        <div className="space-y-4">
            <div className="bg-slate-900 rounded-xl p-4 border border-slate-700 shadow-xl">
                <h4 className="text-white font-bold mb-2 flex items-center gap-2 overflow-hidden text-sm">
                    <span className="bg-blue-600 p-1 rounded">⚡</span> HIZLI VERİ GİRİŞİ (Excel/Web Yapıştır)
                </h4>
                <textarea
                    className="w-full h-24 bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-blue-100 font-mono focus:ring-2 focus:ring-blue-500 mb-2 outline-none"
                    placeholder="Tabloyu buraya yapıştırın (O G B M AG YG AV P kolonları içermeli)"
                    value={bulkText}
                    onChange={e => setBulkText(e.target.value)}
                />
                <button
                    onClick={handleBulkPaste}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-2 rounded-lg text-xs transition-transform active:scale-95"
                >
                    VERİLERİ TABLOYA AKTAR
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center sticky top-0 z-10">
                    <h4 className="font-bold text-sm uppercase text-slate-700">Puan Durumu (18 Takım)</h4>
                    <button onClick={() => handleSaveAll()} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white px-4 py-1.5 rounded font-bold text-xs shadow-sm">
                        {loading ? 'Kaydediliyor...' : 'TÜMÜNÜ VERİTABANINA KAYDET'}
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left min-w-[600px]">
                        <thead className="bg-slate-100 text-slate-500 uppercase font-bold border-b text-[10px] tracking-wider">
                            <tr>
                                <th className="px-1 py-2 w-8 text-center bg-slate-100 sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">#</th>
                                <th className="px-1 py-2 w-16 bg-slate-100 sticky left-8 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">KOD</th>
                                <th className="px-1 py-2 w-auto min-w-[140px]">Takım Adı</th>
                                <th className="px-1 py-2 w-10 text-center" title="Oynanan">O</th>
                                <th className="px-1 py-2 w-10 text-center" title="Galibiyet">G</th>
                                <th className="px-1 py-2 w-10 text-center" title="Beraberlik">B</th>
                                <th className="px-1 py-2 w-10 text-center" title="Mağlubiyet">M</th>
                                <th className="px-1 py-2 w-12 text-center" title="Averaj">AV</th>
                                <th className="px-1 py-2 w-14 text-center bg-blue-50 text-blue-800">PUAN</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {gridItems.map((item, i) => (
                                <tr key={i} className={`hover:bg-blue-50/20 group ${i < 1 ? 'bg-green-50/10' : i >= 15 ? 'bg-red-50/10' : ''}`}>
                                    <td className="px-1 py-1 text-center font-bold text-slate-400 text-[10px] bg-white sticky left-0 z-10">{i + 1}</td>
                                    <td className="px-1 py-1 bg-white sticky left-8 z-10">
                                        <input
                                            className="w-full border border-slate-200 rounded p-1 font-mono text-center focus:border-blue-400 focus:ring-1 focus:ring-blue-200 uppercase text-[11px] h-7"
                                            value={item.id}
                                            onChange={e => handleGridChange(i, 'id', e.target.value)}
                                            onBlur={() => handleIdBlur(i)}
                                            onKeyDown={(e) => handleIdKeyDown(i, e)}
                                            placeholder="..."
                                        />
                                    </td>
                                    <td className="px-1 py-1">
                                        <input
                                            className="w-full border border-slate-200 rounded p-1 focus:border-blue-400 focus:ring-1 focus:ring-blue-200 text-[11px] h-7 font-bold text-slate-700"
                                            value={item.teamName || ''}
                                            onChange={e => handleGridChange(i, 'teamName', e.target.value)}
                                            placeholder="Takım Adı"
                                        />
                                    </td>
                                    {/* Stats */}
                                    <td className="px-0.5 py-1"><input type="number" className="w-full text-center border border-slate-200 rounded p-0 h-7 text-[11px]" value={item.played || ''} onChange={e => handleGridChange(i, 'played', +e.target.value)} /></td>
                                    <td className="px-0.5 py-1"><input type="number" className="w-full text-center border border-slate-200 rounded p-0 h-7 text-[11px]" value={item.won || ''} onChange={e => handleGridChange(i, 'won', +e.target.value)} /></td>
                                    <td className="px-0.5 py-1"><input type="number" className="w-full text-center border border-slate-200 rounded p-0 h-7 text-[11px]" value={item.drawn || ''} onChange={e => handleGridChange(i, 'drawn', +e.target.value)} /></td>
                                    <td className="px-0.5 py-1"><input type="number" className="w-full text-center border border-slate-200 rounded p-0 h-7 text-[11px]" value={item.lost || ''} onChange={e => handleGridChange(i, 'lost', +e.target.value)} /></td>
                                    {/* AG YG Inputs Removed */}
                                    <td className="px-0.5 py-1"><input type="number" className="w-full text-center border border-slate-200 rounded p-0 h-7 bg-slate-50 font-bold text-slate-500 text-[11px]" value={item.goalDiff || ''} onChange={e => handleGridChange(i, 'goalDiff', +e.target.value)} /></td>
                                    <td className="px-0.5 py-1"><input type="number" className="w-full text-center border border-blue-200 rounded p-0 h-7 bg-blue-50 font-black text-blue-700 text-[11px]" value={item.points || ''} onChange={e => handleGridChange(i, 'points', +e.target.value)} /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export const StatementForm = ({ apiKey, authToken }: BaseProps) => {
    const [statement, setStatement] = useState<Partial<Statement>>({
        title: '', content: '', entity: '', type: 'tff', date: new Date().toISOString().split('T')[0]
    });
    const [existingStatements, setExistingStatements] = useState<Statement[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchExisting();
    }, []);

    const fetchExisting = async () => {
        try {
            const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
            const { db } = await import('@/firebase/client');
            const q = query(collection(db, 'statements'), orderBy('date', 'desc'));
            const snap = await getDocs(q);
            setExistingStatements(snap.docs.map(d => ({ ...d.data(), id: d.id } as Statement)));
        } catch (e) {
            console.error("Error fetching statements", e);
        }
    };

    const handleSelect = (id: string) => {
        const found = existingStatements.find(s => s.id === id);
        if (found) {
            setStatement({ ...found });
        } else {
            setStatement({
                title: '', content: '', entity: '', type: 'tff', date: new Date().toISOString().split('T')[0]
            });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/admin/statements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-key': apiKey, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
                body: JSON.stringify(statement),
            });
            if (res.ok) {
                toast.success(statement.id ? 'Açıklama Güncellendi! ✅' : 'Açıklama Başarıyla Eklendi! ✅');
                fetchExisting();
                if (!statement.id) {
                    setStatement({ title: '', content: '', entity: '', type: 'tff', date: new Date().toISOString().split('T')[0] });
                }
            } else {
                toast.error('Hata: İşlem başarısız.');
            }
        } catch (e) {
            toast.error('Bağlantı Hatası');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={`space-y-3 p-4 border border-gray-200 rounded shadow-sm relative ${statement.id ? 'bg-amber-50 border-amber-300' : 'bg-white'}`}>
            <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold text-lg text-gray-800">{statement.id ? 'Açıklamayı Düzenle' : 'Resmi Açıklama Ekle'}</h3>
                {statement.id && (
                    <button
                        type="button"
                        onClick={() => setStatement({ title: '', content: '', entity: '', type: 'tff', date: new Date().toISOString().split('T')[0] })}
                        className="text-[10px] font-bold bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300"
                    >
                        YENİ EKLE (İPTAL)
                    </button>
                )}
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Düzenlemek İçin Seçin</label>
                <select
                    className="border border-gray-300 p-2 w-full rounded text-sm bg-white"
                    value={statement.id || ''}
                    onChange={(e) => handleSelect(e.target.value)}
                >
                    <option value="">-- Yeni Açıklama Ekle --</option>
                    {existingStatements.map(s => (
                        <option key={s.id} value={s.id}>{s.date} - {s.entity}: {s.title.substring(0, 30)}...</option>
                    ))}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Tür</label>
                    <select className="border border-gray-300 p-2 w-full rounded text-sm bg-white" value={statement.type} onChange={e => setStatement({ ...statement, type: e.target.value as any })}>
                        <option value="tff">TFF / MHK</option>
                        <option value="club">Kulüp</option>
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-500 uppercase">Tarih</label>
                    <input type="date" className="border border-gray-300 p-2 w-full rounded text-sm bg-white" value={statement.date} onChange={e => setStatement({ ...statement, date: e.target.value })} />
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Kurum / Kulüp Adı</label>
                <input placeholder="örn: TFF, Galatasaray" className="border border-gray-300 p-2 w-full rounded text-sm bg-white" value={statement.entity} onChange={e => setStatement({ ...statement, entity: e.target.value })} required />
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Başlık</label>
                <input placeholder="Haftalık Hakem Atamaları Hakkında" className="border border-gray-300 p-2 w-full rounded text-sm bg-white" value={statement.title} onChange={e => setStatement({ ...statement, title: e.target.value })} required />
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">İçerik</label>
                <textarea placeholder="Açıklama metni..." className="border border-gray-300 p-2 w-full rounded h-32 text-sm bg-white" value={statement.content} onChange={e => setStatement({ ...statement, content: e.target.value })} required />
            </div>

            <button disabled={loading} className={`p-2 rounded w-full text-white font-bold transition-transform active:scale-95 ${statement.id ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {loading ? 'İşleniyor...' : (statement.id ? 'DEĞİŞİKLİKLERİ KAYDET' : 'AÇIKLAMAYI YAYINLA')}
            </button>
        </form>
    );
};

interface DisciplinaryFormProps extends BaseProps {
    editItem?: DisciplinaryAction | null;
    onCancelEdit?: () => void;
    onSuccess?: () => void;
}

export const DisciplinaryForm = ({ apiKey, authToken, editItem, onCancelEdit, onSuccess }: DisciplinaryFormProps) => {
    const [action, setAction] = useState<Partial<DisciplinaryAction>>({
        teamName: '', subject: '', reason: '', penalty: '', date: new Date().toISOString().split('T')[0],
        type: 'pfdk', matchId: '', note: ''
    });
    const [pfdkTarget, setPfdkTarget] = useState<'player' | 'staff' | 'club' | 'other'>('player');
    const [decisionType, setDecisionType] = useState<'referral' | 'penalty'>('penalty');

    // Effect to populate form when editItem changes
    useEffect(() => {
        if (editItem) {
            setAction({
                ...editItem,
                date: editItem.date
            });
            if (editItem.type === 'pfdk') {
                if (editItem.subject === 'Kulüp') setPfdkTarget('club');
                else setPfdkTarget('player');
            }
            setDecisionType(editItem.penalty ? 'penalty' : 'referral');
        } else {
            setAction({
                teamName: '', subject: '', reason: '', penalty: '', date: new Date().toISOString().split('T')[0],
                type: 'pfdk', matchId: '', note: ''
            });
            setDecisionType('penalty');
        }
    }, [editItem]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let finalAction = { ...action };
        if (finalAction.type === 'pfdk' && pfdkTarget === 'club') {
            finalAction.subject = 'Kulüp';
        }

        if (decisionType === 'referral') {
            finalAction.penalty = '';
        }

        // --- DATA CLEANING START ---
        if (finalAction.teamName) {
            // Import top-level or ensure cached if possible, but dynamic is fine here
            const { resolveTeamId, getTeamName } = await import('@/lib/teams');
            const resolvedId = resolveTeamId(finalAction.teamName);
            if (resolvedId) {
                finalAction.teamName = getTeamName(resolvedId);
            }
        }

        if (finalAction.penalty) {
            let p = finalAction.penalty.replace(/^Ceza:\s*/i, '');
            // Matches: "40.000.-TL", "40.000.- TL", "40.000  .-  TL" etc.
            p = p.replace(/(\d+)\s*\.-\s*TL/g, '$1 TL');
            finalAction.penalty = p.trim();
        }
        // --- DATA CLEANING END ---

        const url = editItem ? '/api/admin/disciplinary' : '/api/admin/disciplinary';
        const method = editItem ? 'PUT' : 'POST';

        let matchId = finalAction.matchId || '';
        if (matchId && !matchId.startsWith('d-')) {
            matchId = `d-${matchId}`;
        }

        const body = { ...finalAction, matchId, id: editItem?.id };

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'x-admin-key': apiKey, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
            body: JSON.stringify(body),
        });

        if (res.ok) {
            toast.success(`PFDK Kararı ${editItem ? 'Güncellendi' : 'Eklendi'}! ✅`);
            if (onSuccess) onSuccess();
            if (onCancelEdit) onCancelEdit();
            if (!editItem) {
                setAction({
                    teamName: '', subject: '', reason: '', penalty: '', date: new Date().toISOString().split('T')[0],
                    type: 'pfdk', matchId: '', note: ''
                });
                setDecisionType('penalty');
            }
        } else {
            const errData = await res.json();
            toast.error(`Hata: ${errData.error || 'Bilinmeyen Hata'}\n${JSON.stringify(errData.details || {}, null, 2)}`);
        }
    };

    return (
        <form onSubmit={handleSubmit} className={`space-y-3 p-4 border border-gray-200 rounded shadow-sm relative ${editItem ? 'bg-amber-50 border-amber-300' : 'bg-white'}`}>
            {editItem && (
                <div className="absolute top-2 right-2 flex gap-2">
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded">DÜZENLENİYOR</span>
                    <button type="button" onClick={onCancelEdit} className="text-[10px] font-bold text-gray-500 hover:text-gray-800 bg-gray-100 px-2 py-1 rounded">İPTAL</button>
                </div>
            )}
            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">{editItem ? 'Kaydı Düzenle' : 'PFDK'}</h3>

            <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                    <label className="text-xs font-bold text-gray-500">Bağlı Maç (Maçsız Sevk için boş bırakın)</label>
                    <MatchSelect
                        value={action.matchId || ''}
                        onChange={(id, week) => setAction({ ...action, matchId: id, week: week })}
                        className={`mb-2 ${pfdkTarget === 'other' ? 'opacity-50 pointer-events-none bg-gray-100' : ''}`}
                    />
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setAction({
                            teamName: '', subject: '', reason: '', penalty: '', date: new Date().toISOString().split('T')[0],
                            type: 'pfdk', matchId: ''
                        });
                        setPfdkTarget('player');
                        setDecisionType('penalty');
                        if (onCancelEdit) onCancelEdit();
                    }}
                    className="bg-gray-200 text-gray-700 font-bold px-3 py-2 rounded text-sm mb-0.5 hover:bg-gray-300"
                >
                    Sıfırla
                </button>
            </div>

            {action.type === 'pfdk' && (
                <div className="space-y-2 mb-2">
                    <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                        <button type="button" onClick={() => setDecisionType('referral')} className={`flex-1 py-1.5 rounded-md text-xs font-black uppercase transition-all ${decisionType === 'referral' ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>SEVK HAREKETLERİ</button>
                        <button type="button" onClick={() => setDecisionType('penalty')} className={`flex-1 py-1.5 rounded-md text-xs font-black uppercase transition-all ${decisionType === 'penalty' ? 'bg-red-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>CEZA KARARLARI</button>
                    </div>

                    <div className="flex gap-2">
                        <button type="button" onClick={() => setPfdkTarget('player')} className={`flex-1 text-xs py-1 rounded border ${pfdkTarget === 'player' ? 'bg-red-50 border-red-500 text-red-700 font-bold' : 'bg-gray-50 text-gray-500'}`}>Futbolcu</button>
                        <button type="button" onClick={() => setPfdkTarget('staff')} className={`flex-1 text-xs py-1 rounded border ${pfdkTarget === 'staff' ? 'bg-red-50 border-red-500 text-red-700 font-bold' : 'bg-gray-50 text-gray-500'}`}>Teknik/İdari</button>
                        <button type="button" onClick={() => { setPfdkTarget('club'); setAction(prev => ({ ...prev, subject: 'Kulüp' })); }} className={`flex-1 text-xs py-1 rounded border ${pfdkTarget === 'club' ? 'bg-red-50 border-red-500 text-red-700 font-bold' : 'bg-gray-50 text-gray-500'}`}>Kulüp</button>
                        <button type="button" onClick={() => { setPfdkTarget('other'); setAction(prev => ({ ...prev, matchId: '' })); }} className={`flex-1 text-xs py-1 rounded border ${pfdkTarget === 'other' ? 'bg-red-50 border-red-500 text-red-700 font-bold' : 'bg-gray-50 text-gray-500'}`}>Diğer</button>
                    </div>
                </div>
            )}

            {!(pfdkTarget === 'club') && (
                <input
                    placeholder={`Özne (${pfdkTarget === 'player' ? 'Futbolcu Adı' : 'Yönetici Adı'})`}
                    className="border border-gray-300 p-2 w-full rounded"
                    value={action.subject}
                    onChange={e => setAction({ ...action, subject: e.target.value })}
                    required
                />
            )}

            {action.type === 'pfdk' && (
                <input
                    placeholder="Takım Adı (örn: Galatasaray)"
                    className="border border-gray-300 p-2 w-full rounded"
                    value={action.teamName}
                    onChange={e => setAction({ ...action, teamName: e.target.value })}
                    onBlur={() => {
                        if (action.teamName) {
                            import('@/lib/teams').then(({ resolveTeamId, getTeamName }) => {
                                const resolvedId = resolveTeamId(action.teamName!);
                                if (resolvedId) {
                                    const fullName = getTeamName(resolvedId);
                                    setAction(prev => ({ ...prev, teamName: fullName }));
                                }
                            });
                        }
                    }}
                    required
                />
            )}

            <textarea
                placeholder="Karar Metni (Tamamı) - Buraya yazdığınız metin SİLİNMEZ, sitede aynen bu şekilde görünür. Tırnak içindeki kısımlar otomatik olarak 'Gerekçe' alanına kopyalanır."
                className="border border-blue-200 bg-blue-50 p-2 w-full rounded h-32 text-xs font-mono mb-2"
                value={action.note || ''}
                onChange={e => {
                    const newNote = e.target.value;
                    let newReason = action.reason || '';

                    // Extract all quoted parts (including quotes)
                    // Matches: "...", '...', “...”, ”...”, «...»
                    const regex = /["'“”«»][^"'“”«»]+["'“”«»]/g;
                    const matches = newNote.match(regex);

                    if (matches && matches.length > 0) {
                        newReason = matches.join(' ');
                    }

                    setAction({ ...action, note: newNote, reason: newReason });
                }}
            />

            <textarea
                placeholder={decisionType === 'referral' ? "Sevk Gerekçesi (Kısa - Özet)" : "Ceza Gerekçesi (Özet)"}
                className="border border-gray-300 p-2 w-full rounded h-24 font-bold"
                value={action.reason}
                onChange={e => setAction({ ...action, reason: e.target.value })}
                required
            />

            {action.type === 'pfdk' && decisionType === 'penalty' && (
                <div className="relative">
                    <textarea
                        placeholder="Verilen Ceza (Kısa Özet) - Örn: 2 Maç Men"
                        className="border border-red-200 bg-red-50 p-2 w-full rounded text-red-800 placeholder-red-300 font-bold min-h-[60px]"
                        value={action.penalty || ''}
                        onChange={e => setAction({ ...action, penalty: e.target.value })}
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setAction(prev => ({ ...prev, penalty: (prev.penalty ? prev.penalty + '\n' : '') + '- ' }))}
                        className="absolute bottom-2 right-2 bg-red-200 hover:bg-red-300 text-red-800 text-xs px-2 py-1 rounded shadow-sm"
                        title="Yeni Satır Ekle"
                    >
                        + Satır
                    </button>
                </div>
            )}

            <input type="date" className="border border-gray-300 p-2 w-full rounded" value={action.date} onChange={e => setAction({ ...action, date: e.target.value })} />

            <button className={`p-2 rounded w-full text-white font-bold transition-colors ${decisionType === 'referral' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}>
                {editItem ? 'Güncelle' : 'Kaydet'}
            </button>
        </form>
    );
};

// Internal Match Selector Component
export const MatchSelect = ({ value, onChange, className = "" }: { value: string, onChange: (val: string, week?: number) => void, className?: string }) => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedWeek, setSelectedWeek] = useState<number | string>('');

    useEffect(() => {
        const fetchMatchesForWeek = async () => {
            if (!selectedWeek) {
                setMatches([]);
                return;
            }
            setLoading(true);
            try {
                const { collection, getDocs, orderBy, query, where } = await import('firebase/firestore');
                const { db } = await import('@/firebase/client');
                const q = query(
                    collection(db, 'matches'),
                    where('week', '==', Number(selectedWeek)),
                    orderBy('date', 'desc')
                );
                const snap = await getDocs(q);
                setMatches(snap.docs.map(d => ({ ...d.data(), id: d.id } as Match)));
            } catch (e) {
                console.error("Match fetch error", e);
            } finally {
                setLoading(false);
            }
        };
        fetchMatchesForWeek();
    }, [selectedWeek]);

    // Grouping logic removed since we fetch per week
    const weeks = Array.from({ length: 38 }, (_, i) => i + 1).sort((a, b) => b - a);
    const currentWeekMatches = matches;

    return (
        <div className={`flex gap-2 ${className}`}>
            <div className="w-1/3">
                <select
                    className="border border-gray-300 p-2 w-full rounded font-mono text-sm"
                    value={selectedWeek}
                    onChange={e => {
                        setSelectedWeek(e.target.value);
                        onChange('', e.target.value ? Number(e.target.value) : undefined); // Reset match selection when week changes
                    }}
                    disabled={loading}
                >
                    <option value="">Hafta...</option>
                    {weeks.map(week => (
                        <option key={week} value={week}>{week}. Hafta</option>
                    ))}
                </select>
            </div>
            <div className="w-2/3">
                <select
                    className="border border-gray-300 p-2 w-full rounded font-mono text-sm"
                    value={value}
                    onChange={e => {
                        const matchId = e.target.value;
                        const match = matches.find(m => m.id === matchId);
                        onChange(matchId, match?.week);
                    }}
                    disabled={loading || !selectedWeek}
                >
                    <option value="">{loading ? 'Yükleniyor...' : (selectedWeek ? 'Maç Seçiniz...' : 'Önce Hafta Seçin')}</option>
                    {currentWeekMatches.map(m => (
                        <option key={m.id} value={m.id}>
                            {m.homeTeamName} - {m.awayTeamName}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

interface DisciplinaryListProps extends BaseProps {
    onEdit: (item: DisciplinaryAction) => void;
    // Trigger to refresh list
    refreshTrigger?: number;
}

export const DisciplinaryList = ({ apiKey, authToken, onEdit, refreshTrigger }: DisciplinaryListProps) => {
    const [matchId, setMatchId] = useState('');
    const [items, setItems] = useState<DisciplinaryAction[]>([]);
    const [loading, setLoading] = useState(false);

    // Auto-refresh when refreshTrigger changes, if matchId exists
    useEffect(() => {
        if (matchId && refreshTrigger && refreshTrigger > 0) {
            handleFetch();
        }
    }, [refreshTrigger]);

    const handleFetch = async () => {
        if (!matchId) return toast.error('Lütfen Maç ID giriniz (örn: week1-gfk-gs).');
        setLoading(true);
        try {
            const { collection, query, where, getDocs } = await import('firebase/firestore');
            const { db } = await import('@/firebase/client');

            let searchId = matchId.trim();
            if (searchId && !searchId.startsWith('d-')) {
                searchId = `d-${searchId}`;
            }

            const q = query(collection(db, 'disciplinary_actions'), where('matchId', '==', searchId));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ ...d.data(), id: d.id })) as DisciplinaryAction[];
            setItems(data);
            if (data.length === 0) toast.error('Bu maç IDsi ile eşleşen kayıt bulunamadı.');
        } catch (error) {
            console.error(error);
            toast.error('Hata: Veriler getirilemedi.');
        } finally {
            setLoading(false);
        }
    };

    const handleSync = async () => {
        if (!confirm('Tüm disiplin sevklerini yeni formata (d- prefix) senkronize etmek istediğinize emin misiniz?')) return;
        setLoading(true);
        try {
            const res = await fetch('/api/admin/disciplinary/sync', {
                method: 'POST',
                headers: {
                    'x-admin-key': apiKey,
                    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
                }
            });
            if (res.ok) {
                const data = await res.json();
                toast.success(`${data.processed} kayıt başarıyla senkronize edildi! ✅`);
                if (matchId) handleFetch();
            } else {
                toast.error('Senkronizasyon başarısız oldu.');
            }
        } catch (e) {
            console.error(e);
            toast.error('Ağ hatası oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
        try {
            const res = await fetch(`/api/admin/disciplinary?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'x-admin-key': apiKey,
                    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
                }
            });

            if (res.ok) {
                setItems(items.filter(i => i.id !== id));
                toast.success('Kayıt Başarıyla Silindi! 🗑️');
            } else {
                toast.error('Hata: Silinirken sorun oluştu.');
            }
        } catch (e) {
            console.error(e);
            toast.error('Hata: Ağ hatası oluştu.');
        }
    };

    return (
        <div className="space-y-3 p-4 border border-gray-200 bg-white rounded shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center border-b pb-2">
                <h3 className="font-bold text-lg text-gray-800">PFDK / Performans Listesi</h3>
                <button
                    onClick={handleSync}
                    disabled={loading}
                    className="text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                >
                    {loading ? '...' : 'SENKRONİZE ET'}
                </button>
            </div>
            <div className="flex gap-2">
                <div className="flex-1">
                    <MatchSelect value={matchId} onChange={setMatchId} />
                </div>
                <button onClick={handleFetch} disabled={loading} className="bg-gray-800 text-white px-3 rounded font-bold text-sm">
                    {loading ? '...' : 'Getir'}
                </button>
                <button
                    onClick={() => { setMatchId(''); setItems([]); }}
                    className="bg-gray-200 text-gray-700 px-3 rounded font-bold text-sm"
                    title="Listeyi ve seçimi temizle"
                >
                    Sıfırla
                </button>
            </div>

            <div className="space-y-2 mt-2 max-h-[400px] overflow-y-auto pr-1 flex-1">
                {items.map(item => (
                    <div key={item.id} className="text-xs border p-2 rounded bg-gray-50 flex justify-between items-start group hover:bg-gray-100 transition-colors">
                        <div className="flex-1">
                            <div className="font-bold text-blue-900 flex items-center gap-2">
                                {item.subject}
                                <span className={`px-1 rounded text-[9px] uppercase ${item.type === 'performance' ? 'bg-blue-200 text-blue-800' : 'bg-red-200 text-red-800'}`}>
                                    {item.type === 'performance' ? 'PERF' : 'PFDK'}
                                </span>
                            </div>
                            <div className="text-[10px] text-gray-500 mb-1">{item.teamName ? item.teamName + ' - ' : ''} {item.date}</div>
                            <p className="text-gray-700 italic border-l-2 border-gray-300 pl-1">{item.reason}</p>
                            {item.penalty && <p className="text-red-600 font-bold text-[10px] mt-1 bg-red-50 p-1 rounded inline-block whitespace-pre-wrap">CEZA: {item.penalty}</p>}
                        </div>
                        <div className='flex flex-col gap-1 ml-2'>
                            <button onClick={() => handleDelete(item.id)} className="text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity px-2 hover:bg-red-50 rounded">Sil</button>
                            <button onClick={() => onEdit(item)} className="text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity px-2 hover:bg-blue-50 rounded">Düzenle</button>
                        </div>

                    </div>
                ))}

                {items.length > 0 && (
                    <p className="text-[10px] text-gray-400 text-center pt-2">Toplam {items.length} kayıt.</p>
                )}

                {items.length === 0 && !loading && (
                    <div className="text-center py-8 text-gray-400 italic text-xs">
                        Maç ID yazıp "Getir" butonuna basınız.
                    </div>
                )}
            </div>
        </div>
    );
};

export const RefereeStatsForm = ({ apiKey, authToken }: BaseProps) => {
    const [matchId, setMatchId] = useState('');
    const [stats, setStats] = useState<RefereeStats>({
        ballInPlayTime: '',
        fouls: 0,
        yellowCards: 0,
        redCards: 0,
        incorrectDecisions: 0,
        errorsFavoringHome: 0,
        errorsFavoringAway: 0,
        homeErrors: [] as string[],
        awayErrors: [] as string[],
        performanceNotes: [] as string[]
    });

    // Temp states for adding items
    const [tempHomeError, setTempHomeError] = useState('');
    const [tempAwayError, setTempAwayError] = useState('');
    const [tempHomeMinute, setTempHomeMinute] = useState('');
    const [tempAwayMinute, setTempAwayMinute] = useState('');
    const [tempNote, setTempNote] = useState('');

    // Editing State
    const [editingState, setEditingState] = useState<{
        type: 'homeError' | 'awayError' | 'note';
        index: number;
    } | null>(null);

    const handleFetchForEdit = async () => {
        if (!matchId) return;
        try {
            const { doc, getDoc } = await import('firebase/firestore');
            const { db } = await import('@/firebase/client');
            const snap = await getDoc(doc(db, 'matches', matchId));
            if (snap.exists() && snap.data().refereeStats) {
                const fetched = snap.data().refereeStats;
                setStats({
                    ...stats,
                    ...fetched,
                    homeErrors: fetched.homeErrors || [],
                    awayErrors: fetched.awayErrors || [],
                    performanceNotes: fetched.performanceNotes || []
                });
            } else {
                toast.error('Maç bulundu ancak kayıtlı istatistik yok veya maç yok.');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!matchId) return toast.error('Maç ID giriniz.');

        try {
            const res = await fetch('/api/admin/matches', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': apiKey,
                    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
                },
                body: JSON.stringify({
                    id: matchId,
                    refereeStats: {
                        ...stats,
                        errorsFavoringHome: stats.homeErrors?.length || 0,
                        errorsFavoringAway: stats.awayErrors?.length || 0,
                        incorrectDecisions: (stats.homeErrors?.length || 0) + (stats.awayErrors?.length || 0) + stats.incorrectDecisions
                    }
                })
            });

            if (res.ok) {
                toast.success('Haftanın Hakem Performansı Kaydedildi! ✅');
            } else {
                const data = await res.json();
                toast.error(`Hata: ${data.error || 'Güncellenemedi'}`);
            }
        } catch (error) {
            console.error(error);
            toast.error('Sunucu hatası oluştu.');
        }
    };

    // Helper for Uppercase
    const toUpper = (val: string) => val.toLocaleUpperCase('tr-TR');

    // --- HOME ERRORS ---
    const addHomeError = () => {
        if (!tempHomeError) return;
        const fullError = tempHomeMinute ? `${tempHomeMinute}' ${tempHomeError}` : tempHomeError;

        if (editingState?.type === 'homeError') {
            const newErrors = [...(stats.homeErrors || [])];
            newErrors[editingState.index] = fullError;
            setStats({ ...stats, homeErrors: newErrors, errorsFavoringHome: newErrors.length });
            setEditingState(null);
        } else {
            setStats(prev => ({
                ...prev,
                homeErrors: [...(prev.homeErrors || []), fullError],
                errorsFavoringHome: (prev.homeErrors?.length || 0) + 1
            }));
        }
        setTempHomeError('');
        setTempHomeMinute('');
    };

    const editHomeError = (index: number) => {
        const err = stats.homeErrors?.[index] || '';
        const parts = err.match(/^(\d+'?)\s+(.*)$/);
        if (parts) {
            setTempHomeMinute(parts[1].replace("'", ""));
            setTempHomeError(parts[2]);
        } else {
            setTempHomeMinute('');
            setTempHomeError(err);
        }
        setEditingState({ type: 'homeError', index });
    };

    const removeHomeError = (index: number) => {
        const newErrors = [...(stats.homeErrors || [])];
        newErrors.splice(index, 1);
        setStats(prev => ({ ...prev, homeErrors: newErrors, errorsFavoringHome: newErrors.length }));
        if (editingState?.type === 'homeError' && editingState.index === index) {
            setEditingState(null);
            setTempHomeError('');
            setTempHomeMinute('');
        }
    };

    // --- AWAY ERRORS ---
    const addAwayError = () => {
        if (!tempAwayError) return;
        const fullError = tempAwayMinute ? `${tempAwayMinute}' ${tempAwayError}` : tempAwayError;

        if (editingState?.type === 'awayError') {
            const newErrors = [...(stats.awayErrors || [])];
            newErrors[editingState.index] = fullError;
            setStats({ ...stats, awayErrors: newErrors, errorsFavoringAway: newErrors.length });
            setEditingState(null);
        } else {
            setStats(prev => ({
                ...prev,
                awayErrors: [...(prev.awayErrors || []), fullError],
                errorsFavoringAway: (prev.awayErrors?.length || 0) + 1
            }));
        }
        setTempAwayError('');
        setTempAwayMinute('');
    };

    const editAwayError = (index: number) => {
        const err = stats.awayErrors?.[index] || '';
        const parts = err.match(/^(\d+'?)\s+(.*)$/);
        if (parts) {
            setTempAwayMinute(parts[1].replace("'", ""));
            setTempAwayError(parts[2]);
        } else {
            setTempAwayMinute('');
            setTempAwayError(err);
        }
        setEditingState({ type: 'awayError', index });
    };

    const removeAwayError = (index: number) => {
        const newErrors = [...(stats.awayErrors || [])];
        newErrors.splice(index, 1);
        setStats(prev => ({ ...prev, awayErrors: newErrors, errorsFavoringAway: newErrors.length }));
        if (editingState?.type === 'awayError' && editingState.index === index) {
            setEditingState(null);
            setTempAwayError('');
            setTempAwayMinute('');
        }
    };

    // --- NOTES ---
    const addNote = () => {
        if (!tempNote) return;
        if (editingState?.type === 'note') {
            const newNotes = [...(stats.performanceNotes || [])];
            newNotes[editingState.index] = tempNote;
            setStats({ ...stats, performanceNotes: newNotes });
            setEditingState(null);
        } else {
            setStats(prev => ({ ...prev, performanceNotes: [...(prev.performanceNotes || []), tempNote] }));
        }
        setTempNote('');
    };

    const editNote = (index: number) => {
        setTempNote(stats.performanceNotes?.[index] || '');
        setEditingState({ type: 'note', index });
    };

    const removeNote = (index: number) => {
        const newNotes = [...(stats.performanceNotes || [])];
        newNotes.splice(index, 1);
        setStats(prev => ({ ...prev, performanceNotes: newNotes }));
        if (editingState?.type === 'note' && editingState.index === index) {
            setEditingState(null);
            setTempNote('');
        }
    };

    return (
        <form onSubmit={handleSave} className="space-y-4 p-4 border border-gray-200 bg-white rounded shadow-sm">
            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Hakem Karnesi & Hatalar</h3>

            <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                    <label className="text-xs font-bold text-gray-500">Maç Seçimi</label>
                    <MatchSelect value={matchId} onChange={setMatchId} />
                </div>
                <button type="button" onClick={handleFetchForEdit} className="bg-gray-800 text-white px-3 py-2 rounded font-bold text-sm mb-0.5">
                    Getir
                </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pb-2 border-b">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Topla Oynama (dk)</label>
                    <input placeholder="örn: 54:30" className="border border-gray-300 p-2 w-full rounded" value={stats.ballInPlayTime} onChange={e => setStats({ ...stats, ballInPlayTime: e.target.value })} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Faul Sayısı</label>
                    <input type="number" className="border border-gray-300 p-2 w-full rounded" value={stats.fouls} onChange={e => setStats({ ...stats, fouls: +e.target.value })} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Sarı Kart</label>
                    <input type="number" className="border border-gray-300 p-2 w-full rounded" value={stats.yellowCards} onChange={e => setStats({ ...stats, yellowCards: +e.target.value })} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Kırmızı Kart</label>
                    <input type="number" className="border border-gray-300 p-2 w-full rounded" value={stats.redCards} onChange={e => setStats({ ...stats, redCards: +e.target.value })} />
                </div>
                <div className="space-y-1 col-span-2">
                    <label className="text-xs font-bold text-gray-500">Toplam Hatalı Karar (Otomatik Paketlenir)</label>
                    <input type="number" className="border border-gray-300 p-2 w-full rounded bg-gray-100" readOnly value={(stats.homeErrors?.length || 0) + (stats.awayErrors?.length || 0)} />
                </div>
            </div>

            {/* Error Lists */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Home Stats */}
                <div className="bg-orange-50 p-3 rounded border border-orange-100">
                    <h4 className="font-bold text-orange-800 text-sm mb-2 border-b border-orange-200 pb-1">Ev Sahibi Aleyhine Hata</h4>
                    <div className="flex gap-1 mb-2">
                        <input placeholder="Dk" className="w-12 border p-1 text-sm rounded" value={tempHomeMinute} onChange={e => setTempHomeMinute(e.target.value)} />
                        <input placeholder="Hata detayı..." className="flex-1 border p-1 text-sm rounded" value={tempHomeError} onChange={e => setTempHomeError(e.target.value)} />
                        <button type="button" onClick={addHomeError} className="bg-orange-600 text-white px-2 py-1 rounded text-xs font-bold">
                            {editingState?.type === 'homeError' ? 'Ok' : '+'}
                        </button>
                    </div>
                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                        {(stats.homeErrors || []).map((err, i) => (
                            <li key={i} className="text-xs text-gray-700 bg-white p-1 rounded border flex justify-between items-center group">
                                <span>{err}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button type="button" onClick={() => editHomeError(i)} className="text-blue-500 font-bold px-1">D</button>
                                    <button type="button" onClick={() => removeHomeError(i)} className="text-red-500 font-bold px-1">Sil</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Away Stats */}
                <div className="bg-blue-50 p-3 rounded border border-blue-100">
                    <h4 className="font-bold text-blue-800 text-sm mb-2 border-b border-blue-200 pb-1">Deplasman Aleyhine Hata</h4>
                    <div className="flex gap-1 mb-2">
                        <input placeholder="Dk" className="w-12 border p-1 text-sm rounded" value={tempAwayMinute} onChange={e => setTempAwayMinute(e.target.value)} />
                        <input placeholder="Hata detayı..." className="flex-1 border p-1 text-sm rounded" value={tempAwayError} onChange={e => setTempAwayError(e.target.value)} />
                        <button type="button" onClick={addAwayError} className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">
                            {editingState?.type === 'awayError' ? 'Ok' : '+'}
                        </button>
                    </div>
                    <ul className="space-y-1 max-h-40 overflow-y-auto">
                        {(stats.awayErrors || []).map((err, i) => (
                            <li key={i} className="text-xs text-gray-700 bg-white p-1 rounded border flex justify-between items-center group">
                                <span>{err}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button type="button" onClick={() => editAwayError(i)} className="text-blue-500 font-bold px-1">D</button>
                                    <button type="button" onClick={() => removeAwayError(i)} className="text-red-500 font-bold px-1">Sil</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Performance Notes */}
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <h4 className="font-bold text-gray-800 text-sm mb-2 border-b border-gray-300 pb-1">Genel Performans Notları</h4>
                <div className="flex gap-1 mb-2">
                    <input placeholder="Hakem performansı hakkında not ekle..." className="flex-1 border p-1 text-sm rounded" value={tempNote} onChange={e => setTempNote(e.target.value)} />
                    <button type="button" onClick={addNote} className="bg-gray-700 text-white px-3 py-1 rounded text-xs font-bold">
                        {editingState?.type === 'note' ? 'Ok' : 'Ekle'}
                    </button>
                </div>
                <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {(stats.performanceNotes || []).map((note, i) => (
                        <li key={i} className="text-xs text-gray-700 bg-white p-1 rounded border flex justify-between items-center group">
                            <span>{note}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button type="button" onClick={() => editNote(i)} className="text-blue-500 font-bold px-1">D</button>
                                <button type="button" onClick={() => removeNote(i)} className="text-red-500 font-bold px-1">Sil</button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <button className="bg-green-600 text-white font-bold p-3 rounded w-full hover:bg-green-700 shadow-md">
                Karneyi Kaydet
            </button>
        </form>
    );
};
