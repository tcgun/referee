import React from "react";
import { useStore } from "../../store/useStore";
import PhotoControl from "./Common/PhotoControl";

interface Props {
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const Template2Form: React.FC<Props> = ({ handleChange }) => {
    const { officials, stats, setState } = useStore();

    return (
        <div className="space-y-6">
            <div className="bg-v-yellow p-4 border-2 border-black rounded-brutal shadow-brutal flex items-center gap-3">
                <div className="bg-black text-white p-2 rounded-full">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                </div>
                <h4 className="font-black text-black uppercase tracking-tighter">HAKEM İSTATİSTİKLERİ</h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <PhotoControl
                    label="Hakem Fotoğrafı"
                    image={officials.referee?.image}
                    x={officials.referee?.x ?? 50}
                    y={officials.referee?.y ?? 50}
                    scale={officials.referee?.scale}
                    onUpdate={(data) => setState((prev) => ({
                        ...prev,
                        officials: {
                            ...prev.officials,
                            referee: { ...prev.officials.referee, ...data as any }
                        }
                    }))}
                />

                <div className="space-y-4">
                    <label className="block space-y-1">
                        <span className="font-bold text-[10px] uppercase opacity-60">HAKEM ADI</span>
                        <input
                            type="text"
                            name="officials.referee.name"
                            value={officials.referee?.name || ""}
                            onChange={handleChange}
                            className="brutal-input h-10 text-sm font-black uppercase"
                            placeholder="HAKEM İSMİ"
                        />
                    </label>
                    <label className="block space-y-1">
                        <span className="font-bold text-[10px] uppercase opacity-60">MAÇ SAYISI (HAKEM)</span>
                        <input
                            type="text"
                            name="stats.matches"
                            value={stats.matches || ""}
                            onChange={handleChange}
                            className="brutal-input h-10 text-sm font-black"
                            placeholder="Örn: 12"
                        />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        <label className="block space-y-1">
                            <span className="font-bold text-[8px] uppercase opacity-60">VAR GÖREVİ</span>
                            <input
                                type="text"
                                name="stats.varMatches"
                                value={stats.varMatches || ""}
                                onChange={handleChange}
                                className="brutal-input h-8 text-xs font-bold"
                                placeholder="Örn: 5"
                            />
                        </label>
                        <label className="block space-y-1">
                            <span className="font-bold text-[8px] uppercase opacity-60">AVAR GÖREVİ</span>
                            <input
                                type="text"
                                name="stats.avarMatches"
                                value={stats.avarMatches || ""}
                                onChange={handleChange}
                                className="brutal-input h-8 text-xs font-bold"
                                placeholder="Örn: 3"
                            />
                        </label>
                    </div>
                </div>
            </div>

            {/* İstatistikler */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <div className="space-y-1">
                        <span className="text-[9px] font-bold uppercase opacity-50">VAR'A GİTME (M.B)</span>
                        <input
                            type="text"
                            name="stats.varGo"
                            value={stats.varGo || ""}
                            onChange={handleChange}
                            placeholder="0.5"
                            className="brutal-input text-xs"
                        />
                    </div>
                    <div className="space-y-1">
                        <span className="text-[9px] font-bold uppercase opacity-50 text-v-pink">VAR'A ÇAĞIRMA (TOPLAM)</span>
                        <input
                            type="text"
                            name="stats.varCalls"
                            value={stats.varCalls || ""}
                            onChange={handleChange}
                            placeholder="Örn: 8"
                            className="brutal-input text-xs border-v-pink"
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase opacity-50">HATALI KARAR (YORUMCU)</span>
                    <input
                        type="text"
                        name="stats.wrongDecision"
                        value={stats.wrongDecision || ""}
                        onChange={handleChange}
                        placeholder="1.2"
                        className="brutal-input text-xs border-red-200"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase opacity-50">SARI KART (ORT)</span>
                    <input
                        type="text"
                        name="stats.yellowCards"
                        value={stats.yellowCards || ""}
                        onChange={handleChange}
                        placeholder="4.2"
                        className="brutal-input text-xs border-yellow-400 bg-yellow-50"
                    />
                </div>
                <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase opacity-50">KIRMIZI KART (ORT)</span>
                    <input
                        type="text"
                        name="stats.redCards"
                        value={stats.redCards || ""}
                        onChange={handleChange}
                        placeholder="0.3"
                        className="brutal-input text-xs border-red-500 bg-red-50"
                    />
                </div>
                <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase opacity-50">PENALTI (TOPLAM)</span>
                    <input
                        type="text"
                        name="stats.penalties"
                        value={stats.penalties || ""}
                        onChange={handleChange}
                        placeholder="5"
                        className="brutal-input text-xs"
                    />
                </div>
                <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase opacity-50">FAUL (ORT)</span>
                    <input
                        type="text"
                        name="stats.fouls"
                        value={stats.fouls || ""}
                        onChange={handleChange}
                        placeholder="22.5"
                        className="brutal-input text-xs"
                    />
                </div>
            </div>

            {/* Dağılımlar */}
            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-black/5">
                <div className="space-y-2">
                    <span className="text-[8px] font-black uppercase opacity-40">Sarı Kart Dağılımı</span>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="text" name="stats.homeYellow" value={stats.homeYellow || ""} onChange={handleChange} placeholder="EV SAHİBİ" className="brutal-input text-[10px] h-7" />
                        <input type="text" name="stats.awayYellow" value={stats.awayYellow || ""} onChange={handleChange} placeholder="DEPLASMAN" className="brutal-input text-[10px] h-7" />
                    </div>
                </div>
                <div className="space-y-2">
                    <span className="text-[8px] font-black uppercase opacity-40">Kırmızı Kart Dağılımı</span>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="text" name="stats.homeRed" value={stats.homeRed || ""} onChange={handleChange} placeholder="EV SAHİBİ" className="brutal-input text-[10px] h-7" />
                        <input type="text" name="stats.awayRed" value={stats.awayRed || ""} onChange={handleChange} placeholder="DEPLASMAN" className="brutal-input text-[10px] h-7" />
                    </div>
                </div>
                <div className="space-y-2">
                    <span className="text-[8px] font-black uppercase opacity-40">Penaltı Dağılımı</span>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="text" name="stats.homePenalty" value={stats.homePenalty || ""} onChange={handleChange} placeholder="EV SAHİBİ" className="brutal-input text-[10px] h-7" />
                        <input type="text" name="stats.awayPenalty" value={stats.awayPenalty || ""} onChange={handleChange} placeholder="DEPLASMAN" className="brutal-input text-[10px] h-7" />
                    </div>
                </div>
                <div className="space-y-2">
                    <span className="text-[8px] font-black uppercase opacity-40">Faul Dağılımı</span>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="text" name="stats.homeFoul" value={stats.homeFoul || ""} onChange={handleChange} placeholder="EV SAHİBİ" className="brutal-input text-[10px] h-7" />
                        <input type="text" name="stats.awayFoul" value={stats.awayFoul || ""} onChange={handleChange} placeholder="DEPLASMAN" className="brutal-input text-[10px] h-7" />
                    </div>
                </div>
            </div>

            {/* Galibiyet Oranları */}
            <div className="pt-4 border-t border-black/10">
                <span className="font-bold text-[10px] uppercase opacity-60 block mb-2">GALİBİYET / BERABERLİK YÜZDELERİ</span>
                <div className="grid grid-cols-3 gap-2">
                    <input type="text" name="stats.homeWin" value={stats.homeWin || ""} onChange={handleChange} placeholder="EV %45" className="brutal-input text-[10px] h-8" />
                    <input type="text" name="stats.draw" value={stats.draw || ""} onChange={handleChange} placeholder="BER %25" className="brutal-input text-[10px] h-8" />
                    <input type="text" name="stats.awayWin" value={stats.awayWin || ""} onChange={handleChange} placeholder="DEP %30" className="brutal-input text-[10px] h-8" />
                </div>
            </div>
        </div>
    );
};

export default Template2Form;
