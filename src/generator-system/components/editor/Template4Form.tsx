import React from "react";
import { useStore } from "../../store/useStore";
import MatchInfoSection from "./MatchInfoSection";
import PhotoControl from "./Common/PhotoControl";

interface Props {
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const Template4Form: React.FC<Props> = ({ handleChange }) => {
    const {
        officials,
        showVar,
        showAvar,
        showAvar2,
        template,
        setState
    } = useStore();

    return (
        <div className="space-y-6">
            <MatchInfoSection handleChange={handleChange} title="Maç Bilgileri" showLabel="" />

            {/* VAR / AVAR Bölümü */}
            <div className="space-y-6 pt-4 border-t border-black/10">
                <div className="flex items-center justify-between">
                    <h4 className="font-black uppercase tracking-tighter text-v-pink underline decoration-2">VAR ODASI GÖREVLİLERİ</h4>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-1 cursor-pointer">
                            <span className="text-[10px] font-bold opacity-60">VAR</span>
                            <input type="checkbox" name="showVar" checked={showVar} onChange={handleChange} className="accent-v-pink" />
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <span className="text-[10px] font-bold opacity-60">AVAR</span>
                            <input type="checkbox" name="showAvar" checked={showAvar} onChange={handleChange} className="accent-v-pink" />
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <span className="text-[10px] font-bold opacity-60">AVAR 2</span>
                            <input type="checkbox" name="showAvar2" checked={showAvar2} onChange={handleChange} className="accent-v-pink" />
                        </label>
                    </div>
                </div>

                <div className="space-y-8">
                    {/* VAR KONTRÖL */}
                    <div className="bg-v-pink/5 p-4 border-2 border-v-pink/20 rounded-brutal space-y-4">
                        <PhotoControl
                            label="VAR Hakemi Portresi"
                            image={officials.var?.image}
                            x={officials.var?.x ?? 50}
                            y={officials.var?.y ?? 50}
                            scale={officials.var?.scale}
                            onUpdate={(data) => setState(prev => ({
                                ...prev,
                                officials: {
                                    ...prev.officials,
                                    var: { ...prev.officials.var, ...data as any }
                                }
                            }))}
                            accentColor="v-pink"
                        />
                        <label className="block space-y-1">
                            <span className="font-bold text-[10px] uppercase opacity-60">VAR Hakemi Adı</span>
                            <input
                                type="text"
                                name="officials.var.name"
                                value={officials.var?.name || ""}
                                onChange={handleChange}
                                className="brutal-input h-10 text-sm font-black uppercase"
                                placeholder="İSİM SOYİSİM"
                            />
                        </label>
                    </div>

                    {/* AVAR KONTRÖL */}
                    <div className="bg-v-pink/5 p-4 border-2 border-v-pink/20 rounded-brutal space-y-4">
                        <PhotoControl
                            label="AVAR Hakemi Portresi"
                            image={officials.avar?.image}
                            x={officials.avar?.x ?? 50}
                            y={officials.avar?.y ?? 50}
                            scale={officials.avar?.scale}
                            onUpdate={(data) => setState(prev => ({
                                ...prev,
                                officials: {
                                    ...prev.officials,
                                    avar: { ...prev.officials.avar, ...data as any }
                                }
                            }))}
                            accentColor="v-pink"
                        />
                        <label className="block space-y-1">
                            <span className="font-bold text-[10px] uppercase opacity-60">AVAR Hakemi Adı</span>
                            <input
                                type="text"
                                name="officials.avar.name"
                                value={officials.avar?.name || ""}
                                onChange={handleChange}
                                className="brutal-input h-10 text-sm font-black uppercase"
                                placeholder="İSİM SOYİSİM"
                            />
                        </label>
                    </div>

                    {/* AVAR 2 KONTRÖL */}
                    {showAvar2 && (
                        <div className="bg-v-pink/5 p-4 border-2 border-v-pink/10 rounded-brutal space-y-4 animate-in fade-in slide-in-from-top-2">
                            <PhotoControl
                                label="AVAR 2 Hakemi Portresi"
                                image={officials.avar2?.image}
                                x={officials.avar2?.x ?? 50}
                                y={officials.avar2?.y ?? 50}
                                scale={officials.avar2?.scale}
                                onUpdate={(data) => setState(prev => ({
                                    ...prev,
                                    officials: {
                                        ...prev.officials,
                                        avar2: { ...prev.officials.avar2, ...data as any }
                                    }
                                }))}
                                accentColor="v-pink"
                            />
                            <label className="block space-y-1">
                                <span className="font-bold text-[10px] uppercase opacity-60">AVAR 2 Hakemi Adı</span>
                                <input
                                    type="text"
                                    name="officials.avar2.name"
                                    value={officials.avar2?.name || ""}
                                    onChange={handleChange}
                                    className="brutal-input h-10 text-sm font-black uppercase"
                                    placeholder="İSİM SOYİSİM"
                                />
                            </label>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Template4Form;
