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
        id: '', minute: 1, description: '', refereeDecision: '', finalDecision: '', impact: 'none', varRecommendation: 'none'
    });

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
                videoUrl: ''
            });

            if (onSuccess) onSuccess();
        } else toast.error('Hata: Pozisyon eklenemedi.');
    };

    const handleLoad = async () => {
        if (!matchId || !incident.id) return toast.error('Lütfen Maç ID ve Pozisyon ID giriniz');
        try {
            const snap = await getDoc(doc(db, 'matches', matchId, 'incidents', incident.id!));
            if (snap.exists()) {
                setIncident(snap.data() as Incident);
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
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500">VAR Önerisi</label>
                    <select
                        className="border border-gray-300 p-2 w-full rounded text-gray-900"
                        value={incident.varRecommendation || 'none'}
                        onChange={e => {
                            const val = e.target.value as any;
                            const updates: Partial<Incident> = { varRecommendation: val };
                            if (val === 'none') {
                                updates.varDecision = 'Müdahale Yok';
                            }
                            setIncident(prev => ({ ...prev, ...updates }));
                        }}
                    >
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
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </form>
    );
};
