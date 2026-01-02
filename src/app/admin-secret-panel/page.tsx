"use client";

import { useState, useEffect } from 'react';
import { TeamForm, MatchForm, IncidentForm, OpinionForm } from '@/components/admin/AdminForms';
import { StandingForm, StatementForm, DisciplinaryForm, DisciplinaryList, RefereeStatsForm } from '@/components/admin/ExtraForms';
import { Match, Incident, Opinion, DisciplinaryAction } from '@/types';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/firebase/client';

// Wrapper for Disciplinary Section to share state
const DisciplinaryWrapper = ({ apiKey }: { apiKey: string }) => {
    const [editingItem, setEditingItem] = useState<DisciplinaryAction | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    return (
        <>
            <DisciplinaryForm
                apiKey={apiKey}
                editItem={editingItem}
                onCancelEdit={() => setEditingItem(null)}
                onSuccess={() => setRefreshTrigger(prev => prev + 1)}
            />
            <DisciplinaryList
                apiKey={apiKey}
                onEdit={setEditingItem}
                refreshTrigger={refreshTrigger}
            />
        </>
    );
};

export default function AdminPage() {
    // Auth State (Disabled per user request)
    // const [user, setUser] = useState<User | null>(null);
    // const [authToken, setAuthToken] = useState<string>('');

    // Use sessionStorage instead of component state for admin key
    // This ensures the key is cleared when the browser tab is closed
    const [apiKey, setApiKey] = useState('');
    const [seeding, setSeeding] = useState(false);
    const [activeTab, setActiveTab] = useState<'setup' | 'matches' | 'incidents' | 'extras'>('setup');

    // Load admin key from sessionStorage on mount
    useEffect(() => {
        const storedKey = sessionStorage.getItem('admin_key');
        if (storedKey) {
            setApiKey(storedKey);
        }
        // Auth listener removed
    }, []);

    // Refresh token periodically (simplified: just rely on initial fetch or forced refresh if needed, usually onAuthStateChanged handles updates)

    /* 
    const handleLogin = async () => { ... }
    const handleLogout = async () => { ... }
    */

    // Save admin key to sessionStorage when it changes
    const handleApiKeyChange = (newKey: string) => {
        setApiKey(newKey);
        if (newKey) {
            sessionStorage.setItem('admin_key', newKey);
        } else {
            sessionStorage.removeItem('admin_key');
        }
    };

    // Clear admin key when component unmounts (tab closed)
    useEffect(() => {
        return () => {
            // Note: sessionStorage automatically clears when tab closes, but we can also clear on unmount
            // sessionStorage.removeItem('admin_key');
        };
    }, []);

    // Central Data Management
    const [targetMatchId, setTargetMatchId] = useState('week1-gfk-gs');
    const [loadedMatch, setLoadedMatch] = useState<Match | null>(null);
    const [loadedIncidents, setLoadedIncidents] = useState<Array<Incident & { opinions: Opinion[] }>>([]);

    // Persist Match ID and auto-fetch 
    useEffect(() => {
        const stored = localStorage.getItem('last_admin_match_id');
        if (stored) {
            setTargetMatchId(stored);
        }
    }, []);

    // Effect to auto-fetch only if user explicitly requested OR on mount if we had a stored value?
    // Actually simpler: just load value. User still clicks fetch.
    // BUT user asked for "yenilediğimde maç verilerini getire tekrar basmam gerekiyor". So we should auto-fetch.

    // Let's create a dedicated fetch wrapper that handles the ID
    const fetchMatchById = async (id: string, silent = false) => {
        if (!id) return;
        try {
            const { doc, getDoc, collection, getDocs, query, orderBy } = await import('firebase/firestore');
            const { db } = await import('@/firebase/client');

            const matchSnap = await getDoc(doc(db, 'matches', id));

            if (matchSnap.exists()) {
                const matchData = matchSnap.data() as Match;
                setLoadedMatch(matchData);

                const incQ = query(collection(db, 'matches', id, 'incidents'), orderBy('minute'));
                const incSnap = await getDocs(incQ);

                const incidentsWithOpinions = await Promise.all(incSnap.docs.map(async (incDoc) => {
                    const incData = incDoc.data() as Incident;
                    incData.id = incDoc.id;
                    const opQ = collection(db, 'matches', id, 'incidents', incData.id, 'opinions');
                    const opSnap = await getDocs(opQ);
                    const opinions = opSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Opinion[];
                    return { ...incData, opinions };
                }));

                setLoadedIncidents(incidentsWithOpinions);
                if (!silent) alert('Veriler Güncellendi! ✅');
            } else {
                if (!silent) alert('Maç bulunamadı!');
            }
        } catch (error) {
            console.error(error);
            if (!silent) alert('Hata oluştu.');
        }
    };

    // Auto-load effect
    useEffect(() => {
        const stored = localStorage.getItem('last_admin_match_id');
        if (stored) {
            setTargetMatchId(stored);
            // We can't safely call fetchMatchById here because it might run before state update or dependency issues.
            // Better to just call it with 'stored' immediately.
            fetchMatchById(stored, true);
        }
    }, []);

    const handleFetchMatch = () => {
        localStorage.setItem('last_admin_match_id', targetMatchId);
        fetchMatchById(targetMatchId);
    };

    const handleSeed = async () => {
        if (!confirm('Gaziantep FK - Galatasaray verileri yüklensin mi?')) return;
        setSeeding(true);
        try {
            const res = await fetch('/api/setup/seed', {
                method: 'POST',
                headers: {
                    'x-admin-key': apiKey,
                }
            });
            const data = await res.json();
            if (res.ok) alert('Başarılı: ' + data.message);
            else alert('Hata: ' + data.error);
        } catch (e) {
            console.error(e); // Fixed: was catch(e) but used alert('Bir hata oluştu')
            alert('Bir hata oluştu.');
        } finally {
            setSeeding(false);
        }
    };

    // if (!user) { ... } // Removed login wall

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
            {/* Header */}
            <div className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <h1 className="text-lg font-black tracking-wider uppercase flex items-center gap-2">
                        <span className="text-blue-500">◆</span> Yönetici Paneli
                    </h1>
                    <div className="flex items-center gap-4">
                        {/* User Info removed */}

                        <input
                            type="password"
                            className="bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-32 transition-colors"
                            value={apiKey}
                            onChange={e => handleApiKeyChange(e.target.value)}
                            placeholder="SECRET_KEY..."
                            autoComplete="off"
                        />
                        <div className={`w-2 h-2 rounded-full ${apiKey ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-slate-700'}`}></div>
                    </div>
                </div>
            </div>

            {/* Security Warning */}
            <div className="max-w-6xl mx-auto px-6 pt-4">
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-amber-700">
                                <strong>Güvenlik Uyarısı:</strong> Admin key browser'da saklanıyor. Bu sayfayı sadece güvenli bir cihazda kullanın.
                                Sekme kapatıldığında admin key otomatik olarak silinir.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-6 py-8">

                {/* Tabs */}
                <div className="flex gap-2 mb-8 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm w-fit mx-auto">
                    {[
                        { id: 'setup', label: 'Kurulum & Veri' },
                        { id: 'matches', label: 'Takım & Maç' },
                        { id: 'incidents', label: 'Pozisyon & Yorum' },
                        { id: 'extras', label: 'Puan & PFDK' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeTab === tab.id
                                ? 'bg-slate-900 text-white shadow-md transform scale-105'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* SETUP TAB */}
                    {activeTab === 'setup' && (
                        <div className="max-w-xl mx-auto space-y-6">
                            {/* Match Fetcher Card */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                    <h3 className="font-bold text-sm uppercase text-slate-700">Aktif Maç Yönetimi</h3>
                                    <p className="text-xs text-slate-500 mt-1">Düzenlemek istediğiniz maçı seçin.</p>
                                </div>
                                <div className="p-6">
                                    <div className="flex gap-3">
                                        <input
                                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                                            value={targetMatchId}
                                            onChange={e => setTargetMatchId(e.target.value)}
                                            placeholder="Maç ID (örn: week1-gfk-gs)"
                                        />
                                        <button onClick={handleFetchMatch} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 transition-all active:scale-95 shadow-sm hover:shadow">
                                            Getir
                                        </button>
                                    </div>
                                    {loadedMatch && (
                                        <div className="mt-4 p-3 bg-green-50 border border-green-100 rounded-lg flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">✓</div>
                                            <div>
                                                <p className="text-xs font-bold text-green-800">Maç Yüklendi</p>
                                                <p className="text-[10px] text-green-600 font-mono">{loadedMatch.homeTeamName} vs {loadedMatch.awayTeamName}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Seeder Card */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-sm uppercase text-slate-700">Demo Veri</h3>
                                        <p className="text-xs text-slate-500 mt-1">Sistemi test verileriyle doldur.</p>
                                    </div>
                                    <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-1 rounded uppercase">Dikkat</span>
                                </div>
                                <div className="p-6 text-center">
                                    <button
                                        onClick={handleSeed}
                                        disabled={seeding || !apiKey}
                                        className="w-full bg-slate-900 text-white px-6 py-3 rounded-lg text-sm font-bold hover:bg-slate-800 disabled:opacity-50 transition-all shadow-sm"
                                    >
                                        {seeding ? 'Yükleniyor...' : 'Örnek Maç Verisini Yükle'}
                                    </button>
                                    <p className="text-[10px] text-slate-400 mt-3">Gaziantep FK - Galatasaray maçı verilerini sıfırlar ve yeniden yükler.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* MATCHES TAB */}
                    {activeTab === 'matches' && (
                        <div className="grid md:grid-cols-2 gap-8">
                            <TeamForm apiKey={apiKey} />
                            <MatchForm apiKey={apiKey} preloadedMatch={loadedMatch} />
                        </div>
                    )}

                    {/* INCIDENTS TAB */}
                    {activeTab === 'incidents' && (
                        <div className="grid md:grid-cols-2 gap-8">
                            <IncidentForm apiKey={apiKey} defaultMatchId={targetMatchId} existingIncidents={loadedIncidents} onSuccess={() => fetchMatchById(targetMatchId, true)} />
                            <OpinionForm apiKey={apiKey} defaultMatchId={targetMatchId} existingIncidents={loadedIncidents} onSuccess={() => fetchMatchById(targetMatchId, true)} />
                        </div>
                    )}

                    {/* EXTRAS TAB */}
                    {activeTab === 'extras' && (
                        <div className="grid md:grid-cols-2 gap-6">
                            <StandingForm apiKey={apiKey} />
                            <StatementForm apiKey={apiKey} />
                            <DisciplinaryWrapper apiKey={apiKey} />
                            <RefereeStatsForm apiKey={apiKey} />
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

// Styling note: The sub-forms (TeamForm, etc.) are imported from separate components.
// We are trusting they will inherit the global tailwind styles nicely, or we might need to visit them if they have hardcoded ugly styles.
// For now, looking at previous context, they seemed basic. We'll assume they are acceptable or will be updated if requested specifically.
