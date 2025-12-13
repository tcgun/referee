"use client";

import { useState } from 'react';
import { TeamForm, MatchForm, IncidentForm, OpinionForm } from '@/components/admin/AdminForms';
import { StandingForm, StatementForm, DisciplinaryForm } from '@/components/admin/ExtraForms';

export default function AdminPage() {
    const [apiKey, setApiKey] = useState('');
    const [seeding, setSeeding] = useState(false);

    // Central Data Management
    const [targetMatchId, setTargetMatchId] = useState('week1-gfk-gs');
    const [loadedMatch, setLoadedMatch] = useState<any>(null);
    const [loadedIncidents, setLoadedIncidents] = useState<any[]>([]);

    const handleFetchMatch = async () => {
        if (!targetMatchId) return alert('Lütfen Maç ID girin.');
        try {
            const { doc, getDoc, collection, getDocs, query, orderBy } = await import('firebase/firestore');
            const { db } = await import('@/firebase/client');

            // 1. Fetch Match
            const matchSnap = await getDoc(doc(db, 'matches', targetMatchId));

            if (matchSnap.exists()) {
                const matchData = matchSnap.data();
                setLoadedMatch(matchData);

                // 2. Fetch Incidents
                const incQ = query(collection(db, 'matches', targetMatchId, 'incidents'), orderBy('minute'));
                const incSnap = await getDocs(incQ);

                const incidentsWithOpinions = await Promise.all(incSnap.docs.map(async (incDoc) => {
                    const incData = incDoc.data();
                    incData.id = incDoc.id; // ensure ID

                    // 3. Fetch Opinions
                    const opQ = collection(db, 'matches', targetMatchId, 'incidents', incData.id, 'opinions');
                    const opSnap = await getDocs(opQ);
                    const opinions = opSnap.docs.map(d => ({ ...d.data(), id: d.id }));

                    return { ...incData, opinions };
                }));

                setLoadedIncidents(incidentsWithOpinions);
                alert('TÜM veriler getirildi! (Maç, Pozisyonlar ve Yorumlar) ✅');
            } else {
                alert('Maç bulunamadı! ID\'yi kontrol edin.');
                setLoadedMatch(null);
                setLoadedIncidents([]);
            }
        } catch (error) {
            console.error(error);
            alert('Veri çekerken hata oluştu.');
        }
    };

    const handleSeed = async () => {
        if (!confirm('Gaziantep FK - Galatasaray verileri yüklensin mi?')) return;
        setSeeding(true);
        try {
            const res = await fetch('/api/setup/seed', {
                method: 'POST',
                headers: { 'x-admin-key': apiKey }
            });
            const data = await res.json();
            if (res.ok) alert('Başarılı: ' + data.message);
            else alert('Hata: ' + data.error);
        } catch (e) {
            alert('Bir hata oluştu.');
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto space-y-8 min-h-screen bg-gray-100 text-gray-900">
            <h1 className="text-3xl font-bold">Yönetici Paneli</h1>

            <div className="grid md:grid-cols-2 gap-4">
                {/* Admin Key Section */}
                <div className="bg-white p-6 border rounded shadow-sm">
                    <label className="font-bold block mb-2 text-red-600">1. Admin Key (Zorunlu)</label>
                    <input
                        type="password"
                        className="border border-gray-300 p-2 w-full rounded text-gray-900"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder="ADMIN_KEY giriniz"
                    />
                </div>

                {/* Match Fetch Section */}
                <div className="bg-white p-6 border rounded shadow-sm border-blue-200">
                    <label className="font-bold block mb-2 text-blue-600">2. Maç Seç / Getir</label>
                    <div className="flex gap-2">
                        <input
                            className="border border-gray-300 p-2 w-full rounded text-gray-900"
                            value={targetMatchId}
                            onChange={e => setTargetMatchId(e.target.value)}
                            placeholder="Maç ID (week1-gfk-gs)"
                        />
                        <button onClick={handleFetchMatch} className="bg-blue-600 text-white px-4 rounded font-bold hover:bg-blue-700">
                            Getir
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-green-50 p-6 border border-green-200 rounded flex justify-between items-center mb-8">
                <div>
                    <h2 className="font-bold text-green-900">🚀 Tam Demo Kurulumu</h2>
                    <p className="text-sm text-green-700">Tüm verileri (Maç, Puan Durumu, Açıklamalar, PFDK) yükle.</p>
                </div>
                <button
                    onClick={handleSeed}
                    disabled={seeding || !apiKey}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                >
                    {seeding ? 'Yükleniyor...' : 'Örnek Veriyi Yükle'}
                </button>
            </div>



            <div className="grid md:grid-cols-2 gap-6">
                <TeamForm apiKey={apiKey} />
                <MatchForm apiKey={apiKey} preloadedMatch={loadedMatch} />
                <IncidentForm apiKey={apiKey} defaultMatchId={targetMatchId} existingIncidents={loadedIncidents} />
                <OpinionForm apiKey={apiKey} defaultMatchId={targetMatchId} existingIncidents={loadedIncidents} />
            </div>

            <div className="mt-8 pt-8 border-t border-gray-300">
                <h2 className="text-2xl font-bold mb-4 text-gray-800">Ekstra Veriler (Faz 2)</h2>
                <div className="grid md:grid-cols-3 gap-6">
                    <StandingForm apiKey={apiKey} />
                    <StatementForm apiKey={apiKey} />
                    <DisciplinaryForm apiKey={apiKey} />
                </div>
            </div>

            <div className="p-4 rounded text-center text-gray-500 text-sm">
                Formları kullanarak yeni veriler ekleyebilirsin.
            </div>
        </div>
    );
}
