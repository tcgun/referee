"use client";

import { useState, useEffect } from 'react';
import { Standing, Statement, DisciplinaryAction, RefereeStats, Match } from '@/types';

interface BaseProps {
    apiKey: string;
    authToken?: string;
}

export const StandingForm = ({ apiKey, authToken }: BaseProps) => {
    const [standing, setStanding] = useState<Partial<Standing>>({
        id: '', rank: 1, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/admin/standings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': apiKey, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
            body: JSON.stringify({ ...standing, teamName: standing.id }),
        });
        if (res.ok) alert('Puan Durumu Eklendi!');
        else alert('Hata oluştu');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-gray-200 bg-white rounded shadow-sm">
            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Puan Durumu Ekle</h3>
            <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500">Takım Kodu (ID)</label>
                <input placeholder="örn: galatasaray" className="border border-gray-300 p-2 w-full rounded" value={standing.id} onChange={e => setStanding({ ...standing, id: e.target.value })} required />
            </div>

            <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500">Sıralama (Rank)</label>
                <input type="number" placeholder="Kaçıncı sırada?" className="border border-gray-300 p-2 w-full rounded" value={standing.rank || ''} onChange={e => setStanding({ ...standing, rank: +e.target.value })} />
            </div>

            <div className="grid grid-cols-4 gap-3 pt-2">
                <div className="space-y-1"><span className="text-xs text-gray-500 font-bold block text-center">O</span><input type="number" className="border p-2 rounded w-full text-center" value={standing.played || ''} onChange={e => setStanding({ ...standing, played: +e.target.value })} /></div>
                <div className="space-y-1"><span className="text-xs text-gray-500 font-bold block text-center">G</span><input type="number" className="border p-2 rounded w-full text-center" value={standing.won || ''} onChange={e => setStanding({ ...standing, won: +e.target.value })} /></div>
                <div className="space-y-1"><span className="text-xs text-gray-500 font-bold block text-center">B</span><input type="number" className="border p-2 rounded w-full text-center" value={standing.drawn || ''} onChange={e => setStanding({ ...standing, drawn: +e.target.value })} /></div>
                <div className="space-y-1"><span className="text-xs text-gray-500 font-bold block text-center">M</span><input type="number" className="border p-2 rounded w-full text-center" value={standing.lost || ''} onChange={e => setStanding({ ...standing, lost: +e.target.value })} /></div>

                <div className="space-y-1"><span className="text-xs text-gray-500 font-bold block text-center">AG</span><input type="number" className="border p-2 rounded w-full text-center" value={standing.goalsFor || ''} onChange={e => setStanding({ ...standing, goalsFor: +e.target.value })} /></div>
                <div className="space-y-1"><span className="text-xs text-gray-500 font-bold block text-center">YG</span><input type="number" className="border p-2 rounded w-full text-center" value={standing.goalsAgainst || ''} onChange={e => setStanding({ ...standing, goalsAgainst: +e.target.value })} /></div>
                <div className="space-y-1"><span className="text-xs text-gray-500 font-bold block text-center">AV</span><input type="number" className="border p-2 rounded w-full text-center" value={standing.goalDiff || ''} onChange={e => setStanding({ ...standing, goalDiff: +e.target.value })} /></div>
                <div className="space-y-1"><span className="text-xs text-gray-500 font-bold block text-center">P</span><input type="number" className="border p-2 rounded w-full text-center font-black bg-gray-50" value={standing.points || ''} onChange={e => setStanding({ ...standing, points: +e.target.value })} /></div>
            </div>

            <button className="bg-purple-600 text-white p-2 rounded w-full">Kaydet</button>
        </form>
    );
};

export const StatementForm = ({ apiKey, authToken }: BaseProps) => {
    const [statement, setStatement] = useState<Partial<Statement>>({
        title: '', content: '', entity: '', type: 'tff', date: new Date().toISOString().split('T')[0]
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/admin/statements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': apiKey, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
            body: JSON.stringify(statement),
        });
        if (res.ok) alert('Açıklama Eklendi!');
        else alert('Hata oluştu');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-gray-200 bg-white rounded shadow-sm">
            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Resmi Açıklama Ekle</h3>
            <select className="border border-gray-300 p-2 w-full rounded" value={statement.type} onChange={e => setStatement({ ...statement, type: e.target.value as any })}>
                <option value="tff">TFF / MHK</option>
                <option value="club">Kulüp</option>
            </select>
            <input placeholder="Kurum Adı (örn: TFF, Galatasaray)" className="border border-gray-300 p-2 w-full rounded" value={statement.entity} onChange={e => setStatement({ ...statement, entity: e.target.value })} required />
            <input placeholder="Başlık" className="border border-gray-300 p-2 w-full rounded" value={statement.title} onChange={e => setStatement({ ...statement, title: e.target.value })} required />
            <textarea placeholder="Açıklama içeriği..." className="border border-gray-300 p-2 w-full rounded h-24" value={statement.content} onChange={e => setStatement({ ...statement, content: e.target.value })} required />
            <input type="date" className="border border-gray-300 p-2 w-full rounded" value={statement.date} onChange={e => setStatement({ ...statement, date: e.target.value })} />

            <button className="bg-blue-600 text-white p-2 rounded w-full">Kaydet</button>
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
        type: 'pfdk', matchId: ''
    });
    const [pfdkTarget, setPfdkTarget] = useState<'player' | 'staff' | 'club'>('player');

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
        } else {
            setAction({
                teamName: '', subject: '', reason: '', penalty: '', date: new Date().toISOString().split('T')[0],
                type: 'pfdk', matchId: ''
            });
        }
    }, [editItem]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        let finalAction = { ...action };
        if (finalAction.type === 'pfdk' && pfdkTarget === 'club') {
            finalAction.subject = 'Kulüp';
        }

        const url = editItem ? '/api/admin/disciplinary' : '/api/admin/disciplinary';
        const method = editItem ? 'PUT' : 'POST';
        const body = { ...finalAction, id: editItem?.id };

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'x-admin-key': apiKey, ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}) },
            body: JSON.stringify(body),
        });

        if (res.ok) {
            alert(editItem ? 'Kayıt Güncellendi!' : 'Kayıt Eklendi!');
            if (onSuccess) onSuccess();
            if (onCancelEdit) onCancelEdit();
            if (!editItem) {
                setAction({
                    teamName: '', subject: '', reason: '', penalty: '', date: new Date().toISOString().split('T')[0],
                    type: 'pfdk', matchId: ''
                });
            }
        } else {
            const errData = await res.json();
            alert(`Hata: ${errData.error || 'Bilinmeyen Hata'}\n${JSON.stringify(errData.details || {}, null, 2)}`);
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
                    <label className="text-xs font-bold text-gray-500">Bağlı Maç Seçimi (Opsiyonel)</label>
                    <MatchSelect value={action.matchId || ''} onChange={(val) => setAction({ ...action, matchId: val })} />
                </div>
                <button
                    type="button"
                    onClick={() => {
                        setAction({
                            teamName: '', subject: '', reason: '', penalty: '', date: new Date().toISOString().split('T')[0],
                            type: 'pfdk', matchId: ''
                        });
                        setPfdkTarget('player');
                        if (onCancelEdit) onCancelEdit();
                    }}
                    className="bg-gray-200 text-gray-700 font-bold px-3 py-2 rounded text-sm mb-0.5 hover:bg-gray-300"
                >
                    Sıfırla
                </button>
            </div>

            {action.type === 'pfdk' && (
                <div className="flex gap-2 mb-1">
                    <button type="button" onClick={() => setPfdkTarget('player')} className={`flex-1 text-xs py-1 rounded border ${pfdkTarget === 'player' ? 'bg-red-50 border-red-500 text-red-700 font-bold' : 'bg-gray-50 text-gray-500'}`}>Futbolcu</button>
                    <button type="button" onClick={() => setPfdkTarget('staff')} className={`flex-1 text-xs py-1 rounded border ${pfdkTarget === 'staff' ? 'bg-red-50 border-red-500 text-red-700 font-bold' : 'bg-gray-50 text-gray-500'}`}>Yönetici</button>
                    <button type="button" onClick={() => setPfdkTarget('club')} className={`flex-1 text-xs py-1 rounded border ${pfdkTarget === 'club' ? 'bg-red-50 border-red-500 text-red-700 font-bold' : 'bg-gray-50 text-gray-500'}`}>Kulüp</button>
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

            <textarea placeholder="Sevk Nedeni (Gerekçe)" className="border border-gray-300 p-2 w-full rounded h-24" value={action.reason} onChange={e => setAction({ ...action, reason: e.target.value })} required />

            {action.type === 'pfdk' && (
                <input
                    placeholder="Verilen Ceza (Kısa Özet) - Örn: 2 Maç Men, 50.000 TL"
                    className="border border-red-200 bg-red-50 p-2 w-full rounded text-red-800 placeholder-red-300 font-bold"
                    value={action.penalty || ''}
                    onChange={e => setAction({ ...action, penalty: e.target.value })}
                />
            )}

            <input type="date" className="border border-gray-300 p-2 w-full rounded" value={action.date} onChange={e => setAction({ ...action, date: e.target.value })} />

            <button className="p-2 rounded w-full text-white font-bold bg-red-600 hover:bg-red-700">
                {editItem ? 'Güncelle' : 'Kaydet'}
            </button>
        </form>
    );
};

// Internal Match Selector Component
const MatchSelect = ({ value, onChange }: { value: string, onChange: (val: string) => void }) => {
    const [matches, setMatches] = useState<Match[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchMatches = async () => {
            setLoading(true);
            try {
                const { collection, getDocs, orderBy, query } = await import('firebase/firestore');
                const { db } = await import('@/firebase/client');
                const q = query(collection(db, 'matches'), orderBy('date', 'desc')); // Most recent first
                const snap = await getDocs(q);
                setMatches(snap.docs.map(d => ({ ...d.data(), id: d.id } as Match)));
            } catch (e) {
                console.error("Match fetch error", e);
            } finally {
                setLoading(false);
            }
        };
        fetchMatches();
    }, []);

    return (
        <select
            className="border border-gray-300 p-2 w-full rounded font-mono text-sm"
            value={value}
            onChange={e => onChange(e.target.value)}
            disabled={loading}
        >
            <option value="">{loading ? 'Yükleniyor...' : 'Maç Seçiniz...'}</option>
            {matches.map(m => (
                <option key={m.id} value={m.id}>
                    {String(m.date)} - {m.homeTeamName} vs {m.awayTeamName} ({m.id})
                </option>
            ))}
        </select>
    );
};

interface DisciplinaryListProps extends BaseProps {
    onEdit: (item: DisciplinaryAction) => void;
    // Trigger to refresh list
    refreshTrigger?: number;
}

export const DisciplinaryList = ({ apiKey, onEdit, refreshTrigger }: DisciplinaryListProps) => {
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
        if (!matchId) return alert('Lütfen Maç ID giriniz (örn: week1-gfk-gs).');
        setLoading(true);
        try {
            const { collection, query, where, getDocs, deleteDoc, doc } = await import('firebase/firestore');
            const { db } = await import('@/firebase/client');

            const q = query(collection(db, 'disciplinary_actions'), where('matchId', '==', matchId));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ ...d.data(), id: d.id })) as DisciplinaryAction[];
            setItems(data);
            if (data.length === 0) alert('Bu maç IDsi ile eşleşen kayıt bulunamadı.');
        } catch (error) {
            console.error(error);
            alert('Hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu kaydı silmek istediğinize emin misiniz?')) return;
        try {
            const res = await fetch(`/api/admin/disciplinary?id=${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-key': apiKey }
            });

            if (res.ok) {
                setItems(items.filter(i => i.id !== id));
                alert('Kayıt silindi.');
            } else {
                alert('Silinirken hata oluştu.');
            }
        } catch (e) {
            console.error(e);
            alert('Silinemedi.');
        }
    };

    return (
        <div className="space-y-3 p-4 border border-gray-200 bg-white rounded shadow-sm h-full flex flex-col">
            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">PFDK / Performans Listesi</h3>
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
                            {item.penalty && <p className="text-red-600 font-bold text-[10px] mt-1 bg-red-50 p-1 rounded inline-block">CEZA: {item.penalty}</p>}
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
                alert('Maç bulundu ancak kayıtlı istatistik yok veya maç yok.');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!matchId) return alert('Maç ID giriniz.');

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
                alert('Hakem istatistikleri ve notları güncellendi!');
            } else {
                const data = await res.json();
                alert(`Hata: ${data.error || 'Güncellenemedi'}`);
            }
        } catch (error) {
            console.error(error);
            alert('Sunucu hatası oluştu.');
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
            setStats(prev => ({
                ...prev,
                performanceNotes: [...(prev.performanceNotes || []), tempNote]
            }));
        }
        setTempNote('');
    };

    const editNote = (index: number) => {
        setTempNote(stats.performanceNotes![index]);
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

    const cancelEdit = () => {
        setEditingState(null);
        setTempHomeError('');
        setTempHomeMinute('');
        setTempAwayError('');
        setTempAwayMinute('');
        setTempNote('');
    };

    return (
        <form onSubmit={handleSave} className={`space-y-4 p-4 border border-gray-200 rounded shadow-sm relative ${editingState ? 'bg-amber-50 border-amber-300' : 'bg-white'}`}>
            {editingState && (
                <div className="absolute top-2 right-2 flex gap-2">
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-2 py-1 rounded">DÜZENLENİYOR ({editingState.type})</span>
                    <button type="button" onClick={cancelEdit} className="text-[10px] font-bold text-gray-500 hover:text-gray-800 bg-gray-100 px-2 py-1 rounded">İPTAL</button>
                </div>
            )}
            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Hakem İstatistikleri & Hata Analizi</h3>

            {/* Match ID Fetch */}
            <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                    <label className="text-xs font-bold text-gray-500">Maç Seçimi</label>
                    <MatchSelect value={matchId} onChange={setMatchId} />
                </div>
                <button type="button" onClick={handleFetchForEdit} className="bg-indigo-600 text-white font-bold px-3 py-2 rounded text-sm mb-0.5 hover:bg-indigo-700">Getir</button>
                <button
                    type="button"
                    onClick={() => {
                        setMatchId('');
                        setStats({
                            ballInPlayTime: '',
                            fouls: 0,
                            yellowCards: 0,
                            redCards: 0,
                            incorrectDecisions: 0,
                            errorsFavoringHome: 0,
                            errorsFavoringAway: 0,
                            homeErrors: [],
                            awayErrors: [],
                            performanceNotes: []
                        });
                        cancelEdit();
                    }}
                    className="bg-gray-200 text-gray-700 font-bold px-3 py-2 rounded text-sm mb-0.5 hover:bg-gray-300"
                >
                    Sıfırla
                </button>
            </div>

            {/* General Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Topun Oyunda Kalma Süresi</label>
                    <input className="border border-gray-300 p-2 w-full rounded" value={stats.ballInPlayTime} onChange={e => setStats({ ...stats, ballInPlayTime: e.target.value })} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Toplam Hatalı Karar (Manuel)</label>
                    <input type="number" className="border border-gray-300 p-2 w-full rounded" value={stats.incorrectDecisions} onChange={e => setStats({ ...stats, incorrectDecisions: +e.target.value })} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-yellow-600">Sarı Kartlar</label>
                    <input type="number" className="border border-gray-300 p-2 w-full rounded" value={stats.yellowCards} onChange={e => setStats({ ...stats, yellowCards: +e.target.value })} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-red-600">Kırmızı Kartlar</label>
                    <input type="number" className="border border-gray-300 p-2 w-full rounded" value={stats.redCards} onChange={e => setStats({ ...stats, redCards: +e.target.value })} />
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">Toplam Faul</label>
                    <input type="number" className="border border-gray-300 p-2 w-full rounded" value={stats.fouls} onChange={e => setStats({ ...stats, fouls: +e.target.value })} />
                </div>
            </div>

            {/* NOTES SECTION */}
            <div className="space-y-2 bg-blue-50 p-3 rounded border border-blue-200">
                <div className="flex justify-between items-center border-b border-blue-200 pb-1">
                    <label className="text-xs font-bold text-blue-700 uppercase">Maç / Hakem Notları</label>
                </div>
                <div className="flex gap-1">
                    <input
                        placeholder="Not ekle (Otomatik BÜYÜK HARF)..."
                        className="border border-blue-300 p-1 w-full rounded text-xs"
                        value={tempNote}
                        onChange={e => setTempNote(toUpper(e.target.value))}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addNote())}
                    />
                    <button type="button" onClick={addNote} className="bg-blue-600 text-white text-xs px-2 rounded font-bold">
                        {editingState?.type === 'note' ? 'Güzenle' : '+'}
                    </button>
                </div>
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                    {stats.performanceNotes?.map((note, i) => (
                        <li key={i} className="text-[10px] bg-white border border-blue-100 p-1 rounded flex justify-between items-center group">
                            <span>{note}</span>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                <button type="button" onClick={() => editNote(i)} className="text-blue-500 font-bold px-1">✎</button>
                                <button type="button" onClick={() => removeNote(i)} className="text-red-500 font-bold px-1">X</button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Errors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-3 rounded border border-gray-200">
                {/* Home Stats */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center border-b pb-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Ev Sahibi Lehine ({stats.errorsFavoringHome})</label>
                    </div>
                    <div className="flex gap-1">
                        <input
                            placeholder="Dk"
                            className="border border-gray-300 p-1 w-12 rounded text-xs text-center"
                            value={tempHomeMinute}
                            onChange={e => setTempHomeMinute(toUpper(e.target.value))}
                        />
                        <input
                            placeholder="Hata açıklaması..."
                            className="border border-gray-300 p-1 w-full rounded text-xs"
                            value={tempHomeError}
                            onChange={e => setTempHomeError(toUpper(e.target.value))}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addHomeError())}
                        />
                        <button type="button" onClick={addHomeError} className="bg-gray-800 text-white text-xs px-2 rounded font-bold">
                            {editingState?.type === 'homeError' ? '✎' : '+'}
                        </button>
                    </div>
                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                        {stats.homeErrors?.map((err, i) => (
                            <li key={i} className="text-[10px] bg-white border p-1 rounded flex justify-between items-center group">
                                <span>{err}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                    <button type="button" onClick={() => editHomeError(i)} className="text-blue-500 font-bold px-1">✎</button>
                                    <button type="button" onClick={() => removeHomeError(i)} className="text-red-500 font-bold px-1">X</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Away Stats */}
                <div className="space-y-2">
                    <div className="flex justify-between items-center border-b pb-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Deplasman Lehine ({stats.errorsFavoringAway})</label>
                    </div>
                    <div className="flex gap-1">
                        <input
                            placeholder="Dk"
                            className="border border-gray-300 p-1 w-12 rounded text-xs text-center"
                            value={tempAwayMinute}
                            onChange={e => setTempAwayMinute(toUpper(e.target.value))}
                        />
                        <input
                            placeholder="Hata açıklaması..."
                            className="border border-gray-300 p-1 w-full rounded text-xs"
                            value={tempAwayError}
                            onChange={e => setTempAwayError(toUpper(e.target.value))}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAwayError())}
                        />
                        <button type="button" onClick={addAwayError} className="bg-gray-800 text-white text-xs px-2 rounded font-bold">
                            {editingState?.type === 'awayError' ? '✎' : '+'}
                        </button>
                    </div>
                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                        {stats.awayErrors?.map((err, i) => (
                            <li key={i} className="text-[10px] bg-white border p-1 rounded flex justify-between items-center group">
                                <span>{err}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                                    <button type="button" onClick={() => editAwayError(i)} className="text-blue-500 font-bold px-1">✎</button>
                                    <button type="button" onClick={() => removeAwayError(i)} className="text-red-500 font-bold px-1">X</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <button className="bg-indigo-600 text-white p-2 rounded w-full font-bold hover:bg-indigo-700">İstatistikleri ve Hataları Kaydet</button>
        </form>
    );
};
