"use client";

import { useState, useEffect } from 'react';
import { Opinion, Incident } from '@/types';
import { toast } from 'sonner';

interface OpinionFormProps {
    apiKey: string;
    authToken?: string;
    defaultMatchId?: string;
    onMatchChange?: (id: string) => void;
    existingIncidents?: Array<Incident & { opinions: Opinion[] }>;
    onSuccess?: () => void;
}

export const OpinionForm = ({ apiKey, authToken, defaultMatchId, onMatchChange, existingIncidents, onSuccess }: OpinionFormProps) => {
    const [matchId, setMatchId] = useState(''); // Changed initial state
    const [incidentId, setIncidentId] = useState('');
    const [opinion, setOpinion] = useState<Partial<Opinion>>({
        id: '', criticName: 'Deniz Çoban', opinion: '', shortOpinion: '', reasoning: '', judgment: 'correct'
    });

    // Sync matchId with defaultMatchId using useEffect
    useEffect(() => {
        if (defaultMatchId && defaultMatchId !== matchId) {
            setMatchId(defaultMatchId);
        }
    }, [defaultMatchId, matchId]);

    // Handler for matchId changes, including the callback
    const handleMatchIdChange = (newId: string) => {
        setMatchId(newId);
        if (onMatchChange) onMatchChange(newId);
    };

    // Auto-increment Opinion ID logic
    useEffect(() => {
        if (matchId && incidentId && existingIncidents) {
            const incident = existingIncidents.find(inc => inc.id === incidentId && inc.matchId === matchId);
            if (incident && incident.opinions && incident.opinions.length > 0) {
                const numericIds = incident.opinions
                    .map((op: Opinion) => {
                        const match = op.id.match(/\d+/);
                        return match ? parseInt(match[0]) : 0;
                    })
                    .filter((n: number) => !isNaN(n));

                const maxId = numericIds.length > 0 ? Math.max(...numericIds) : 0;
                setOpinion(prev => ({ ...prev, id: `opn${maxId + 1}` }));
            } else {
                setOpinion(prev => ({ ...prev, id: 'opn1' }));
            }
        }
    }, [matchId, incidentId, existingIncidents]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/admin/opinions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': apiKey,
                ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
            },
            body: JSON.stringify({ ...opinion, matchId, incidentId }),
        });
        if (res.ok) {
            toast.success('Yorum Başarıyla Eklendi! ✅');

            // Increment logic for next opinion
            const currentNum = parseInt(opinion.id?.replace('opn', '') || '0') || 0;
            const nextId = `opn${currentNum + 1}`;

            setOpinion({
                id: nextId,
                criticName: opinion.criticName || 'Deniz Çoban',
                opinion: '',
                shortOpinion: '',
                reasoning: '',
                judgment: 'correct',
                type: opinion.type || 'trio'
            });
            if (onSuccess) onSuccess();
        } else {
            const errData = await res.json();
            toast.error(`Hata: ${errData.error}`);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-gray-200 bg-white rounded shadow-sm">
            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Yorum Ekle (Opinion)</h3>
            <div className="grid grid-cols-2 gap-2">
                <input placeholder="Match ID" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={matchId} onChange={e => handleMatchIdChange(e.target.value)} required />
                <select className="border border-gray-300 p-2 w-full rounded text-gray-900" value={incidentId} onChange={e => setIncidentId(e.target.value)} required>
                    <option value="">(Pozisyon Seçiniz)</option>
                    {existingIncidents && [...existingIncidents]
                        .filter((inc: any) => inc.matchId === matchId)
                        .sort((a: any, b: any) => a.id.localeCompare(b.id, undefined, { numeric: true }))
                        .map((inc: any) => (
                            <option key={inc.id} value={inc.id}>{inc.minute}' - {inc.id} - {inc.description?.substring(0, 30)}...</option>
                        ))}
                </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
                <input placeholder="Yorum ID" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={opinion.id} onChange={e => setOpinion({ ...opinion, id: e.target.value })} required />
                <select
                    className="border border-gray-300 p-2 w-full rounded text-gray-900"
                    value={opinion.type || 'trio'}
                    onChange={e => {
                        const newType = e.target.value as any;
                        setOpinion({
                            ...opinion,
                            type: newType,
                            criticName: newType === 'trio' ? 'Bülent Yıldırım, Deniz Çoban, Bahattin Duran' : ''
                        });
                    }}
                >
                    <option value="trio">Trio Yorumu (Ortak)</option>
                    <option value="general">Genel Yorumcu</option>
                </select>
            </div>

            <div className="mb-2">
                <label className="text-xs font-bold text-gray-500 block mb-1">Karar Durumu (Görsel İçin)</label>
                <div className="flex gap-2">
                    {['correct', 'incorrect', 'controversial'].map((j) => (
                        <button
                            key={j}
                            type="button"
                            onClick={() => setOpinion({ ...opinion, judgment: j as any })}
                            className={`flex-1 p-2 rounded border text-sm font-bold flex items-center justify-center gap-2 ${opinion.judgment === j ?
                                (j === 'correct' ? 'bg-green-100 border-green-500 text-green-700' : j === 'incorrect' ? 'bg-red-100 border-red-500 text-red-700' : 'bg-amber-100 border-amber-500 text-amber-700')
                                : 'bg-white border-gray-300 text-gray-400'}`}
                        >
                            <span>{j === 'correct' ? '✅' : j === 'incorrect' ? '❌' : '⚠️'}</span> {j === 'correct' ? 'Doğru' : j === 'incorrect' ? 'Hatalı' : 'Tartışmalı'}
                        </button>
                    ))}
                </div>
            </div>

            {opinion.type === 'general' && (
                <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Yorumcu İsmi" className="border border-gray-300 p-2 w-full rounded text-gray-900" value={opinion.criticName} onChange={e => setOpinion({ ...opinion, criticName: e.target.value })} required />
                    <select className="border border-gray-300 p-2 w-full rounded text-gray-900" onChange={e => setOpinion({ ...opinion, criticName: e.target.value })}>
                        <option value="">(İsim Seç)</option>
                        <option value="Lale Orta">Lale Orta</option>
                        <option value="Erman Toroğlu">Erman Toroğlu</option>
                        <option value="Ahmet Çakar">Ahmet Çakar</option>
                        <option value="Fırat Aydınus">Fırat Aydınus</option>
                    </select>
                </div>
            )}

            {opinion.type === 'trio' && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs font-bold text-blue-700">
                    Trio Yorumcuları: Bülent Yıldırım, Deniz Çoban, Bahattin Duran (Ortak Karar)
                </div>
            )}
            <textarea placeholder="Kısa Yorum (Özet)..." rows={2} className="border border-gray-300 p-2 w-full rounded text-gray-900" value={opinion.shortOpinion || ''} onChange={e => setOpinion({ ...opinion, shortOpinion: e.target.value })} />
            <textarea placeholder="Uzun Yorum (Detaylı)..." rows={4} className="border border-gray-300 p-2 w-full rounded text-gray-900" value={opinion.opinion || ''} onChange={e => setOpinion({ ...opinion, opinion: e.target.value })} />

            <div className='flex gap-2'>
                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white p-2 rounded flex-1 font-medium">Yorumu Kaydet</button>
                {opinion.id && (
                    <button
                        type="button"
                        onClick={async () => {
                            if (!confirm('Yorumu silmek istediğine emin misin?')) return;
                            const res = await fetch(`/api/admin/opinions?matchId=${matchId}&incidentId=${incidentId}&id=${opinion.id}`, {
                                method: 'DELETE',
                                headers: {
                                    'x-admin-key': apiKey,
                                    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
                                },
                            });
                            if (res.ok) {
                                toast.success('Yorum Başarıyla Silindi! 🗑️');
                                setOpinion({ ...opinion, id: '', opinion: '', reasoning: '' });
                                if (onSuccess) onSuccess();
                            }
                        }}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 p-2 rounded w-16"
                    >Sil</button>
                )}
            </div>

            {existingIncidents && existingIncidents.length > 0 && (
                <div className="mt-4 border-t pt-4">
                    <h4 className="font-bold text-gray-700 mb-2">Ekli Yorumlar:</h4>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                        {existingIncidents
                            .filter((inc: any) => inc.matchId === matchId)
                            .flatMap((inc: any) =>
                                (inc.opinions || []).map((op: any) => ({ ...op, incidentData: inc }))
                            ).map((op: any) => (
                                <div key={`${op.incidentData.id}-${op.id}`} onClick={() => { setIncidentId(op.incidentData.id); setOpinion(op); }} className="p-2 border rounded bg-white hover:bg-green-50 cursor-pointer text-sm">
                                    <div className="flex justify-between text-xs text-gray-400">
                                        <span>{op.incidentData.minute}' - {op.incidentData.id}</span>
                                        <span className="font-mono">[{op.id}]</span>
                                    </div>
                                    <div className="font-bold text-gray-800">{op.criticName}</div>
                                    <p className="truncate text-gray-600">{op.opinion}</p>
                                </div>
                            ))}
                    </div>
                </div>
            )}
        </form>
    );
};
