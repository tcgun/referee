"use client";

import { useState, useEffect } from 'react';
import { Incident } from '@/types';
import { db } from '@/firebase/client';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { MatchSelect } from '@/components/admin/ExtraForms';

interface IncidentFormProps {
    apiKey: string;
    authToken?: string;
    defaultMatchId?: string;
    onMatchChange?: (id: string) => void;
    existingIncidents?: Incident[];
    onSuccess?: () => void;
}

export const IncidentForm = ({ apiKey, authToken, defaultMatchId, onMatchChange, existingIncidents, onSuccess }: IncidentFormProps) => {
    const [matchId, setMatchId] = useState('');
    const [incident, setIncident] = useState<Partial<Incident>>({
        id: '', minute: 1, description: '', refereeDecision: '', finalDecision: '',
        missedCards: [], incorrectCards: []
    });

    const [newMissedCard, setNewMissedCard] = useState<{ player: string, card: 'yellow' | 'red' }>({ player: '', card: 'yellow' });
    const [newIncorrectCard, setNewIncorrectCard] = useState<{ player: string, given: 'none' | 'yellow' | 'red', correct: 'none' | 'yellow' | 'red' }>({ player: '', given: 'none', correct: 'none' });
    const [players, setPlayers] = useState<string[]>([]);

    useEffect(() => {
        if (!matchId) {
            setPlayers([]);
            return;
        }

        const fetchPlayers = async () => {
            try {
                const matchSnap = await getDoc(doc(db, 'matches', matchId));
                if (matchSnap.exists()) {
                    const data = matchSnap.data();
                    const lineupPlayers: string[] = [];

                    if (data.lineups) {
                        const { home, away, homeSubs, awaySubs } = data.lineups;
                        [home, away, homeSubs, awaySubs].forEach(group => {
                            if (Array.isArray(group)) {
                                group.forEach((p: any) => {
                                    if (p.name) lineupPlayers.push(p.name);
                                });
                            }
                        });
                    }

                    // Remove duplicates and sort
                    setPlayers(Array.from(new Set(lineupPlayers)).sort());
                }
            } catch (error) {
                console.error("Error fetching match players:", error);
            }
        };

        fetchPlayers();
    }, [matchId]);

    useEffect(() => {
        if (defaultMatchId && defaultMatchId !== matchId) {
            setMatchId(defaultMatchId);
        }
    }, [defaultMatchId]);

    const handleMatchChange = (id: string) => {
        setMatchId(id);
        if (onMatchChange) onMatchChange(id);
    };

    // Auto-increment ID logic
    useEffect(() => {
        if (matchId && existingIncidents) {
            const matchIncidents = existingIncidents.filter(inc => inc.matchId === matchId);
            if (matchIncidents.length > 0) {
                const numericIds = matchIncidents
                    .map(inc => {
                        const match = inc.id.match(/\d+/);
                        return match ? parseInt(match[0]) : 0;
                    })
                    .filter(n => !isNaN(n));

                const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
                setIncident(prev => ({ ...prev, id: `inc${maxId + 1}` }));
            } else {
                setIncident(prev => ({ ...prev, id: 'inc1' }));
            }
        }
    }, [matchId, existingIncidents]);

    const addMissedCard = () => {
        if (!newMissedCard.player) return toast.error('Oyuncu ismi giriniz');

        // Logic to detect repeated missed cards for this player in this match
        const previousMissed = existingIncidents?.filter(inc => inc.matchId === matchId)
            .flatMap(inc => inc.missedCards || [])
            .filter(mc => mc.player.toLocaleLowerCase('tr-TR') === newMissedCard.player.toLocaleLowerCase('tr-TR')) || [];

        const repeatedCount = previousMissed.length + 1;
        const isRepeated = repeatedCount > 1;

        const card: any = {
            ...newMissedCard,
            isRepeated,
            repeatedCount
        };

        setIncident(prev => ({
            ...prev,
            missedCards: [...(prev.missedCards || []), card]
        }));
        setNewMissedCard({ player: '', card: 'yellow' });
    };

    const addIncorrectCard = () => {
        if (!newIncorrectCard.player) return toast.error('Oyuncu ismi giriniz');
        const card: any = {
            player: newIncorrectCard.player,
            givenCard: newIncorrectCard.given,
            correctCard: newIncorrectCard.correct
        };
        setIncident(prev => ({
            ...prev,
            incorrectCards: [...(prev.incorrectCards || []), card]
        }));
        setNewIncorrectCard({ player: '', given: 'none', correct: 'none' });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/admin/incidents', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': apiKey,
                ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
            },
            body: JSON.stringify({ ...incident, matchId }),
        });
        if (res.ok) {
            toast.success('Pozisyon Başarıyla Eklendi! ✅');

            // Auto-increment logic: find the current number and add 1
            const currentNum = parseInt(incident.id?.replace('inc', '') || '0') || 0;
            const nextId = `inc${currentNum + 1}`;

            setIncident({
                id: nextId,
                minute: 1,
                description: '',
                refereeDecision: '',
                finalDecision: '',
                impact: 'none',
                varRecommendation: 'none',
                varDecision: '',
                videoUrl: '',
                missedCards: [],
                incorrectCards: []
            });

            if (onSuccess) onSuccess();
        } else toast.error('Hata: Pozisyon eklenemedi.');
    };

    const handleLoad = async () => {
        if (!matchId || !incident.id) return toast.error('Lütfen Maç ID ve Pozisyon ID giriniz');
        try {
            const snap = await getDoc(doc(db, 'matches', matchId, 'incidents', incident.id!));
            if (snap.exists()) {
                setIncident({ ...snap.data(), id: snap.id } as Incident);
                toast.success('Pozisyon verisi yüklendi! 📥');
            } else {
                toast.error('Pozisyon bulunamadı.');
            }
        } catch (e) {
            console.error(e);
            toast.error('Yükleme hatası');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-gray-200 bg-white rounded shadow-sm">
            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Pozisyon Ekle (Incident)</h3>

            <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase">Maç Seçiniz</label>
                <MatchSelect
                    value={matchId}
                    onChange={handleMatchChange}
                    className="w-full"
                />
            </div>

            <div className="flex gap-2">
                <input type="text" placeholder="Dk (örn: 45+2)" className="border border-gray-300 p-2 w-24 rounded text-gray-900" value={incident.minute || ''} onChange={e => setIncident({ ...incident, minute: e.target.value })} />
                <input placeholder="Pozisyon ID (örn: inc1)" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={incident.id} onChange={e => setIncident({ ...incident, id: e.target.value })} required />
                <button type="button" onClick={handleLoad} className="bg-gray-200 hover:bg-gray-300 px-3 py-2 rounded text-gray-700 font-bold whitespace-nowrap">Getir</button>
            </div>
            <textarea placeholder="Pozisyon Açıklaması" rows={3} className="border border-gray-300 p-2 w-full rounded text-gray-900" value={incident.description} onChange={e => setIncident({ ...incident, description: e.target.value })} />
            <input placeholder="YouTube Linki" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={incident.videoUrl || ''} onChange={e => setIncident({ ...incident, videoUrl: e.target.value })} />

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
                        <option value="Faul + Sarı Kart">Faul + Sarı Kart</option>
                        <option value="Faul + Sarı Kart Verilmedi">Faul + Sarı Kart Verilmedi</option>
                        <option value="Faul + Kırmızı Kart">Faul + Kırmızı Kart</option>
                        <option value="Faul + Kırmızı Kart Verilmedi">Faul + Kırmızı Kart Verilmedi</option>
                        <option value="Avantaj">Avantaj</option>
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

            </div>

            {/* Missed Cards Section */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest">Kart Görmesi Gerekenler</h4>
                <div className="flex gap-2">
                    <input
                        list="match-players"
                        placeholder="Oyuncu İsmi"
                        className="flex-1 border border-amber-300 p-1.5 text-xs rounded"
                        value={newMissedCard.player}
                        onChange={e => setNewMissedCard({ ...newMissedCard, player: e.target.value })}
                    />
                    <select className="border border-amber-300 p-1.5 text-xs rounded" value={newMissedCard.card} onChange={e => setNewMissedCard({ ...newMissedCard, card: e.target.value as any })}>
                        <option value="yellow">Sarı</option>
                        <option value="red">Kırmızı</option>
                    </select>
                    <button type="button" onClick={addMissedCard} className="bg-amber-600 text-white px-3 py-1.5 rounded text-xs font-bold">Ekle</button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {incident.missedCards?.map((mc, idx) => (
                        <div key={idx} className="bg-white border border-amber-200 px-2 py-1 rounded-md text-[10px] flex items-center gap-2 group">
                            <span className={`w-2 h-3 rounded-sm ${mc.card === 'yellow' ? 'bg-yellow-400' : 'bg-red-600'}`}></span>
                            <span className="font-bold text-gray-700">{mc.player} {mc.isRepeated && <span className="text-red-500">({mc.repeatedCount}. KEZ)</span>}</span>
                            <button type="button" onClick={() => setIncident(prev => ({ ...prev, missedCards: prev.missedCards?.filter((_, i) => i !== idx) }))} className="text-gray-400 hover:text-red-500 ml-1">×</button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Incorrect Cards Section */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                <h4 className="text-xs font-black text-blue-700 uppercase tracking-widest">Yanlış Kart Görenler</h4>
                <div className="grid grid-cols-4 gap-1">
                    <input
                        list="match-players"
                        placeholder="Oyuncu"
                        className="col-span-1 border border-blue-300 p-1.5 text-xs rounded"
                        value={newIncorrectCard.player}
                        onChange={e => setNewIncorrectCard({ ...newIncorrectCard, player: e.target.value })}
                    />
                    <select className="border border-blue-300 p-1.5 text-xs rounded" value={newIncorrectCard.given} onChange={e => setNewIncorrectCard({ ...newIncorrectCard, given: e.target.value as any })}>
                        <option value="none">Verilen: Yok</option>
                        <option value="yellow">Verilen: Sarı</option>
                        <option value="red">Verilen: Kırmızı</option>
                    </select>
                    <select className="border border-blue-300 p-1.5 text-xs rounded" value={newIncorrectCard.correct} onChange={e => setNewIncorrectCard({ ...newIncorrectCard, correct: e.target.value as any })}>
                        <option value="none">Olması: Kart Verilmemeli</option>
                        <option value="yellow">Olması: Sarı</option>
                        <option value="red">Olması: Kırmızı</option>
                    </select>
                    <button type="button" onClick={addIncorrectCard} className="bg-blue-600 text-white px-2 py-1.5 rounded text-xs font-bold">Ekle</button>
                </div>
                <div className="flex flex-wrap gap-2">
                    {incident.incorrectCards?.map((ic, idx) => (
                        <div key={idx} className="bg-white border border-blue-200 px-2 py-1 rounded-md text-[10px] flex items-center gap-2">
                            <span className="font-bold text-gray-700">{ic.player}</span>
                            <div className="flex items-center gap-1">
                                <span className={`w-1.5 h-2 rounded-sm ${ic.givenCard === 'yellow' ? 'bg-yellow-400' : ic.givenCard === 'red' ? 'bg-red-600' : 'bg-gray-200'}`}></span>
                                <span>→</span>
                                <span className={`w-1.5 h-2 rounded-sm ${ic.correctCard === 'yellow' ? 'bg-yellow-400' : 'bg-red-600'}`}></span>
                            </div>
                            <button type="button" onClick={() => setIncident(prev => ({ ...prev, incorrectCards: prev.incorrectCards?.filter((_, i) => i !== idx) }))} className="text-gray-400 hover:text-red-500 ml-1">×</button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="mt-2 text-xs text-gray-400 italic">
                * Lehe/Aleyhe bilgisi artık buradan girilmeyecektir.
            </div>

            <div className="mt-2">
                <label className="text-xs font-bold text-gray-500">Verilmesi Gereken Karar</label>
                <input placeholder="Örn: NET PENALTI" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={incident.finalDecision || ''} onChange={e => setIncident({ ...incident, finalDecision: e.target.value.toLocaleUpperCase('tr-TR') })} />
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
                                headers: {
                                    'x-admin-key': apiKey,
                                    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
                                },
                            });
                            if (res.ok) {
                                toast.success('Pozisyon Başarıyla Silindi! 🗑️');
                                setIncident({ ...incident, id: '', description: '', refereeDecision: '', finalDecision: '' });
                                if (onSuccess) onSuccess();
                            }
                        }}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded w-16"
                    >Sil</button>
                )}
            </div>

            {existingIncidents && existingIncidents.length > 0 && (
                <div className="mt-4 border-t pt-4">
                    <h4 className="font-bold text-gray-700 mb-2">Ekli Pozisyonlar:</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {existingIncidents
                            .filter((inc: any) => inc.matchId === matchId)
                            .map((inc: any) => (
                                <div key={inc.id} onClick={() => setIncident(inc)} className="p-2 border rounded bg-white hover:bg-red-50 cursor-pointer text-sm">
                                    <span className="font-bold text-red-600 mr-2">{inc.minute}'</span>
                                    <span className="font-mono text-xs text-gray-400">[{inc.id}]</span>
                                    <p className="truncate text-gray-800">{inc.description}</p>
                                    <div className="flex gap-2 mt-1">
                                        {(inc.missedCards?.length > 0 || inc.incorrectCards?.length > 0) && (
                                            <span className="text-[9px] font-black text-amber-600 uppercase">⚠ KART HATASI VAR</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                    </div>
                </div>
            )}
            {/* Players Datalist */}
            <datalist id="match-players">
                {players.map((p, i) => (
                    <option key={i} value={p} />
                ))}
            </datalist>
        </form>
    );
};
