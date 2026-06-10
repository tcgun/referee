"use client";

import { useState, useEffect } from 'react';
import { TeamForm, MatchForm, IncidentForm, OpinionForm, OfficialForm } from '@/components/admin/AdminForms';
import { StandingForm, StatementForm, DisciplinaryForm, DisciplinaryList, RefereeStatsForm } from '@/components/admin/ExtraForms';
import { MatchIncidentsSummary } from '@/components/admin/MatchIncidentsSummary';
import GeneratorWrapper from '@/generator-system/GeneratorWrapper';
import { Match, Incident, Opinion, DisciplinaryAction } from '@/types';
import { signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/firebase/client';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Suspense } from 'react';
import { resolveTeamId, getTeamName } from '@/lib/teams';

// Helper to format Date objects or strings in Turkish format
const formatDate = (dateVal: Date | string | null | undefined) => {
    if (!dateVal) return 'Tarih Belirtilmemiş';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    return d.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

// Parser for bulk fixture import
const parseFixtureLines = (text: string, season: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: Partial<Match>[] = [];
    const errors: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let parts = line.split(/[|]+/).map(p => p.trim());
        if (parts.length < 2) {
            parts = line.split('\t').map(p => p.trim());
        }
        if (parts.length < 2) {
            parts = line.split(/\s{2,}/).map(p => p.trim());
        }

        if (parts.length < 3) {
            errors.push(`Satır ${i + 1}: Eksik bilgi (En az "Hafta | Tarih Saat | Maç Detayı" formatında olmalı).`);
            continue;
        }

        const weekStr = parts[0];
        const dateStr = parts[1];
        
        let homeStr = '';
        let awayStr = '';
        let scoreStr = '';

        if (parts.length >= 5) {
            homeStr = parts[2];
            awayStr = parts[3];
            scoreStr = parts[4];
        } else if (parts.length === 4) {
            const lastPart = parts[3];
            const isScore = /^\d+\s*-\s*\d+$/.test(lastPart);
            if (isScore) {
                // e.g. Hafta | Tarih | Ev - Deplasman | Skor
                const teamSegment = parts[2];
                const sepRegex = /\s+(?:-|vs|v)\s+/i;
                const sepMatch = teamSegment.match(sepRegex);
                if (sepMatch) {
                    const sepIndex = sepMatch.index!;
                    homeStr = teamSegment.substring(0, sepIndex).trim();
                    awayStr = teamSegment.substring(sepIndex + sepMatch[0].length).trim();
                } else {
                    const hyphenSplit = teamSegment.split('-');
                    if (hyphenSplit.length === 2) {
                        homeStr = hyphenSplit[0].trim();
                        awayStr = hyphenSplit[1].trim();
                    } else {
                        homeStr = teamSegment;
                        awayStr = '';
                    }
                }
                scoreStr = lastPart;
            } else {
                // Standard 4-part: Hafta | Tarih | Ev | Deplasman
                homeStr = parts[2];
                awayStr = parts[3];
            }
        } else {
            // parts.length === 3
            // Hafta | Tarih | Ev [Skor / vs / -] Deplasman
            const teamSegment = parts[2];
            
            // Check for score first (e.g., "Gaziantep FK 0 - 3 Galatasaray" or "Gaziantep FK 0-3 Galatasaray")
            const scoreRegex = /\s+(\d+)\s*-\s*(\d+)\s+/;
            const scoreMatch = teamSegment.match(scoreRegex);
            if (scoreMatch) {
                const scoreIndex = scoreMatch.index!;
                homeStr = teamSegment.substring(0, scoreIndex).trim();
                awayStr = teamSegment.substring(scoreIndex + scoreMatch[0].length).trim();
                scoreStr = `${scoreMatch[1]}-${scoreMatch[2]}`;
            } else {
                // Check for vs or hyphen: e.g. "Fenerbahçe - Alanyaspor"
                const sepRegex = /\s+(?:-|vs|v)\s+/i;
                const sepMatch = teamSegment.match(sepRegex);
                if (sepMatch) {
                    const sepIndex = sepMatch.index!;
                    homeStr = teamSegment.substring(0, sepIndex).trim();
                    awayStr = teamSegment.substring(sepIndex + sepMatch[0].length).trim();
                } else {
                    // Try splitting by any single hyphen
                    const hyphenSplit = teamSegment.split('-');
                    if (hyphenSplit.length === 2) {
                        homeStr = hyphenSplit[0].trim();
                        awayStr = hyphenSplit[1].trim();
                    } else {
                        errors.push(`Satır ${i + 1}: Ev sahibi ve deplasman takımları ayrıştırılamadı. Format: "Ev Sahibi - Deplasman" veya "Ev Sahibi 2 - 1 Deplasman" olmalı.`);
                        continue;
                    }
                }
            }
        }

        // Parse week number securely (handles "1 Hafta", "Hafta 1", or "1")
        const weekMatch = weekStr.match(/\d+/);
        const weekNum = weekMatch ? parseInt(weekMatch[0]) : parseInt(weekStr);
        if (isNaN(weekNum)) {
            errors.push(`Satır ${i + 1}: Geçersiz hafta numarası: "${weekStr}"`);
            continue;
        }

        let parsedDate: Date | null = null;
        if (dateStr) {
            const dateMatch = dateStr.match(/^(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})$/);
            if (dateMatch) {
                const [, day, month, year, hour, minute] = dateMatch;
                parsedDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
            } else {
                const parsedFallback = new Date(dateStr);
                if (!isNaN(parsedFallback.getTime())) {
                    parsedDate = parsedFallback;
                }
            }
        }

        if (!parsedDate || isNaN(parsedDate.getTime())) {
            errors.push(`Satır ${i + 1}: Geçersiz tarih/saat formatı: "${dateStr}". Lütfen DD.MM.YYYY HH:mm formatını kullanın.`);
            continue;
        }

        const homeTeamId = resolveTeamId(homeStr);
        const awayTeamId = resolveTeamId(awayStr);

        if (!homeTeamId) {
            errors.push(`Satır ${i + 1}: Ev sahibi takım tanınamadı: "${homeStr}"`);
            continue;
        }
        if (!awayTeamId) {
            errors.push(`Satır ${i + 1}: Deplasman takımı tanınamadı: "${awayStr}"`);
            continue;
        }

        const homeTeamName = getTeamName(homeTeamId);
        const awayTeamName = getTeamName(awayTeamId);

        const yyyy = parsedDate.getFullYear();
        const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const dd = String(parsedDate.getDate()).padStart(2, '0');
        const matchId = `week${weekNum}-${homeTeamId}-${awayTeamId}-${yyyy}-${mm}-${dd}`;

        const matchObj: Partial<Match> = {
            id: matchId,
            week: weekNum,
            season: season,
            date: parsedDate.toISOString(),
            homeTeamId,
            awayTeamId,
            homeTeamName,
            awayTeamName,
            status: 'draft',
            competition: 'league',
            stadium: '',
            referee: '',
            varReferee: ''
        };

        if (scoreStr) {
            const cleanScore = scoreStr.trim();
            const scoreParts = cleanScore.split('-');
            if (scoreParts.length === 2) {
                const homeScore = parseInt(scoreParts[0].trim());
                const awayScore = parseInt(scoreParts[1].trim());
                if (!isNaN(homeScore) && !isNaN(awayScore)) {
                    matchObj.score = cleanScore;
                    matchObj.homeScore = homeScore;
                    matchObj.awayScore = awayScore;
                }
            }
        }

        parsed.push(matchObj);
    }

    return { parsed, errors };
};

interface BulkFixtureImportProps {
    apiKey: string;
    authToken?: string;
    season: string;
    onSuccess?: () => void;
}

function BulkFixtureImport({ apiKey, authToken, season, onSuccess }: BulkFixtureImportProps) {
    const [rawInput, setRawInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [parsedData, setParsedData] = useState<Partial<Match>[]>([]);
    const [parseErrors, setParseErrors] = useState<string[]>([]);
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        if (!rawInput.trim()) {
            setParsedData([]);
            setParseErrors([]);
            return;
        }
        const { parsed, errors } = parseFixtureLines(rawInput, season);
        setParsedData(parsed);
        setParseErrors(errors);
    }, [rawInput, season]);

    const handleSaveBulk = async () => {
        if (parsedData.length === 0) {
            alert('Lütfen en az bir geçerli maç satırı giriniz.');
            return;
        }
        if (parseErrors.length > 0) {
            if (!confirm(`Bazı satırlarda ayrıştırma hatası var. Yalnızca başarıyla ayrıştırılan ${parsedData.length} maçı kaydetmek istiyor musunuz?`)) {
                return;
            }
        }

        setLoading(true);
        setSuccessMessage('');
        try {
            const res = await fetch('/api/admin/matches/bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': apiKey,
                    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
                },
                body: JSON.stringify({ matches: parsedData })
            });

            if (res.ok) {
                const data = await res.json();
                setSuccessMessage(`${data.count || parsedData.length} maç başarıyla kaydedildi! ✅`);
                setRawInput('');
                setParsedData([]);
                setParseErrors([]);
                if (onSuccess) onSuccess();
            } else {
                let errText = 'Hata oluştu.';
                try {
                    const errJson = await res.json();
                    errText = errJson.error || errText;
                } catch {}
                alert(`Kaydetme başarısız: ${errText}`);
            }
        } catch (error) {
            console.error('[BulkFixtureImport] Save error:', error);
            alert('Ağ hatası oluştu.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-sm uppercase text-slate-700 flex items-center gap-2">
                    <span>📋</span> Toplu Maç Ekle (Fikstür)
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                    Format: <code className="bg-slate-100 px-1 py-0.5 rounded font-mono text-[11px]">Hafta | Tarih Saat | Ev Sahibi | Deplasman | Skor (Opsiyonel)</code>
                </p>
            </div>
            
            <div className="p-6 space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase block">Fikstür Satırları</label>
                    <textarea
                        rows={6}
                        value={rawInput}
                        onChange={e => setRawInput(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-xs focus:outline-none focus:border-blue-500 transition-colors font-mono"
                        placeholder={`Örnek:\n21 | 09.02.2026 17:00 | Gaziantep FK | Kasımpaşa | 1-1\n21 | 09.02.2026 20:00 | Galatasaray | Beşiktaş\n21 | 10.02.2026 19:00 | Fenerbahçe | Trabzonspor | 2-1`}
                    />
                </div>

                {successMessage && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs font-bold text-green-700">
                        {successMessage}
                    </div>
                )}

                {parseErrors.length > 0 && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 space-y-1 max-h-32 overflow-y-auto">
                        <strong className="block font-bold">⚠️ Ayrıştırma Hataları:</strong>
                        <ul className="list-disc pl-4 space-y-0.5 font-medium">
                            {parseErrors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {parsedData.length > 0 && (
                    <div className="space-y-2 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Ayrıştırılan Maçlar Önizlemesi ({parsedData.length})</h4>
                            <span className="text-[10px] text-slate-400 font-bold">Aşağıdaki maçlar eklenecek/güncellenecektir.</span>
                        </div>
                        <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 pr-2">
                            {parsedData.map((m, index) => {
                                const formattedD = m.date ? new Date(m.date).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
                                return (
                                    <div key={index} className="py-2 flex justify-between items-center text-xs">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 font-bold text-slate-800">
                                                <span>{m.homeTeamName}</span>
                                                {m.score ? (
                                                    <span className="inline-block font-black font-mono text-[10px] px-2 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                                                        {m.score.replace('-', ' - ')}
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-slate-400 font-medium px-1">vs</span>
                                                )}
                                                <span>{m.awayTeamName}</span>
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                {formattedD} • {m.week}. Hafta
                                            </span>
                                        </div>
                                        <span className="font-mono text-[9px] text-slate-400 max-w-[120px] truncate" title={m.id}>
                                            {m.id}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    onClick={handleSaveBulk}
                    disabled={loading || parsedData.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg text-xs uppercase tracking-wider transition-colors disabled:opacity-50 active:scale-[0.99]"
                >
                    {loading ? 'Kaydediliyor...' : `Toplu Maçları Kaydet (${parsedData.length})`}
                </button>
            </div>
        </div>
    );
}

// Wrapper for Disciplinary Section to share state
const DisciplinaryWrapper = ({ apiKey, authToken, season }: { apiKey: string, authToken?: string, season?: string }) => {
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
                season={season}
            />
            <DisciplinaryList
                apiKey={apiKey}
                authToken={authToken}
                onEdit={setEditingItem}
                refreshTrigger={refreshTrigger}
                season={season}
            />
        </>
    );
};

function AdminContent() {
    // Auth State
    const [user, setUser] = useState<User | null>(null);
    const [authToken, setAuthToken] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [selectedSeason, setSelectedSeason] = useState<string>('2025-2026');

    const [apiKey, setApiKey] = useState(() => {
        if (typeof window !== 'undefined') {
            const stored = sessionStorage.getItem('admin_key');
            if (stored) return stored;
            return process.env.NEXT_PUBLIC_ADMIN_KEY || '';
        }
        return '';
    });

    // Tab Persistence Logic
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    type TabType = 'setup' | 'matches' | 'incidents' | 'extras' | 'officials' | 'standings' | 'generator';
    const [activeTab, setActiveTab] = useState<TabType>('setup');

    // Sync tab with URL and LocalStorage
    useEffect(() => {
        const queryTab = searchParams.get('tab');
        const storedTab = localStorage.getItem('admin_active_tab');

        if (queryTab) {
            setActiveTab(queryTab as TabType);
            localStorage.setItem('admin_active_tab', queryTab);
        } else if (storedTab) {
            setActiveTab(storedTab as TabType);
            // Put it in URL if missing
            const params = new URLSearchParams(window.location.search);
            params.set('tab', storedTab);
            router.replace(`${pathname}?${params.toString()}`);
        }
    }, [searchParams, pathname, router]);

    const handleTabChange = (tab: string) => {
        setActiveTab(tab as TabType);
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
        } else if (process.env.NEXT_PUBLIC_ADMIN_KEY) {
            setApiKey(process.env.NEXT_PUBLIC_ADMIN_KEY);
            sessionStorage.setItem('admin_key', process.env.NEXT_PUBLIC_ADMIN_KEY);
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

    interface SetupMatch extends Match {
        hasIncidents?: boolean;
    }

    const [setupSelectedWeek, setSetupSelectedWeek] = useState<number | ''>('');
    const [setupMatches, setSetupMatches] = useState<SetupMatch[]>([]);
    const [setupLoading, setSetupLoading] = useState(false);
    const [setupRefreshTrigger, setSetupRefreshTrigger] = useState(0);

    useEffect(() => {
        const fetchSetupMatches = async () => {
            if (!setupSelectedWeek) {
                setSetupMatches([]);
                return;
            }
            setSetupLoading(true);
            try {
                const { collection, getDocs, query, where, orderBy, limit } = await import('firebase/firestore');
                const { db } = await import('@/firebase/client');
                const q = query(
                    collection(db, 'matches'),
                    where('week', '==', Number(setupSelectedWeek)),
                    orderBy('date', 'desc')
                );
                const snap = await getDocs(q);
                let fetched = snap.docs.map(d => ({ ...d.data(), id: d.id } as Match));
                if (selectedSeason) {
                    fetched = fetched.filter(m => (m.season || '2025-2026') === selectedSeason);
                }

                // Check incidents for each match in parallel
                const fetchedWithStatus = await Promise.all(
                    fetched.map(async (m) => {
                        try {
                            const incQ = query(collection(db, 'matches', m.id, 'incidents'), limit(1));
                            const incSnap = await getDocs(incQ);
                            return {
                                ...m,
                                hasIncidents: !incSnap.empty
                            };
                        } catch (err) {
                            console.error(`Error checking incidents for match ${m.id}`, err);
                            return { ...m, hasIncidents: false };
                        }
                    })
                );

                setSetupMatches(fetchedWithStatus);
            } catch (e) {
                console.error("Setup matches fetch error", e);
            } finally {
                setSetupLoading(false);
            }
        };
        fetchSetupMatches();
    }, [setupSelectedWeek, selectedSeason, setupRefreshTrigger]);

    // Restore match selection on load
    useEffect(() => {
        const stored = localStorage.getItem('last_admin_match_id');
        if (stored) {
            setTargetMatchId(stored);
        }
    }, []);

    // Automatically fetch data when targetMatchId changes
    useEffect(() => {
        if (targetMatchId) {
            localStorage.setItem('last_admin_match_id', targetMatchId);
            fetchMatchById(targetMatchId, true);
        } else {
            setLoadedMatch(null);
            setLoadedIncidents([]);
        }
    }, [targetMatchId]);

    const fetchMatchById = async (id: string, silent = false) => {
        if (!id) return;
        try {
            const { doc, getDoc, collection, getDocs } = await import('firebase/firestore');
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
                        {/* Global Sezon Seçici */}
                        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 gap-0.5 mr-2">
                            {['2025-2026', '2026-2027'].map((season) => (
                                <button
                                    key={season}
                                    type="button"
                                    onClick={() => setSelectedSeason(season)}
                                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${selectedSeason === season
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-white'
                                        }`}
                                >
                                    {season}
                                </button>
                            ))}
                        </div>

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
                        <div className="shrink-0">
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
                        { id: 'matches', label: 'Maç Ekle ve Düzenle' },
                        { id: 'incidents', label: 'Pozisyon & Yorum' },
                        { id: 'officials', label: 'Hakem Gözlemci Temsilci' },
                        { id: 'extras', label: 'PFDK' },
                        { id: 'standings', label: 'Puan Durumu' },
                        { id: 'generator', label: 'Görsel Hazırla' }
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
                        <div className="space-y-8 animate-in fade-in duration-300">
                            {/* Full-width Aktif Maç Yönetimi */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                                    <div>
                                        <h3 className="font-bold text-sm uppercase text-slate-700">Aktif Maç Yönetimi</h3>
                                        <p className="text-xs text-slate-500 mt-1">Düzenlemek veya detaylarını görmek istediğiniz maçı seçin.</p>
                                    </div>
                                    {loadedMatch && (
                                        <div className="flex items-center gap-3">
                                            <div className="px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                                                <div className="w-4 h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold text-[10px]">✓</div>
                                                <span className="text-[10px] text-green-700 font-black uppercase tracking-wider">Aktif: {loadedMatch.homeTeamName} - {loadedMatch.awayTeamName}</span>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleTabChange('matches')}
                                                className="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm transition-all active:scale-[0.98] flex items-center gap-1"
                                            >
                                                <span>✍️ Maçı Düzenle</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="p-6 space-y-6">
                                    {/* Week Selector Grid */}
                                    <div className="flex flex-col items-center space-y-3 pb-6 border-b border-slate-200/60 max-w-4xl mx-auto">
                                        {/* Title: « 28.Hafta » */}
                                        <div className="flex items-center gap-3">
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    const current = Number(setupSelectedWeek || 1);
                                                    setSetupSelectedWeek(current > 1 ? current - 1 : 34);
                                                }}
                                                className="text-slate-800 hover:text-slate-900 font-black text-xl px-2 transition-colors bg-transparent border-0 cursor-pointer"
                                            >
                                                &laquo;
                                            </button>
                                            <span className="text-slate-900 font-extrabold text-sm uppercase tracking-wider">
                                                {setupSelectedWeek ? `${setupSelectedWeek}.HAFTA` : 'Hafta Seçilmedi'}
                                            </span>
                                            <button 
                                                type="button"
                                                onClick={() => {
                                                    const current = Number(setupSelectedWeek || 1);
                                                    setSetupSelectedWeek(current < 34 ? current + 1 : 1);
                                                }}
                                                className="text-slate-800 hover:text-slate-900 font-black text-xl px-2 transition-colors bg-transparent border-0 cursor-pointer"
                                            >
                                                &raquo;
                                            </button>
                                        </div>

                                        {/* Table Grid */}
                                        <div className="w-full overflow-x-auto">
                                            <table className="min-w-full text-center border-collapse border border-slate-200 text-xs font-bold text-slate-700">
                                                <tbody>
                                                    <tr className="border-b border-slate-200">
                                                        <td className="bg-slate-50 font-bold text-slate-800 px-3 py-2 border-r border-slate-200 whitespace-nowrap text-left w-20">1. Devre</td>
                                                        {Array.from({ length: 17 }, (_, i) => i + 1).map(week => (
                                                            <td 
                                                                key={week} 
                                                                onClick={() => setSetupSelectedWeek(week)}
                                                                className={`cursor-pointer border-r border-slate-200 hover:bg-slate-100 transition-colors font-bold px-2 py-2 min-w-[32px] ${
                                                                    setupSelectedWeek === week 
                                                                        ? 'bg-slate-700 text-white hover:bg-slate-800' 
                                                                        : 'bg-white text-slate-700 hover:bg-slate-50'
                                                                }`}
                                                            >
                                                                {week}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                    <tr>
                                                        <td className="bg-slate-50 font-bold text-slate-800 px-3 py-2 border-r border-slate-200 whitespace-nowrap text-left w-20">2. Devre</td>
                                                        {Array.from({ length: 17 }, (_, i) => i + 18).map(week => (
                                                            <td 
                                                                key={week} 
                                                                onClick={() => setSetupSelectedWeek(week)}
                                                                className={`cursor-pointer border-r border-slate-200 hover:bg-slate-100 transition-colors font-bold px-2 py-2 min-w-[32px] ${
                                                                    setupSelectedWeek === week 
                                                                        ? 'bg-slate-700 text-white hover:bg-slate-800' 
                                                                        : 'bg-white text-slate-700 hover:bg-slate-50'
                                                                }`}
                                                            >
                                                                {week}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Match Table Grid */}
                                    {setupSelectedWeek ? (
                                        <div className="w-full">
                                            {setupLoading ? (
                                                <div className="text-center py-12 text-sm text-slate-500 font-bold flex items-center justify-center gap-2">
                                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                                                    Yükleniyor...
                                                </div>
                                            ) : setupMatches.length === 0 ? (
                                                <div className="text-center py-12 text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-slate-200">
                                                    Bu haftaya ait maç kaydı bulunamadı. Aşağıdaki formdan toplu olarak ekleyebilirsiniz.
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full text-xs font-semibold text-slate-800 border-collapse">
                                                        <tbody>
                                                            {setupMatches.map((m) => {
                                                                const isLoaded = loadedMatch?.id === m.id;
                                                                
                                                                // Match has complete stats if stats object exists and has at least 10 parameters entered
                                                                const hasStats = !!(m.stats && typeof m.stats === 'object' && Object.keys(m.stats).length >= 10);
                                                                
                                                                // Match has complete officials if there are at least 4 referees (Main, Asst1, Asst2, 4th)
                                                                const hasOfficials = !!(m.officials?.referees && m.officials.referees.filter(r => r && r.trim()).length >= 4);

                                                                console.log(`[SETUP MATCH ROW] ID: ${m.id} | hasIncidents: ${m.hasIncidents} | hasStats: ${hasStats} (${m.stats ? Object.keys(m.stats).length : 0} fields) | hasOfficials: ${hasOfficials}`);

                                                                return (
                                                                    <tr 
                                                                        key={m.id}
                                                                        onClick={() => setTargetMatchId(m.id)}
                                                                        className={`group border-b border-slate-200 cursor-pointer hover:bg-slate-50/80 transition-all ${
                                                                            isLoaded 
                                                                                ? 'bg-blue-50/40 border-l-4 border-l-blue-600' 
                                                                                : !m.hasIncidents 
                                                                                    ? 'opacity-70 bg-slate-50/40' 
                                                                                    : 'bg-white'
                                                                        }`}
                                                                    >
                                                                        {/* 1. Date/Time Column */}
                                                                        <td className="px-4 py-3.5 text-left w-44">
                                                                            <div className="font-bold text-slate-900 whitespace-nowrap">
                                                                                {formatDate(m.date)}
                                                                            </div>
                                                                            <div className="font-mono text-[9px] text-slate-400 mt-1 select-all hover:text-slate-600 transition-colors" title="Maç Kayıt ID'si">
                                                                                {m.id}
                                                                            </div>
                                                                        </td>

                                                                        {/* 2. Home Team Name */}
                                                                        <td className="px-4 py-3.5 text-right font-extrabold text-slate-800 text-sm max-w-[220px] truncate">
                                                                            {m.homeTeamName}
                                                                        </td>

                                                                        {/* 3. Score Center Column */}
                                                                        <td className="px-2 py-3.5 text-center w-20">
                                                                            <span className={`inline-block font-black font-mono text-xs px-2.5 py-1 rounded-md border text-center min-w-[44px] ${
                                                                                isLoaded 
                                                                                    ? 'bg-blue-100 text-blue-800 border-blue-200' 
                                                                                    : 'bg-slate-100 text-slate-800 border-slate-200'
                                                                            }`}>
                                                                                {m.score ? m.score.replace('-', ' - ') : 'vs'}
                                                                            </span>
                                                                        </td>

                                                                        {/* 4. Away Team Name */}
                                                                        <td className="px-4 py-3.5 text-left font-extrabold text-slate-800 text-sm max-w-[220px] truncate">
                                                                            {m.awayTeamName}
                                                                        </td>

                                                                        <td className="px-4 py-3.5 text-right w-80 whitespace-nowrap">
                                                                            <div className="flex flex-col items-end gap-1">
                                                                                <div className="flex items-center gap-2 justify-end min-h-[22px]">
                                                                                    {isLoaded ? (
                                                                                        <div className="flex items-center gap-2">
                                                                                            <span className="text-[9px] font-black text-blue-700 bg-blue-100 px-2.5 py-1 rounded-md uppercase tracking-wider border border-blue-200">
                                                                                                DÜZENLENİYOR
                                                                                            </span>
                                                                                            <button
                                                                                                type="button"
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation();
                                                                                                    handleTabChange('matches');
                                                                                                }}
                                                                                                className="bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md transition-colors shadow-sm"
                                                                                            >
                                                                                                ✍️ Düzenle
                                                                                            </button>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-600 transition-colors">
                                                                                            Seçmek için Tıklayın &raquo;
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                                
                                                                                {/* Warnings listed inside Details cell */}
                                                                                <div className="flex flex-wrap gap-1.5 justify-end mt-1.5">
                                                                                    {!m.hasIncidents && (
                                                                                        <span className="text-[9px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-0.5 border border-slate-200">
                                                                                            ⚠️ Pozisyon Girilmedi
                                                                                        </span>
                                                                                    )}
                                                                                    {!hasStats && (
                                                                                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/50 flex items-center gap-0.5">
                                                                                            ⚠️ İstatistik Girilmedi
                                                                                        </span>
                                                                                    )}
                                                                                    {!hasOfficials && (
                                                                                        <span className="text-[9px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200/50 flex items-center gap-0.5">
                                                                                            ⚠️ Görevliler Girilmedi
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </div>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-xs text-slate-400 italic bg-slate-50 rounded-lg border border-slate-200">
                                            Lütfen yukarıdaki grid tablosundan bir hafta seçin.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Secondary Row: Forms */}
                            <div className="grid md:grid-cols-2 gap-8">
                                <BulkFixtureImport 
                                    apiKey={apiKey} 
                                    authToken={authToken} 
                                    season={selectedSeason} 
                                    onSuccess={() => {
                                        setSetupRefreshTrigger(prev => prev + 1);
                                    }}
                                />
                                <TeamForm apiKey={apiKey} authToken={authToken} />
                            </div>
                        </div>
                    )}

                    {/* TAKIM & MAÇ TAB */}
                    {activeTab === 'matches' && (
                        <div className="space-y-8">
                            <MatchForm 
                                key={`${loadedMatch?.id || 'new'}-${selectedSeason}`} 
                                apiKey={apiKey} 
                                authToken={authToken} 
                                preloadedMatch={loadedMatch} 
                                season={selectedSeason} 
                                onSuccess={(savedMatchId, week) => {
                                    setSetupRefreshTrigger(prev => prev + 1);
                                    setTargetMatchId(savedMatchId);
                                    setSetupSelectedWeek(week);
                                    handleTabChange('setup');
                                }}
                            />
                        </div>
                    )}

                    {/* INCIDENTS TAB */}
                    {activeTab === 'incidents' && (
                        <div className="space-y-8">
                            <div className="grid md:grid-cols-2 gap-8">
                                <IncidentForm apiKey={apiKey} authToken={authToken} defaultMatchId={targetMatchId} onMatchChange={setTargetMatchId} existingIncidents={loadedIncidents} onSuccess={() => fetchMatchById(targetMatchId, true)} season={selectedSeason} />
                                <OpinionForm apiKey={apiKey} authToken={authToken} defaultMatchId={targetMatchId} onMatchChange={setTargetMatchId} existingIncidents={loadedIncidents} onSuccess={() => fetchMatchById(targetMatchId, true)} season={selectedSeason} />
                            </div>
                            <MatchIncidentsSummary incidents={loadedIncidents} />
                        </div>
                    )}

                    {/* EXTRAS (PFDK) TAB */}
                    {activeTab === 'extras' && (
                        <div className="grid md:grid-cols-2 gap-6">
                            <StatementForm apiKey={apiKey} authToken={authToken} season={selectedSeason} />
                            <DisciplinaryWrapper apiKey={apiKey} authToken={authToken} season={selectedSeason} />
                        </div>
                    )}

                    {/* OFFICIALS TAB */}
                    {activeTab === 'officials' && (
                        <div className="space-y-8">
                            <OfficialForm apiKey={apiKey} authToken={authToken} season={selectedSeason} />
                            <div className="grid md:grid-cols-1 gap-6">
                                <RefereeStatsForm apiKey={apiKey} authToken={authToken} season={selectedSeason} />
                            </div>
                        </div>
                    )}

                    {/* STANDINGS TAB */}
                    {activeTab === 'standings' && (
                        <div className="max-w-4xl mx-auto">
                            <StandingForm apiKey={apiKey} authToken={authToken} season={selectedSeason} />
                        </div>
                    )}

                    {/* GENERATOR TAB */}
                    {activeTab === 'generator' && (
                        <div className="h-[900px]">
                            <GeneratorWrapper 
                                activeMatch={loadedMatch} 
                                activeIncidents={loadedIncidents} 
                            />
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
