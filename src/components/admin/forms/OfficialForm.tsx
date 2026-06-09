"use client";

import { useState, useEffect, useCallback } from 'react';
import { Official, OfficialRole, Match } from '@/types';
import { Shield, Check } from 'lucide-react';
import { MatchHistory } from '@/components/admin/officials/MatchHistory';
import { OfficialList } from '@/components/admin/officials/OfficialList';

interface OfficialFormProps {
    apiKey: string;
    authToken?: string;
    season?: string;
}

const ROLES: { id: OfficialRole; label: string; color: string }[] = [
    { id: 'referee', label: 'Orta Hakem', color: 'bg-blue-100 text-blue-700' },
    { id: 'assistant', label: 'Yardımcı', color: 'bg-green-100 text-green-700' },
    { id: 'fourth', label: '4. Hakem', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'var', label: 'VAR', color: 'bg-purple-100 text-purple-700' },
    { id: 'avar', label: 'AVAR', color: 'bg-pink-100 text-pink-700' },
    { id: 'observer', label: 'Gözlemci', color: 'bg-slate-100 text-slate-700' },
    { id: 'representative', label: 'Temsilci', color: 'bg-orange-100 text-orange-700' },
];

const FORM_ROLES: { id: OfficialRole; label: string; color: string }[] = [
    { id: 'referee', label: 'Orta Hakem', color: 'bg-blue-100 text-blue-700' },
    { id: 'assistant', label: 'Yardımcı', color: 'bg-green-100 text-green-700' },
    { id: 'fourth', label: '4. Hakem', color: 'bg-yellow-100 text-yellow-700' },
    { id: 'var', label: 'VAR', color: 'bg-purple-100 text-purple-700' },
    { id: 'avar', label: 'AVAR', color: 'bg-pink-100 text-pink-700' },
];

const CITIES = [
    'ADANA', 'ADIYAMAN', 'AFYONKARAHİSAR', 'AFYON', 'AĞRI', 'AKSARAY', 'AMASYA', 'ANKARA', 'ANTALYA', 'ARDAHAN', 
    'ARTVİN', 'AYDIN', 'BALIKESİR', 'BARTIN', 'BATMAN', 'BAYBURT', 'BİLECİK', 'BİNGÖL', 'BİTLİS', 'BOLU', 
    'BURDUR', 'BURSA', 'ÇANAKKALE', 'ÇANKIRI', 'ÇORUM', 'DENİZLİ', 'DİYARBAKIR', 'DÜZCE', 'EDİRNE', 'ELAZIĞ', 
    'ERZİNCAN', 'ERZURUM', 'ESKİŞEHİR', 'GAZİANTEP', 'GİRESUN', 'GÜMÜŞHANE', 'HAKKARİ', 'HATAY', 'IĞDIR', 'ISPARTA', 
    'İSTANBUL', 'İZMİR', 'KAHRAMANMARAŞ', 'MARAŞ', 'KARABÜK', 'KARAMAN', 'KARS', 'KASTAMONU', 'KAYSERİ', 'KIRIKKALE', 
    'KIRKLARELİ', 'KIRŞEHİR', 'KİLİS', 'KOCAELİ', 'KONYA', 'KÜTAHYA', 'MALATYA', 'MANİSA', 'MARDİN', 'MERSİN', 
    'MUĞLA', 'MUŞ', 'NEVŞEHİR', 'NİĞDE', 'ORDU', 'OSMANİYE', 'RİZE', 'SAKARYA', 'SAMSUN', 'SİİRT', 'SİNOP', 
    'SİVAS', 'ŞIRNAK', 'TEKİRDAĞ', 'TOKAT', 'TRABZON', 'TUNCELİ', 'ŞANLIURFA', 'URFA', 'UŞAK', 'VAN', 'YALOVA', 
    'YOZGAT', 'ZONGULDAK'
];

const parseBulkInput = (input: string) => {
    // 1. Split inline records first (e.g. "1 12345 Name Region 2 54321 Name Region" -> split at " 2 54321")
    const preparedInput = input.replace(/(\s+)(\d+)\s+(\d{5})\b/g, '\n$2 $3');
    
    const rawLines = preparedInput.split('\n').map(l => l.trim()).filter(Boolean);
    const mergedRecords: string[] = [];
    let currentRecord = '';

    for (const line of rawLines) {
        const startsWithRecordHeader = /^\d+(\s+|$)/.test(line);

        if (startsWithRecordHeader) {
            if (currentRecord) {
                mergedRecords.push(currentRecord);
            }
            currentRecord = line;
        } else {
            if (currentRecord) {
                // Determine if we should join with or without space.
                // Join without space if the line is a single letter or fragment (like ĞLU, İNC, İZE)
                const lastChar = currentRecord.slice(-1);
                const firstChar = line.charAt(0);
                const isLetter = (c: string) => /[a-zA-ZŞÇÖĞÜİıasçöğüı]/.test(c);

                if (isLetter(lastChar) && isLetter(firstChar) && (line.length === 1 || line === 'ĞLU' || line === 'İNC' || line === 'İZE' || currentRecord.length < 50)) {
                    currentRecord += line;
                } else {
                    currentRecord += ' ' + line;
                }
            } else {
                currentRecord = line;
            }
        }
    }
    if (currentRecord) {
        mergedRecords.push(currentRecord);
    }

    const result: { name: string; region: string }[] = [];

    for (let record of mergedRecords) {
        record = record.replace(/\s+/g, ' ').trim();
        
        // Remove index and license numbers from the start
        let cleaned = record;
        const headerMatch = cleaned.match(/^(\d+)\s+(\d{4,6})\s+(.*)$/);
        if (headerMatch) {
            cleaned = headerMatch[3];
        } else {
            cleaned = cleaned.replace(/^\d+\s+/, '');
        }

        let name = cleaned;
        let region = '';

        for (const city of CITIES) {
            const regexWithSpace = new RegExp(`\\s${city}$`, 'i');
            const regexJoined = new RegExp(`${city}$`, 'i');

            if (regexWithSpace.test(cleaned)) {
                region = city;
                name = cleaned.replace(regexWithSpace, '').trim();
                break;
            } else if (regexJoined.test(cleaned)) {
                region = city;
                name = cleaned.replace(regexJoined, '').trim();
                break;
            }
        }

        if (name) {
            result.push({
                name: name.replace(/\s+/g, ' ').trim().toUpperCase(),
                region: region.toUpperCase()
            });
        }
    }

    return result;
};

/**
 * Yönetici paneli için yetkili (hakem/temsilci) yönetim formu.
 * Admin panel management form for officials.
 */
export function OfficialForm({ apiKey, authToken, season }: OfficialFormProps) {
    // --- State: Data ---
    const [officials, setOfficials] = useState<Official[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [isKeyInvalid, setIsKeyInvalid] = useState(false);

    // --- State: Filtering & Pagination ---
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // --- State: Form ---
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [region, setRegion] = useState('');
    const [rating, setRating] = useState<number>(0);
    const [selectedRoles, setSelectedRoles] = useState<OfficialRole[]>([]);
    const [addMode, setAddMode] = useState<'single' | 'bulk'>('single');
    const [bulkNames, setBulkNames] = useState('');
    const [parsedOfficials, setParsedOfficials] = useState<{ name: string; region: string }[]>([]);
    const [selectedClassification, setSelectedClassification] = useState<string>('');
    const [existingSeasons, setExistingSeasons] = useState<string[]>([]);
    const [bulkSeason, setBulkSeason] = useState(season || '2025-2026');

    useEffect(() => {
        if (season) {
            setBulkSeason(season);
        }
    }, [season]);

    useEffect(() => {
        if (addMode === 'bulk') {
            setParsedOfficials(parseBulkInput(bulkNames));
        } else {
            setParsedOfficials([]);
        }
    }, [bulkNames, addMode]);

    // --- State: Match History ---
    // Using Match type intersected with id to ensure type safety
    const [assignedMatches, setAssignedMatches] = useState<(Match & { id: string })[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(false);

    // --- API Interactions ---

    const fetchOfficials = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/officials', {
                headers: { 'x-admin-key': apiKey, 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                setOfficials(data);
                setIsKeyInvalid(false);
            } else {
                let errMsg = 'Bilinmeyen Hata';
                try {
                    const errData = await res.json();
                    errMsg = errData.error || errMsg;
                } catch {
                    const text = await res.text().catch(() => '');
                    if (text) errMsg = text.substring(0, 150);
                }
                console.error("Yetkilileri getirirken API hatası:", res.status, errMsg);
                if (res.status === 401) {
                    setIsKeyInvalid(true);
                } else if (apiKey) {
                    alert(`Yetkili listesi yüklenemedi (Durum: ${res.status}): ${errMsg}`);
                }
            }
        } catch (error: unknown) {
            console.error("Yetkilileri getirirken hata oluştu:", error);
            const msg = error instanceof Error ? error.message : 'Bilinmeyen hata';
            alert(`Yetkilileri çekerken ağ/bağlantı hatası: ${msg}`);
        } finally {
            setLoading(false);
        }
    }, [apiKey, authToken]);

    useEffect(() => {
        fetchOfficials();
    }, [fetchOfficials]);

    const fetchAssignedMatches = async () => {
        if (!name) return;
        setLoadingMatches(true);
        try {
            const { collection, getDocs, query, where } = await import('firebase/firestore');
            const { db } = await import('@/firebase/client');
            const matchesRef = collection(db, 'matches');

            // Firestore doesn't support logical OR for different fields easily.
            // Parallel queries are used to cover all potential referee/official fields.
            const queries = [
                query(matchesRef, where('referee', '==', name)),
                query(matchesRef, where('varReferee', '==', name)),
                query(matchesRef, where('officials.referees', 'array-contains', name)),
                query(matchesRef, where('officials.varReferees', 'array-contains', name)),
                query(matchesRef, where('officials.observers', 'array-contains', name)),
                query(matchesRef, where('officials.representatives', 'array-contains', name)),
                query(matchesRef, where('officials.assistants', 'array-contains', name)),
                query(matchesRef, where('officials.avarReferees', 'array-contains', name)),
                query(matchesRef, where('officials.fourthOfficial', '==', name))
            ];

            const results = await Promise.all(queries.map(q => getDocs(q)));

            const uniqueMatches = new Map<string, Match>();
            results.forEach(snap => {
                snap.docs.forEach(doc => {
                    uniqueMatches.set(doc.id, { ...doc.data() as Match, id: doc.id });
                });
            });

            let filtered = Array.from(uniqueMatches.values());
            if (season) {
                filtered = filtered.filter(m => m.season === season);
            }
            const sorted = filtered.sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            setAssignedMatches(sorted);
            
            const seasonText = season ? `${season} sezonunda ` : '';
            alert(sorted.length === 0 
                ? `Bu görevliye ait ${seasonText}maç bulunamadı.` 
                : `Bu görevliye ait ${seasonText}${sorted.length} maç bulundu.`);

        } catch (error) {
            console.error("Maçları getirirken hata:", error);
            alert('Maçlar getirilirken hata oluştu.');
        } finally {
            setLoadingMatches(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (addMode === 'bulk' && !isEditing) {
            if (parsedOfficials.length === 0) {
                alert('Lütfen en az bir geçerli yetkili verisi giriniz.');
                return;
            }

            setLoading(true);
            try {
                const payload = parsedOfficials.map(officialItem => {
                    let finalRoles = [...selectedRoles];
                    const finalClassification = selectedClassification;

                    if (selectedClassification === 'ust-klasman-gozlemci' || selectedClassification === 'klasman-gozlemci') {
                        finalRoles = ['observer'];
                    } else if (selectedClassification === 'ust-klasman-temsilci' || selectedClassification === 'klasman-temsilci') {
                        finalRoles = ['representative'];
                    } else if (finalRoles.length === 0) {
                        if (selectedClassification === 'ust-klasman' || selectedClassification === 'klasman') {
                            finalRoles = ['referee'];
                        } else if (selectedClassification === 'ust-klasman-yardimci' || selectedClassification === 'klasman-yardimci') {
                            finalRoles = ['assistant'];
                        } else if (selectedClassification === 'var-hakemi') {
                            finalRoles = ['var'];
                        }
                    }

                    return {
                        name: officialItem.name,
                        region: officialItem.region || region,
                        roles: finalRoles,
                        classification: finalClassification,
                        seasons: bulkSeason ? [bulkSeason] : (season ? [season] : ['2025-2026'])
                    };
                });

                const res = await fetch('/api/admin/officials', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json', 
                        'x-admin-key': apiKey, 
                        ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
                    },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    const data = await res.json();
                    alert(`${data.count || payload.length} yetkili başarıyla eklendi.`);
                    setBulkNames('');
                    fetchOfficials();
                    resetForm();
                } else {
                    let errMsg = res.statusText;
                    try {
                        const errData = await res.json();
                        errMsg = errData.error || errMsg;
                    } catch {
                        const text = await res.text().catch(() => '');
                        if (text) errMsg = text.substring(0, 150);
                    }
                    alert(`Toplu kaydetme başarısız: ${errMsg}`);
                }
            } catch (error) {
                console.error("Toplu kaydetme hatası:", error);
                alert('Toplu kaydetme sırasında hata oluştu.');
            } finally {
                setLoading(false);
            }
            return;
        }

        if (!name) {
            alert('İsim gerekli');
            return;
        }

        try {
            const url = '/api/admin/officials';
            const method = isEditing ? 'PUT' : 'POST';
            
            const activeSeason = season || '2025-2026';
            const seasonsPayload = isEditing
                ? (existingSeasons.includes(activeSeason) ? existingSeasons : [...existingSeasons, activeSeason])
                : [activeSeason];

            let finalRoles = [...selectedRoles];
            const finalClassification = selectedClassification;

            if (selectedClassification === 'ust-klasman-gozlemci' || selectedClassification === 'klasman-gozlemci') {
                finalRoles = ['observer'];
            } else if (selectedClassification === 'ust-klasman-temsilci' || selectedClassification === 'klasman-temsilci') {
                finalRoles = ['representative'];
            } else if (finalRoles.length === 0) {
                if (selectedClassification === 'ust-klasman' || selectedClassification === 'klasman') {
                    finalRoles = ['referee'];
                } else if (selectedClassification === 'ust-klasman-yardimci' || selectedClassification === 'klasman-yardimci') {
                    finalRoles = ['assistant'];
                } else if (selectedClassification === 'var-hakemi') {
                    finalRoles = ['var'];
                }
            }

            const body = { 
                id: editId, 
                name, 
                region, 
                roles: finalRoles, 
                rating, 
                classification: finalClassification,
                seasons: seasonsPayload
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'x-admin-key': apiKey, 'Authorization': `Bearer ${authToken}` },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                fetchOfficials();
                resetForm();
            } else {
                alert('İşlem başarısız');
            }
        } catch (error) {
            console.error("Kaydetme hatası:", error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu yetkiliyi silmek istediğinize emin misiniz?')) return;
        try {
            const res = await fetch(`/api/admin/officials?id=${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-key': apiKey, 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) setOfficials(prev => prev.filter(o => o.id !== id));
        } catch (error) {
            console.error("Silme hatası:", error);
        }
    };

    const handleSync = async () => {
        if (!confirm('Mevcut tüm maçları tarayıp sistemde olmayan hakemleri otomatik eklemek istiyor musunuz?')) return;
        setSyncing(true);
        try {
            const res = await fetch('/api/admin/officials/sync', {
                method: 'POST',
                headers: { 'x-admin-key': apiKey, 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                alert(`${data.added} yeni hakem sisteme eklendi.`);
                fetchOfficials();
            } else {
                alert('Senkronizasyon başarısız oldu.');
            }
        } catch (error) {
            console.error("Sync hatası:", error);
        } finally {
            setSyncing(false);
        }
    };

    const handleClearAll = async () => {
        const targetSeason = season || '2025-2026';
        if (!confirm(`Sistemdeki ${targetSeason} sezonuna ait tüm kayıtlı yetkilileri (hakemler, gözlemciler, temsilciler) silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/officials?clear=true&season=${targetSeason}`, {
                method: 'DELETE',
                headers: { 'x-admin-key': apiKey, 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) {
                alert(`${targetSeason} sezonuna ait yetkililer silindi.`);
                fetchOfficials();
            } else {
                alert('Silme işlemi başarısız.');
            }
        } catch (error) {
            console.error("Yetkilileri silerken hata:", error);
            alert('Silme sırasında hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // --- Form Logic ---

    const handleEdit = (official: Official) => {
        setIsEditing(true);
        setAddMode('single');
        setEditId(official.id);
        setName(official.name);
        setRegion(official.region || '');
        setRating(official.rating || 0);
        setExistingSeasons(official.seasons || []);
        setAssignedMatches([]);

        if (official.roles.includes('observer')) {
            setSelectedClassification(official.classification || 'ust-klasman-gozlemci');
            setSelectedRoles([]);
        } else if (official.roles.includes('representative')) {
            setSelectedClassification(official.classification || 'ust-klasman-temsilci');
            setSelectedRoles([]);
        } else {
            setSelectedClassification(official.classification || '');
            setSelectedRoles(official.roles);
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setIsEditing(false);
        setEditId(null);
        setName('');
        setRegion('');
        setSelectedRoles([]);
        setRating(0);
        setAssignedMatches([]);
        setBulkNames('');
        setSelectedClassification('');
        setExistingSeasons([]);
    };

    const toggleRole = (role: OfficialRole) => {
        setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
    };

    // Reset page when season changes
    useEffect(() => {
        setCurrentPage(1);
    }, [season]);

    const displayedOfficials = season
        ? officials.filter(o => o.seasons?.includes(season))
        : officials;

    return (
        <div className="space-y-8">
            {isKeyInvalid && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-sm animate-in fade-in slide-in-from-top-4 duration-350">
                    <div className="flex">
                        <div className="shrink-0">
                            <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-xs font-bold text-red-800">
                                Geçersiz Secret Key! API yetkilendirmesi başarısız oldu (401 Unauthorized). Lütfen girdiğiniz anahtarı kontrol edin.
                            </p>
                        </div>
                    </div>
                </div>
            )}
            {/* Sync Tools */}
            <div className="flex justify-end gap-3 mb-2">
                <button
                    onClick={handleClearAll}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm"
                >
                    Sezon Yetkililerini Temizle ({season || '2025-2026'})
                </button>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-700 transition-colors disabled:opacity-50 shadow-sm"
                >
                    {syncing ? 'Taranıyor...' : 'Maçlardan Senkronize Et'}
                </button>
                <button
                    onClick={fetchOfficials}
                    className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors shadow-sm"
                >
                    Listeyi Yenile
                </button>
            </div>

            {/* Form Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-blue-600" />
                        {isEditing ? 'Yetkili Düzenle' : 'Hakem, Gözlemci ve Temsilci Yönetimi'}
                    </h3>
                    {isEditing && (
                        <button onClick={resetForm} className="text-xs text-red-500 font-bold hover:underline">
                            İptal
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {!isEditing && (
                        <div className="flex border-b border-slate-100 pb-3 gap-6">
                            <button
                                type="button"
                                onClick={() => setAddMode('single')}
                                className={`text-xs font-black pb-1 border-b-2 uppercase tracking-wider transition-all ${addMode === 'single' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                Tekli Ekle
                            </button>
                            <button
                                type="button"
                                onClick={() => setAddMode('bulk')}
                                className={`text-xs font-black pb-1 border-b-2 uppercase tracking-wider transition-all ${addMode === 'bulk' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
                            >
                                Toplu Ekle
                            </button>
                        </div>
                    )}

                    {addMode === 'single' || isEditing ? (
                        <div className="grid md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">İsim Soyisim</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="Örn: Ali Palabıyık"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Bölge (Opsiyonel)</label>
                                <input
                                    type="text"
                                    value={region}
                                    onChange={e => setRegion(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                    placeholder="Örn: Ankara"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase">Reyting (10 üzerinden)</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    max="10"
                                    value={rating}
                                    onChange={e => setRating(Number(e.target.value))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid md:grid-cols-3 gap-6">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Toplu Veri Girişi (Her satıra bir isim veya Excel/Tablo yapıştırabilirsiniz)</label>
                                    <textarea
                                        rows={6}
                                        value={bulkNames}
                                        onChange={e => setBulkNames(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors font-mono"
                                        placeholder={`Örn. Excel'den kopyalanan:\n1\t28522\tZORBAY KÜÇÜK\tADANA\n2\t41113\tDOĞUKAN YILDIRIM\tADANA\n\nveya düz isim listesi:\nAli Palabıyık\nCüneyt Çakır`}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">Bölge (Varsayılan - Opsiyonel)</label>
                                    <input
                                        type="text"
                                        value={region}
                                        onChange={e => setRegion(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors mb-2"
                                        placeholder="Örn: İstanbul"
                                    />
                                    
                                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Eklenecek Sezon</label>
                                    <select
                                        value={bulkSeason}
                                        onChange={e => setBulkSeason(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors mb-4 text-slate-700 font-bold"
                                    >
                                        <option value="2025-2026">2025-2026 Sezonu</option>
                                        <option value="2026-2027">2026-2027 Sezonu</option>
                                    </select>
                                    
                                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700 leading-relaxed">
                                        <strong>Toplu Ekleme İpuçları:</strong>
                                        <ul className="list-disc pl-4 mt-1 space-y-1">
                                            <li>Lisans No, Sıra No ve Şehir içeren tabloları doğrudan yapıştırabilirsiniz.</li>
                                            <li>Seçtiğiniz roller listedeki tüm yetkililere atanır.</li>
                                            <li>Varsayılan reyting 0 olarak ayarlanır.</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {parsedOfficials.length > 0 && (
                                <div className="space-y-2 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                                    <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">Ayrıştırılan Yetkililer Önizlemesi ({parsedOfficials.length})</h4>
                                        <span className="text-[10px] text-slate-400 font-bold">Kaydet butonuyla aşağıdaki veriler yüklenecektir.</span>
                                    </div>
                                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 pr-2">
                                        {parsedOfficials.map((off, index) => (
                                            <div key={index} className="py-2 flex justify-between items-center text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="w-5 h-5 rounded bg-blue-50 text-blue-650 flex items-center justify-center font-bold text-[10px]">{index + 1}</span>
                                                    <span className="font-bold text-slate-800">{off.name}</span>
                                                </div>
                                                {off.region ? (
                                                    <span className="bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">{off.region}</span>
                                                ) : region ? (
                                                    <span className="bg-slate-100 text-slate-450 px-2 py-0.5 rounded text-[10px] italic">{region} (Genel)</span>
                                                ) : (
                                                    <span className="text-red-400 text-[10px] italic">Bölge Belirtilmedi</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase">Klasman / Kategori (Opsiyonel)</label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: '', label: 'Hiçbiri', color: 'bg-slate-500 text-slate-700' },
                                { id: 'ust-klasman', label: 'Üst Klasman Hakemi', color: 'bg-blue-50 text-blue-700' },
                                { id: 'klasman', label: 'Klasman Hakemi', color: 'bg-blue-50 text-blue-700' },
                                { id: 'ust-klasman-yardimci', label: 'Üst Klasman Yardımcı Hakemi', color: 'bg-green-50 text-green-700' },
                                { id: 'klasman-yardimci', label: 'Klasman Yardımcı Hakemi', color: 'bg-green-50 text-green-700' },
                                { id: 'var-hakemi', label: 'VAR Hakemi', color: 'bg-purple-50 text-purple-700' },
                                { id: 'ust-klasman-gozlemci', label: 'Üst Klasman Gözlemci', color: 'bg-slate-50 text-slate-700' },
                                { id: 'klasman-gozlemci', label: 'Klasman Gözlemcisi', color: 'bg-slate-50 text-slate-700' },
                                { id: 'ust-klasman-temsilci', label: 'Üst Klasman Temsilci', color: 'bg-orange-50 text-orange-700' },
                                { id: 'klasman-temsilci', label: 'Klasman Temsilcisi', color: 'bg-orange-50 text-orange-700' },
                            ].map((cls) => (
                                <button
                                    key={cls.id}
                                    type="button"
                                    onClick={() => {
                                        setSelectedClassification(cls.id);
                                        if (['ust-klasman-gozlemci', 'klasman-gozlemci', 'ust-klasman-temsilci', 'klasman-temsilci'].includes(cls.id)) {
                                            setSelectedRoles([]);
                                        }
                                    }}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${selectedClassification === cls.id
                                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    {selectedClassification === cls.id && <Check className="w-3 h-3" />}
                                    {cls.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {!['ust-klasman-gozlemci', 'klasman-gozlemci', 'ust-klasman-temsilci', 'klasman-temsilci'].includes(selectedClassification) && (
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase">Roller</label>
                            <div className="flex flex-wrap gap-2">
                                {FORM_ROLES.map(role => (
                                    <button
                                        key={role.id}
                                        type="button"
                                        onClick={() => toggleRole(role.id)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${selectedRoles.includes(role.id)
                                            ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                            : 'bg-white text-slate-605 border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        {selectedRoles.includes(role.id) && <Check className="w-3 h-3" />}
                                        {role.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-2 flex gap-2">
                        <button
                            type="submit"
                            className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] ${isEditing ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
                                }`}
                        >
                            {isEditing ? 'Güncelle' : 'Kaydet'}
                        </button>
                        {isEditing && (
                            <button
                                type="button"
                                onClick={fetchAssignedMatches}
                                disabled={loadingMatches}
                                className="px-4 py-3 rounded-xl font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 shadow-sm border border-slate-200 transition-all active:scale-[0.98]"
                            >
                                {loadingMatches ? '...' : 'Görev Aldığı Maçları Getir'}
                            </button>
                        )}
                    </div>
                </form>

                <MatchHistory matches={assignedMatches} officialName={name} />
            </div>

            {/* List Table via Sub-Component */}
            <OfficialList
                officials={displayedOfficials}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                search={search}
                onSearchChange={(val) => { setSearch(val); setCurrentPage(1); }}
                filterCategory={filterCategory}
                onFilterCategoryChange={(val) => { setFilterCategory(val); setCurrentPage(1); }}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                rolesDefinition={ROLES}
            />
        </div>
    );
}
