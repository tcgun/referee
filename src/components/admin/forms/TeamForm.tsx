import { useState } from 'react';
import { Team } from '@/types';
import { toast } from 'sonner';

interface TeamFormProps {
    apiKey: string;
    authToken?: string;
}

export const TeamForm = ({ apiKey, authToken }: TeamFormProps) => {
    const [team, setTeam] = useState<Partial<Team>>({
        id: '', name: '', logo: '', colors: { primary: '#000000', secondary: '#ffffff', text: '#ffffff' }
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await fetch('/api/admin/teams', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-admin-key': apiKey,
                ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {})
            },
            body: JSON.stringify(team),
        });
        if (res.ok) toast.success('Takım Başarıyla Eklendi! ✅');
        else toast.error('Hata: Takım eklenemedi.');
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-fit">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                <h3 className="font-bold text-sm uppercase text-slate-700">Yeni Takım Ekle</h3>
                <p className="text-xs text-slate-500 mt-1">Sistemde eksik olan takımları buradan ekleyin.</p>
            </div>

            <div className="p-6 space-y-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Takım Kodu (ID)</label>
                    <input
                        placeholder="örn: galatasaray"
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-mono"
                        value={team.id}
                        onChange={e => setTeam({ ...team, id: e.target.value })}
                        required
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Takım Tam Adı</label>
                    <input
                        placeholder="örn: Galatasaray A.Ş."
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={team.name}
                        onChange={e => setTeam({ ...team, name: e.target.value })}
                        required
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Logo URL</label>
                    <input
                        placeholder="https://.../logo.png"
                        className="w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={team.logo}
                        onChange={e => setTeam({ ...team, logo: e.target.value })}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Birincil Renk</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                className="w-10 h-10 rounded cursor-pointer border-none bg-transparent"
                                value={team.colors?.primary}
                                onChange={e => setTeam({ ...team, colors: { ...team.colors!, primary: e.target.value } })}
                            />
                            <input
                                className="flex-1 text-[10px] font-mono border rounded px-2 h-10 bg-slate-50 uppercase"
                                value={team.colors?.primary}
                                onChange={e => setTeam({ ...team, colors: { ...team.colors!, primary: e.target.value } })}
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">İkincil Renk</label>
                        <div className="flex gap-2">
                            <input
                                type="color"
                                className="w-10 h-10 rounded cursor-pointer border-none bg-transparent"
                                value={team.colors?.secondary}
                                onChange={e => setTeam({ ...team, colors: { ...team.colors!, secondary: e.target.value } })}
                            />
                            <input
                                className="flex-1 text-[10px] font-mono border rounded px-2 h-10 bg-slate-50 uppercase"
                                value={team.colors?.secondary}
                                onChange={e => setTeam({ ...team, colors: { ...team.colors!, secondary: e.target.value } })}
                            />
                        </div>
                    </div>
                </div>

                <button className="w-full bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white py-3 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all mt-4">
                    TAKIMI SİSTEME EKLE
                </button>
            </div>
        </form>
    );
};
