"use client";

import { useState, useEffect } from 'react';
import { TeamForm, MatchForm, IncidentForm, OpinionForm, OfficialForm } from '@/components/admin/AdminForms';
import { StandingForm, StatementForm, DisciplinaryForm, DisciplinaryList, RefereeStatsForm, MatchSelect } from '@/components/admin/ExtraForms';
import { Match, Incident, Opinion, DisciplinaryAction } from '@/types';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/firebase/client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Suspense } from 'react';

// Wrapper for Disciplinary Section to share state
const DisciplinaryWrapper = ({ apiKey, authToken }: { apiKey: string, authToken?: string }) => {
    const [editingItem, setEditingItem] = useState<DisciplinaryAction | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    return (
        <>
            <DisciplinaryForm
                apiKey={apiKey}
                authToken={authToken}
                editItem={editingItem}
                onCancelEdit={() => setEditingItem(null)}
                onSuccess={() => setRefreshTrigger(prev => prev + 1)}
            />
            <DisciplinaryList
                apiKey={apiKey}
                authToken={authToken}
                onEdit={setEditingItem}
                refreshTrigger={refreshTrigger}
            />
        </>
    );
};

function AdminContent() {
    // Auth State
    const [user, setUser] = useState<User | null>(null);
    const [authToken, setAuthToken] = useState<string>('');
    const [loading, setLoading] = useState(true);

    const [apiKey, setApiKey] = useState('');

    // Tab Persistence Logic
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [activeTab, setActiveTab] = useState<'setup' | 'matches' | 'incidents' | 'extras' | 'officials' | 'standings'>('setup');

    // Sync tab with URL and LocalStorage
    useEffect(() => {
        const queryTab = searchParams.get('tab');
        const storedTab = localStorage.getItem('admin_active_tab');

        if (queryTab) {
            setActiveTab(queryTab as any);
            localStorage.setItem('admin_active_tab', queryTab);
        } else if (storedTab) {
            setActiveTab(storedTab as any);
            // Put it in URL if missing
            const params = new URLSearchParams(window.location.search);
            params.set('tab', storedTab);
            router.replace(`${pathname}?${params.toString()}`);
        }
    }, [searchParams, pathname, router]);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab as any);
        localStorage.setItem('admin_active_tab', tab);
        const params = new URLSearchParams(searchParams.toString());
        params.set('tab', tab);
        router.replace(`${pathname}?${params.toString()}`);
    };

    // Load admin key and check auth
    useEffect(() => {
        const storedKey = sessionStorage.getItem('admin_key');
        if (storedKey) {
            setApiKey(storedKey);
        }

        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                const token = await u.getIdToken();
                setAuthToken(token);
            } else {
                setAuthToken('');
                router.push('/admin-secret-panel/login');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [router]);

    const handleApiKeyChange = (newKey: string) => {
        setApiKey(newKey);
        if (newKey) {
            sessionStorage.setItem('admin_key', newKey);
        } else {
            sessionStorage.removeItem('admin_key');
        }
    };

    // Central Data Management
    const [targetMatchId, setTargetMatchId] = useState('');
    const [loadedMatch, setLoadedMatch] = useState<Match | null>(null);
    const [loadedIncidents, setLoadedIncidents] = useState<Array<Incident & { opinions: Opinion[] }>>([]);

    // Restore match selection on load
    useEffect(() => {
        const stored = localStorage.getItem('last_admin_match_id');
        if (stored) {
            setTargetMatchId(stored);
            fetchMatchById(stored);
        }
    }, []);

    const fetchMatchById = async (id: string, silent = false) => {
        if (!id) return;
        try {
            const { doc, getDoc, collection, getDocs, query, orderBy } = await import('firebase/firestore');
            const { db } = await import('@/firebase/client');

            const matchSnap = await getDoc(doc(db, 'matches', id));

            if (matchSnap.exists()) {
                const matchData = matchSnap.data() as Match;
                setLoadedMatch(matchData);

                const incQ = collection(db, 'matches', id, 'incidents');
                const incSnap = await getDocs(incQ);

                const incidentsWithOpinions = await Promise.all(incSnap.docs.map(async (incDoc) => {
                    const incData = incDoc.data() as Incident;
                    incData.id = incDoc.id;
                    const opQ = collection(db, 'matches', id, 'incidents', incData.id, 'opinions');
                    const opSnap = await getDocs(opQ);
                    const opinions = opSnap.docs.map(d => ({ ...d.data(), id: d.id })) as Opinion[];
                    return { ...incData, opinions };
                }));

                // Sort by minute (handling strings/numbers)
                incidentsWithOpinions.sort((a, b) => {
                    const parse = (m: string | number) => {
                        if (typeof m === 'number') return m;
                        // Handle "45+2" format
                        if (typeof m === 'string' && m.includes('+')) {
                            const [base, ext] = m.split('+').map(Number);
                            return base + (ext / 100);
                        }
                        return parseFloat(m) || 0;
                    };
                    return parse(a.minute) - parse(b.minute);
                });

                setLoadedIncidents(incidentsWithOpinions);
                if (!silent) alert('Veriler Güncellendi! ✅');
            } else {
                if (!silent) alert('Maç bulunamadı!');
            }
        } catch (error) {
            console.error('[AdminPage] Fetch error:', error);
            if (!silent) alert('Hata oluştu.');
        }
    };

    const handleFetchMatch = () => {
        localStorage.setItem('last_admin_match_id', targetMatchId);
        fetchMatchById(targetMatchId);
    };



    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/admin-secret-panel/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
            {/* Header */}
            <div className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <h1 className="text-lg font-black tracking-wider uppercase flex items-center gap-2">
                        <span className="text-blue-500">◆</span> Yönetici Paneli
                    </h1>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
                            <span className="text-[10px] font-bold text-slate-300 truncate max-w-[120px]">{user.email}</span>
                        </div>

                        <input
                            type="password"
                            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-32 transition-colors"
                            value={apiKey}
                            onChange={e => handleApiKeyChange(e.target.value)}
                            placeholder="SECRET_KEY..."
                            autoComplete="off"
                        />

                        <button
                            onClick={handleLogout}
                            className="bg-red-500/10 hover:bg-red-500/20 text-red-500 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border border-red-500/20"
                        >
                            ÇIKIŞ
                        </button>
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
                                <strong>Güvenlik Uyarısı:</strong> Firebase Auth aktif edildi. Statik key hala API istekleri için gereklidir.
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
                        { id: 'matches', label: 'Maç Ekle' },
                        { id: 'incidents', label: 'Pozisyon & Yorum' },
                        { id: 'officials', label: 'Hakemler' },
                        { id: 'extras', label: 'PFDK' },
                        { id: 'standings', label: 'Puan Durumu' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
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

                    {/* KURULUM & VERİ TAB */}
                    {activeTab === 'setup' && (
                        <div className="space-y-8">
                            <div className="grid md:grid-cols-2 gap-8">
                                {/* Match Fetcher Card */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
                                    <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                                        <h3 className="font-bold text-sm uppercase text-slate-700">Aktif Maç Yönetimi</h3>
                                        <p className="text-xs text-slate-500 mt-1">Düzenlemek istediğiniz maçı seçin.</p>
                                    </div>
                                    <div className="p-6">
                                        <div className="flex gap-3">
                                            <div className="flex-1">
                                                <MatchSelect value={targetMatchId} onChange={setTargetMatchId} />
                                            </div>
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
                                <TeamForm apiKey={apiKey} authToken={authToken} />
                            </div>
                        </div>
                    )}

                    {/* TAKIM & MAÇ TAB */}
                    {activeTab === 'matches' && (
                        <div className="space-y-8">
                            <MatchForm apiKey={apiKey} authToken={authToken} preloadedMatch={loadedMatch} />
                        </div>
                    )}

                    {/* INCIDENTS TAB */}
                    {activeTab === 'incidents' && (
                        <div className="grid md:grid-cols-2 gap-8">
                            <IncidentForm apiKey={apiKey} authToken={authToken} defaultMatchId={targetMatchId} existingIncidents={loadedIncidents} onSuccess={() => fetchMatchById(targetMatchId, true)} />
                            <OpinionForm apiKey={apiKey} authToken={authToken} defaultMatchId={targetMatchId} existingIncidents={loadedIncidents} onSuccess={() => fetchMatchById(targetMatchId, true)} />
                        </div>
                    )}

                    {/* EXTRAS (PFDK) TAB */}
                    {activeTab === 'extras' && (
                        <div className="grid md:grid-cols-2 gap-6">
                            <StatementForm apiKey={apiKey} authToken={authToken} />
                            <DisciplinaryWrapper apiKey={apiKey} authToken={authToken} />
                        </div>
                    )}

                    {/* OFFICIALS TAB */}
                    {activeTab === 'officials' && (
                        <div className="space-y-8">
                            <OfficialForm apiKey={apiKey} authToken={authToken} />
                            <div className="grid md:grid-cols-1 gap-6">
                                <RefereeStatsForm apiKey={apiKey} authToken={authToken} />
                            </div>
                        </div>
                    )}

                    {/* STANDINGS TAB */}
                    {activeTab === 'standings' && (
                        <div className="max-w-4xl mx-auto">
                            <StandingForm apiKey={apiKey} authToken={authToken} />
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}

export default function AdminPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        }>
            <AdminContent />
        </Suspense>
    );
}
