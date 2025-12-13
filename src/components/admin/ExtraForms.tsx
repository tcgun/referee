"use client";

import { useState } from 'react';
import { Standing, Statement, DisciplinaryAction } from '@/types';

interface BaseProps {
    apiKey: string;
}

export const StandingForm = ({ apiKey }: BaseProps) => {
    const [standing, setStanding] = useState<Partial<Standing>>({
        id: '', rank: 1, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDiff: 0, points: 0
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/admin/standings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': apiKey },
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

export const StatementForm = ({ apiKey }: BaseProps) => {
    const [statement, setStatement] = useState<Partial<Statement>>({
        title: '', content: '', entity: '', type: 'tff', date: new Date().toISOString().split('T')[0]
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/admin/statements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': apiKey },
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

export const DisciplinaryForm = ({ apiKey }: BaseProps) => {
    const [action, setAction] = useState<Partial<DisciplinaryAction>>({
        teamName: '', subject: '', reason: '', date: new Date().toISOString().split('T')[0]
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/admin/disciplinary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': apiKey },
            body: JSON.stringify(action),
        });
        if (res.ok) alert('PFDK Sevki Eklendi!');
        else alert('Hata oluştu');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-gray-200 bg-white rounded shadow-sm">
            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">PFDK Sevki Ekle</h3>
            <input placeholder="Takım Adı (örn: Galatasaray)" className="border border-gray-300 p-2 w-full rounded" value={action.teamName} onChange={e => setAction({ ...action, teamName: e.target.value })} required />
            <input placeholder="Özne (Futbolcu/Yönetici Adı)" className="border border-gray-300 p-2 w-full rounded" value={action.subject} onChange={e => setAction({ ...action, subject: e.target.value })} required />
            <textarea placeholder="Sevk Nedeni (Gerekçe)" className="border border-gray-300 p-2 w-full rounded h-24" value={action.reason} onChange={e => setAction({ ...action, reason: e.target.value })} required />
            <input type="date" className="border border-gray-300 p-2 w-full rounded" value={action.date} onChange={e => setAction({ ...action, date: e.target.value })} />

            <button className="bg-red-600 text-white p-2 rounded w-full">Kaydet</button>
        </form>
    );
};
