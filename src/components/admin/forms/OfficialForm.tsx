"use client";

import { useState, useEffect } from 'react';
import { Official, OfficialRole, Match } from '@/types';
import { Shield, Check } from 'lucide-react';
import { MatchHistory } from '@/components/admin/officials/MatchHistory';
import { OfficialList } from '@/components/admin/officials/OfficialList';

interface OfficialFormProps {
    apiKey: string;
    authToken?: string;
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

/**
 * Yönetici paneli için yetkili (hakem/temsilci) yönetim formu.
 * Admin panel management form for officials.
 */
export function OfficialForm({ apiKey, authToken }: OfficialFormProps) {
    // --- State: Data ---
    const [officials, setOfficials] = useState<Official[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);

    // --- State: Filtering & Pagination ---
    const [filterRole, setFilterRole] = useState<OfficialRole | 'all'>('all');
    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    // --- State: Form ---
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [region, setRegion] = useState('');
    const [rating, setRating] = useState<number>(0);
    const [selectedRoles, setSelectedRoles] = useState<OfficialRole[]>([]);

    // --- State: Match History ---
    // Using Match type intersected with id to ensure type safety
    const [assignedMatches, setAssignedMatches] = useState<(Match & { id: string })[]>([]);
    const [loadingMatches, setLoadingMatches] = useState(false);

    useEffect(() => {
        fetchOfficials();
    }, []);

    // --- API Interactions ---

    const fetchOfficials = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/officials', {
                headers: { 'x-admin-key': apiKey, 'Authorization': `Bearer ${authToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                setOfficials(data);
            }
        } catch (error) {
            console.error("Yetkilileri getirirken hata oluştu:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignedMatches = async () => {
        if (!name) return;
        setLoadingMatches(true);
        try {
            const { collection, getDocs, query, where } = await import('firebase/firestore');
            const { db } = await import('@/firebase/client');
            const matchesRef = collection(db, 'matches');

            // Firestore doesn't support logical OR for different array-contains fields easily.
            // Parallel queries are used to cover all role fields.
            const queries = [
                query(matchesRef, where('officials.referees', 'array-contains', name)),
                query(matchesRef, where('officials.varReferees', 'array-contains', name)),
                query(matchesRef, where('officials.observers', 'array-contains', name)),
                query(matchesRef, where('officials.representatives', 'array-contains', name))
            ];

            const results = await Promise.all(queries.map(q => getDocs(q)));

            const uniqueMatches = new Map<string, any>();
            results.forEach(snap => {
                snap.docs.forEach(doc => {
                    uniqueMatches.set(doc.id, { ...doc.data(), id: doc.id });
                });
            });

            // Fallback for legacy data (root level check) if new structure not found? 
            // Skipping complex check for now to keep simple logic.

            const sorted = Array.from(uniqueMatches.values()).sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            setAssignedMatches(sorted);
            alert(sorted.length === 0 ? 'Bu görevliye ait maç bulunamadı.' : `${sorted.length} maç bulundu.`);

        } catch (error) {
            console.error("Maçları getirirken hata:", error);
            alert('Maçlar getirilirken hata oluştu.');
        } finally {
            setLoadingMatches(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || selectedRoles.length === 0) {
            alert('İsim ve en az bir rol gerekli');
            return;
        }

        try {
            const url = '/api/admin/officials';
            const method = isEditing ? 'PUT' : 'POST';
            const body = { id: editId, name, region, roles: selectedRoles, rating };

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

    // --- Form Logic ---

    const handleEdit = (official: Official) => {
        setIsEditing(true);
        setEditId(official.id);
        setName(official.name);
        setRegion(official.region || '');
        setSelectedRoles(official.roles);
        setRating(official.rating || 0);
        setAssignedMatches([]);
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
    };

    const toggleRole = (role: OfficialRole) => {
        setSelectedRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]);
    };

    return (
        <div className="space-y-8">
            {/* Sync Tools */}
            <div className="flex justify-end gap-3 mb-2">
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
                        {isEditing ? 'Yetkili Düzenle' : 'Yeni Yetkili Ekle'}
                    </h3>
                    {isEditing && (
                        <button onClick={resetForm} className="text-xs text-red-500 font-bold hover:underline">
                            İptal
                        </button>
                    )}
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
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

                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-500 uppercase">Roller</label>
                        <div className="flex flex-wrap gap-2">
                            {ROLES.map(role => (
                                <button
                                    key={role.id}
                                    type="button"
                                    onClick={() => toggleRole(role.id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${selectedRoles.includes(role.id)
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    {selectedRoles.includes(role.id) && <Check className="w-3 h-3" />}
                                    {role.label}
                                </button>
                            ))}
                        </div>
                    </div>

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
                officials={officials}
                loading={loading}
                onEdit={handleEdit}
                onDelete={handleDelete}
                search={search}
                onSearchChange={(val) => { setSearch(val); setCurrentPage(1); }}
                filterRole={filterRole}
                onFilterRoleChange={(val) => { setFilterRole(val); setCurrentPage(1); }}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                rolesDefinition={ROLES}
            />
        </div>
    );
}
