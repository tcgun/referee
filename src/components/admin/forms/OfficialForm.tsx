"use client";

import { useState, useEffect } from 'react';
import { Official, OfficialRole } from '@/types';
import { Trash2, Edit2, Shield, Plus, Check } from 'lucide-react';

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

export function OfficialForm({ apiKey, authToken }: OfficialFormProps) {
    const [officials, setOfficials] = useState<Official[]>([]);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [filterRole, setFilterRole] = useState<OfficialRole | 'all'>('all');

    // Form State
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [name, setName] = useState('');
    const [region, setRegion] = useState('');
    const [rating, setRating] = useState<number>(0);
    const [selectedRoles, setSelectedRoles] = useState<OfficialRole[]>([]);
    const [assignedMatches, setAssignedMatches] = useState<any[]>([]); // Using any for match type temporarily or import Match
    const [loadingMatches, setLoadingMatches] = useState(false);

    const fetchAssignedMatches = async () => {
        if (!name) return;
        setLoadingMatches(true);
        try {
            const { collection, getDocs, query, where, orderBy } = await import('firebase/firestore');
            const { db } = await import('@/firebase/client');

            // We need to check multiple fields. Firestore doesn't support logically OR-ing different array-contains in one query easily.
            // We will run parallel queries for common roles.
            const matchesRef = collection(db, 'matches');

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

            // Client side sort by date desc
            const sorted = Array.from(uniqueMatches.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setAssignedMatches(sorted);
            if (sorted.length === 0) alert('Bu görevliye ait maç bulunamadı.');
            else alert(`${sorted.length} maç bulundu.`);

        } catch (error) {
            console.error(error);
            alert('Maçlar getirilirken hata oluştu.');
        } finally {
            setLoadingMatches(false);
        }
    };

    useEffect(() => {
        fetchOfficials();
    }, []);

    const fetchOfficials = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/officials', {
                headers: {
                    'x-admin-key': apiKey,
                    'Authorization': `Bearer ${authToken}`
                }
            });
            if (res.ok) {
                const data = await res.json();
                setOfficials(data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
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
            const body = {
                id: editId,
                name,
                region,
                roles: selectedRoles,
                rating
            };

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': apiKey,
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                fetchOfficials();
                resetForm();
            } else {
                alert('İşlem başarısız');
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Bu yetkiliyi silmek istediğinize emin misiniz?')) return;

        try {
            const res = await fetch(`/api/admin/officials?id=${id}`, {
                method: 'DELETE',
                headers: {
                    'x-admin-key': apiKey,
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (res.ok) {
                setOfficials(prev => prev.filter(o => o.id !== id));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = (official: Official) => {
        setIsEditing(true);
        setEditId(official.id);
        setName(official.name);
        setRegion(official.region || '');
        setSelectedRoles(official.roles);
        setRating(official.rating || 0);
        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setIsEditing(false);
        setEditId(null);
        setName('');
        setRegion('');
        setSelectedRoles([]);
        setRating(0);
    };

    const handleSync = async () => {
        if (!confirm('Mevcut tüm maçları tarayıp sistemde olmayan hakemleri otomatik eklemek istiyor musunuz?')) return;

        setSyncing(true);
        try {
            const res = await fetch('/api/admin/officials/sync', {
                method: 'POST',
                headers: {
                    'x-admin-key': apiKey,
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                alert(`${data.added} yeni hakem sisteme eklendi.`);
                fetchOfficials();
            } else {
                alert('Senkronizasyon başarısız oldu.');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setSyncing(false);
        }
    };

    const toggleRole = (role: OfficialRole) => {
        setSelectedRoles(prev =>
            prev.includes(role)
                ? prev.filter(r => r !== role)
                : [...prev, role]
        );
    };

    const [search, setSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    const filteredOfficials = officials.filter(o => {
        const matchesRole = filterRole === 'all' || o.roles.includes(filterRole);
        const matchesSearch = o.name.toLowerCase().includes(search.toLocaleLowerCase('tr-TR'));
        return matchesRole && matchesSearch;
    });

    const totalPages = Math.ceil(filteredOfficials.length / ITEMS_PER_PAGE);
    const paginatedOfficials = filteredOfficials.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

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

                {assignedMatches.length > 0 && (
                    <div className="border-t border-slate-100 p-6 bg-slate-50/50">
                        <h4 className="font-bold text-slate-700 mb-3 text-sm">Görev Aldığı Maçlar ({assignedMatches.length})</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {assignedMatches.map(m => (
                                <div key={m.id} className="bg-white p-3 rounded border border-slate-200 text-xs flex justify-between items-center hover:border-blue-300 transition-colors">
                                    <div>
                                        <div className="font-bold text-slate-800">{m.homeTeamName} - {m.awayTeamName}</div>
                                        <div className="text-slate-500">{new Date(m.date).toLocaleDateString('tr-TR')} - Haftalar: {m.week}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono text-slate-400 text-[10px]">{m.id}</div>
                                        {/* Find role in this match */}
                                        {(() => {
                                            const roles: string[] = [];
                                            if (m.officials?.referees?.[0] === name) roles.push('Hakem');
                                            if (m.officials?.referees?.slice(1, 3).includes(name)) roles.push('Yardımcı');
                                            if (m.officials?.referees?.[3] === name) roles.push('4. Hakem');
                                            if (m.officials?.varReferees?.[0] === name) roles.push('VAR');
                                            if (m.officials?.varReferees?.slice(1).includes(name)) roles.push('AVAR');
                                            if (m.officials?.observers?.includes(name)) roles.push('Gözlemci');
                                            if (m.officials?.representatives?.includes(name)) roles.push('Temsilci');
                                            return roles.length > 0 ? <span className="text-blue-600 font-bold">{roles.join(', ')}</span> : null;
                                        })()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* List Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-4 justify-between items-center">
                    <h3 className="font-bold text-slate-800">Kayıtlı Yetkililer ({filteredOfficials.length})</h3>

                    <div className="flex gap-2 overflow-x-auto pb-1 max-w-full">
                        <input
                            type="text"
                            placeholder="İsim Ara..."
                            className="bg-white border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                        />
                        <button
                            onClick={() => { setFilterRole('all'); setCurrentPage(1); }}
                            className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap ${filterRole === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                                }`}
                        >
                            Tümü
                        </button>
                        {ROLES.map(role => (
                            <button
                                key={role.id}
                                onClick={() => { setFilterRole(role.id); setCurrentPage(1); }}
                                className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap ${filterRole === role.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                                    }`}
                            >
                                {role.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="divide-y divide-slate-100">
                    <div className="divide-y divide-slate-100">
                        {loading ? (
                            <div className="p-8 text-center text-slate-400">Yükleniyor...</div>
                        ) : paginatedOfficials.length === 0 ? (
                            <div className="p-8 text-center text-slate-400 text-sm">Kayıt bulunamadı.</div>
                        ) : (
                            paginatedOfficials.map(official => (
                                <div key={official.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                    <div className="space-y-1">
                                        <h4 className="font-bold text-slate-800 text-sm">{official.name}</h4>
                                        <div className="flex flex-wrap gap-1.5">
                                            {official.roles.map(roleId => {
                                                const roleDef = ROLES.find(r => r.id === roleId);
                                                return (
                                                    <span key={roleId} className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${roleDef?.color}`}>
                                                        {roleDef?.label}
                                                    </span>
                                                );
                                            })}
                                            {official.region && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-500 bg-slate-100">
                                                    {official.region}
                                                </span>
                                            )}
                                            {official.rating !== undefined && (
                                                <span className="px-1.5 py-0.5 rounded text-[10px] font-black text-amber-700 bg-amber-100">
                                                    ★ {official.rating}
                                                </span>
                                            )}
                                        </div>
                                        {official.roleCounts && (
                                            <div className="flex flex-wrap gap-1 mt-1 opacity-60">
                                                {Object.entries(official.roleCounts).map(([role, count]) => {
                                                    if (count === 0) return null;
                                                    const roleDef = ROLES.find(r => r.id === role);
                                                    return (
                                                        <span key={role} className="text-[9px] font-medium text-slate-400">
                                                            {roleDef?.label}: {count}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleEdit(official)}
                                            className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(official.id)}
                                            className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-slate-100 flex justify-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1 rounded bg-slate-100 text-slate-600 disabled:opacity-50 text-xs font-bold"
                            >
                                Önceki
                            </button>
                            <span className="px-3 py-1 text-xs font-bold text-slate-600">
                                Sayfa {currentPage} / {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1 rounded bg-slate-100 text-slate-600 disabled:opacity-50 text-xs font-bold"
                            >
                                Sonraki
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
