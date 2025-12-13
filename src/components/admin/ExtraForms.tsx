"use client";

import { useState } from 'react';
import { Standing, Statement, DisciplinaryAction } from '@/types';

interface BaseProps {
    apiKey: string;
}

export const StandingForm = ({ apiKey }: BaseProps) => {
    const [standing, setStanding] = useState<Partial<Standing>>({
        id: '', teamName: '', played: 0, won: 0, drawn: 0, lost: 0, goalDiff: 0, points: 0
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Since we don't have a dedicated API for this yet, we'll generally default to a generic 'bulk' or 'single' endpoint logic
        // But for MVP phase 2, let's assume we create generic admin endpoints or specific ones. 
        // Let's assume /api/admin/standings exists.
        const res = await fetch('/api/admin/standings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-admin-key': apiKey },
            body: JSON.stringify(standing),
        });
        if (res.ok) alert('Puan Durumu Eklendi!');
        else alert('Hata oluştu');
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-3 p-4 border border-gray-200 bg-white rounded shadow-sm">
            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Puan Durumu Ekle</h3>
            <input placeholder="Takım ID (örn: galatasaray)" className="border border-gray-300 p-2 w-full rounded" value={standing.id} onChange={e => setStanding({ ...standing, id: e.target.value })} required />
            <input placeholder="Takım Adı" className="border border-gray-300 p-2 w-full rounded" value={standing.teamName} onChange={e => setStanding({ ...standing, teamName: e.target.value })} required />
            <div className="grid grid-cols-4 gap-2">
                <input type="number" placeholder="O" className="border p-2 rounded" value={standing.played} onChange={e => setStanding({ ...standing, played: +e.target.value })} />
                <input type="number" placeholder="G" className="border p-2 rounded" value={standing.won} onChange={e => setStanding({ ...standing, won: +e.target.value })} />
                <input type="number" placeholder="B" className="border p-2 rounded" value={standing.drawn} onChange={e => setStanding({ ...standing, drawn: +e.target.value })} />
                <input type="number" placeholder="M" className="border p-2 rounded" value={standing.lost} onChange={e => setStanding({ ...standing, lost: +e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
                <input type="number" placeholder="Averaj" className="border p-2 rounded" value={standing.goalDiff} onChange={e => setStanding({ ...standing, goalDiff: +e.target.value })} />
                <input type="number" placeholder="Puan" className="border p-2 rounded" value={standing.points} onChange={e => setStanding({ ...standing, points: +e.target.value })} />
            </div>
            <button className="bg-purple-600 text-white p-2 rounded w-full">Kaydet</button>
        </form>
    );
};

export const StatementForm = ({ apiKey }: BaseProps) => {
    const [statement, setStatement] = useState<Partial<Statement>>({
        id: '', title: '', content: '', entity: 'TFF', date: new Date().toISOString().split('T')[0], type: 'tff'
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
            <h3 className="font-bold text-lg text-gray-800 border-b pb-2">Açıklama Ekle (TFF/Kulüp)</h3>
            <input placeholder="ID (otomatik veya manuel)" className="border border-gray-300 p-2 w-full rounded" value={statement.id} onChange={e => setStatement({ ...statement, id: e.target.value })} />
            <select className="border border-gray-300 p-2 w-full rounded" value={statement.type} onChange={e => setStatement({ ...statement, type: e.target.value as any })}>
                <option value="tff">TFF</option>
                <option value="club">Kulüp</option>
            </select>
            <input placeholder="Kurum Adı (örn: Galatasaray SK)" className="border border-gray-300 p-2 w-full rounded" value={statement.entity} onChange={e => setStatement({ ...statement, entity: e.target.value })} />
            <input placeholder="Başlık" className="border border-gray-300 p-2 w-full rounded" value={statement.title} onChange={e => setStatement({ ...statement, title: e.target.value })} required />
            <textarea placeholder="İçerik..." rows={3} className="border border-gray-300 p-2 w-full rounded" value={statement.content} onChange={e => setStatement({ ...statement, content: e.target.value })} />
            <button className="bg-indigo-600 text-white p-2 rounded w-full">Kaydet</button>
        </form>
    );
};

export const DisciplinaryForm = ({ apiKey }: BaseProps) => {
    const [action, setAction] = useState<Partial<DisciplinaryAction>>({
        id: '', teamName: '', subject: '', reason: '', date: new Date().toISOString().split('T')[0]
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
            <input placeholder="ID" className="border border-gray-300 p-2 w-full rounded" value={action.id} onChange={e => setAction({ ...action, id: e.target.value })} />
            <input placeholder="Takım Adı" className="border border-gray-300 p-2 w-full rounded" value={action.teamName} onChange={e => setAction({ ...action, teamName: e.target.value })} />
            <input placeholder="Kişi (Futbolcu/Yönetici)" className="border border-gray-300 p-2 w-full rounded" value={action.subject} onChange={e => setAction({ ...action, subject: e.target.value })} required />
            <textarea placeholder="Sevk Nedeni (örn: Hakaret)" rows={2} className="border border-gray-300 p-2 w-full rounded" value={action.reason} onChange={e => setAction({ ...action, reason: e.target.value })} />
            <button className="bg-orange-600 text-white p-2 rounded w-full">Kaydet</button>
        </form>
    );
};
