import React from 'react';
import { Official, OfficialRole } from '@/types';
import { Edit2, Trash2, Check } from 'lucide-react';

interface OfficialListProps {
    officials: Official[];
    loading: boolean;
    onEdit: (official: Official) => void;
    onDelete: (id: string) => void;
    // Filtering props
    search: string;
    onSearchChange: (val: string) => void;
    filterRole: OfficialRole | 'all';
    onFilterRoleChange: (val: OfficialRole | 'all') => void;
    // Pagination
    currentPage: number;
    onPageChange: (page: number) => void;
    // Definitions
    rolesDefinition: { id: OfficialRole; label: string; color: string }[];
}

/**
 * Görevlilerin listelendiği, filtrelendiği ve sayfalandığı bileşen.
 * Component for listing, filtering, and paging officials.
 */
export const OfficialList: React.FC<OfficialListProps> = ({
    officials,
    loading,
    onEdit,
    onDelete,
    search,
    onSearchChange,
    filterRole,
    onFilterRoleChange,
    currentPage,
    onPageChange,
    rolesDefinition
}) => {
    const ITEMS_PER_PAGE = 20;

    // Filter Logic
    const filteredOfficials = officials.filter(o => {
        const matchesRole = filterRole === 'all' || o.roles.includes(filterRole);
        const matchesSearch = o.name.toLowerCase().includes(search.toLocaleLowerCase('tr-TR'));
        return matchesRole && matchesSearch;
    });

    // Pagination Logic
    const totalPages = Math.ceil(filteredOfficials.length / ITEMS_PER_PAGE);
    const paginatedOfficials = filteredOfficials.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* Header & Filter Controls */}
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-wrap gap-4 justify-between items-center">
                <h3 className="font-bold text-slate-800">
                    Kayıtlı Yetkililer ({filteredOfficials.length})
                </h3>

                <div className="flex gap-2 overflow-x-auto pb-1 max-w-full custom-scrollbar">
                    <input
                        type="text"
                        placeholder="İsim Ara..."
                        className="bg-white border border-gray-300 text-gray-900 text-xs rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5 min-w-[120px]"
                        value={search}
                        onChange={e => onSearchChange(e.target.value)}
                    />
                    <button
                        onClick={() => onFilterRoleChange('all')}
                        className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap transition-colors ${filterRole === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                    >
                        Tümü
                    </button>
                    {rolesDefinition.map(role => (
                        <button
                            key={role.id}
                            onClick={() => onFilterRoleChange(role.id)}
                            className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap transition-colors ${filterRole === role.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                        >
                            {role.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List Body */}
            <div className="divide-y divide-slate-100">
                {loading ? (
                    <div className="p-12 text-center text-slate-400 animate-pulse">Yükleniyor...</div>
                ) : paginatedOfficials.length === 0 ? (
                    <div className="p-12 text-center text-slate-400 text-sm">
                        {officials.length === 0 ? 'Henüz kayıtlı yetkili yok.' : 'Kriterlere uygun kayıt bulunamadı.'}
                    </div>
                ) : (
                    paginatedOfficials.map(official => (
                        <div key={official.id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                            <div className="space-y-1.5">
                                <h4 className="font-bold text-slate-800 text-sm">{official.name}</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {official.roles.map(roleId => {
                                        const roleDef = rolesDefinition.find(r => r.id === roleId);
                                        return (
                                            <span key={roleId} className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${roleDef?.color || 'bg-gray-100 text-gray-600'}`}>
                                                {roleDef?.label || roleId}
                                            </span>
                                        );
                                    })}
                                    {official.region && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold text-slate-500 bg-slate-100">
                                            {official.region}
                                        </span>
                                    )}
                                    {official.rating !== undefined && official.rating > 0 && (
                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black text-amber-700 bg-amber-100 border border-amber-200">
                                            ★ {official.rating}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => onEdit(official)}
                                    className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                    title="Düzenle"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onDelete(official.id)}
                                    className="p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                                    title="Sil"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="p-4 border-t border-slate-100 flex justify-center gap-2 bg-slate-50/30">
                    <button
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1 rounded bg-white border border-slate-200 text-slate-600 disabled:opacity-50 text-xs font-bold hover:bg-slate-50"
                    >
                        Önceki
                    </button>
                    <span className="px-3 py-1 text-xs font-bold text-slate-600 flex items-center">
                        Sayfa {currentPage} / {totalPages}
                    </span>
                    <button
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 rounded bg-white border border-slate-200 text-slate-600 disabled:opacity-50 text-xs font-bold hover:bg-slate-50"
                    >
                        Sonraki
                    </button>
                </div>
            )}
        </div>
    );
};
