import React, { useState } from "react";
import { useStore } from "../../store/useStore";
import MatchInfoSection from "./MatchInfoSection";
import PhotoControl from "./Common/PhotoControl";

interface Props {
    handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const Template3Form: React.FC<Props> = ({ handleChange }) => {
    const {
        officials,
        showObserver,
        showRepresentative,
        showVar,
        showAvar,
        template,
        setState
    } = useStore();

    const TEAM_NAME_MAP: Record<string, string> = {
        "BEŞİKTAŞ": "Beşiktaş",
        "KONYASPOR": "Konyaspor",
        "GALATASARAY": "Galatasaray",
        "GÖZTEPE": "Göztepe",
        "BAŞAKŞEHİR": "Başakşehir Futbol Kulübü",
        "ANTALYASPOR": "Antalyaspor",
        "SAMSUNSPOR": "Samsunspor",
        "TRABZONSPOR": "Trabzonspor",
        "ALANYASPOR": "Alanyaspor",
        "FENERBAHÇE": "Fenerbahçe",
        "GENÇLERBİRLİĞİ": "Gençlerbirliği",
        "KASIMPAŞA": "Kasımpaşa",
        "KOCAELİSPOR": "Kocaelispor",
        "KARAGÜMRÜK": "Fatih Karagümrük",
        "EYÜPSPOR": "Eyüpspor",
        "RİZESPOR": "Rizespor",
        "GAZİANTEP": "Gaziantep FK",
        "KAYSERİSPOR": "Kayserispor"
    };

    const cleanTeamName = (rawName: string) => {
        const upperRaw = rawName.toUpperCase();
        for (const [key, cleanValue] of Object.entries(TEAM_NAME_MAP)) {
            if (upperRaw.includes(key)) {
                return cleanValue;
            }
        }
        // Eğer listede yoksa sadece A.Ş. ve boşlukları temizle
        return rawName.replace(/\s+A\.Ş\.$/i, "").trim();
    };

    const [automationText, setAutomationText] = useState("");

    const handleAutomate = () => {
        if (!automationText.trim()) return;

        const lines = automationText.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
        if (lines.length < 2) return;

        const newData: any = {
            officials: { ...officials }
        };

        // İlk iki satır genellikle takımlardır (Temizlenmiş olarak)
        newData.homeTeam = cleanTeamName(lines[0]);
        newData.awayTeam = cleanTeamName(lines[1]);

        let repCount = 1;

        lines.forEach((line: string) => {
            // Tarih & Saat: 13.03.2026 - 20:00
            const dateMatch = line.match(/(\d{2}\.\d{2}\.\d{4})\s*-\s*(\d{2}:\d{2})/);
            if (dateMatch) {
                newData.date = `${dateMatch[1]} - ${dateMatch[2]}`;
            }

            // İsim Ayıklama (Regex)
            const extractName = (rolePattern: string) => {
                const regex = new RegExp(`(.*)\\(${rolePattern}\\)`, "i");
                const match = line.match(regex);
                return match ? match[1].trim() : null;
            };

            const referee = extractName("Hakem");
            if (referee) newData.officials.referee = { ...newData.officials.referee, name: referee };

            const as1 = extractName("1\\. Yardımcı Hakem");
            if (as1) newData.officials.assistant1 = { ...newData.officials.assistant1, name: as1 };

            const as2 = extractName("2\\. Yardımcı Hakem");
            if (as2) newData.officials.assistant2 = { ...newData.officials.assistant2, name: as2 };

            const fourth = extractName("Dördüncü Hakem");
            if (fourth) newData.officials.fourthOfficial = { ...newData.officials.fourthOfficial, name: fourth };

            const observer = extractName("Gözlemci");
            if (observer) newData.officials.observer = { ...newData.officials.observer, name: observer };

            const rep = extractName("Temsilci");
            if (rep && repCount <= 4) {
                newData.officials[`representative${repCount}`] = {
                    ...(newData.officials[`representative${repCount}`] || { x: 50, y: 50, scale: 1 }),
                    name: rep
                };
                repCount++;
            }
        });

        setState(prev => ({ ...prev, ...newData }));
        setAutomationText(""); // Temizle
        alert("Bilgiler başarıyla dolduruldu!");
    };

    return (
        <div className="space-y-6">
            {/* OTOMASYON BÖLÜMÜ */}
            <div className="bg-v-yellow/10 border-2 border-v-yellow p-4 rounded-brutal shadow-brutal space-y-3">
                <div className="flex items-center gap-2 text-v-yellow">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l2.25-2.25M15.5 7.5l2.25 2.25"></path></svg>
                    <h4 className="font-black uppercase tracking-tighter">OTOMASYON EDİTÖRÜ</h4>
                </div>
                <p className="text-[10px] font-bold opacity-70 uppercase leading-tight">
                    TFF SİTESİNDEN KOPYALADIĞINIZ MAÇ BİLGİLERİNİ BURAYA YAPIŞTIRIN.
                </p>
                <textarea
                    value={automationText}
                    onChange={(e) => setAutomationText(e.target.value)}
                    className="w-full h-24 bg-black/5 border border-v-yellow/30 p-2 text-[11px] font-medium placeholder:opacity-40 uppercase focus:border-v-yellow focus:ring-0 outline-none resize-none"
                    placeholder="HESAP.COM ANTALYASPOR ..."
                />
                <button
                    onClick={handleAutomate}
                    className="w-full bg-v-yellow text-black font-black uppercase text-xs py-2 shadow-[2px_2px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
                >
                    BİLGİLERİ DOLDUR
                </button>
            </div>

            <div className="bg-black text-white p-4 border-2 border-black rounded-brutal shadow-brutal flex items-center gap-3">
                <div className="bg-v-yellow text-black p-2 rounded-full">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </div>
                <h4 className="font-black uppercase tracking-tighter text-v-yellow">MAÇ GÖREVLİLERİ</h4>
            </div>

            <MatchInfoSection handleChange={handleChange} title="Maç Bilgileri" showLabel="" />

            {/* Saha Hakemleri */}
            <div className="space-y-4 animate-in fade-in duration-300">
                <label className="block space-y-1">
                    <span className="font-bold text-[10px] uppercase opacity-60">MAÇIN HAKEMİ</span>
                    <input
                        type="text"
                        name="officials.referee.name"
                        value={officials.referee?.name || ""}
                        onChange={handleChange}
                        className="brutal-input h-10 text-sm font-black uppercase"
                        placeholder="HAKEM İSMİ"
                    />
                </label>

                <div className="grid grid-cols-2 gap-4">
                    <label className="block space-y-1">
                        <span className="font-bold text-[10px] uppercase opacity-60">Yardımcı Hakem 1</span>
                        <input
                            type="text"
                            name="officials.assistant1.name"
                            value={officials.assistant1?.name || ""}
                            onChange={handleChange}
                            className="brutal-input h-10 text-sm font-bold uppercase"
                            placeholder="YARDIMCI 1"
                        />
                    </label>
                    <label className="block space-y-1">
                        <span className="font-bold text-[10px] uppercase opacity-60">Yardımcı Hakem 2</span>
                        <input
                            type="text"
                            name="officials.assistant2.name"
                            value={officials.assistant2?.name || ""}
                            onChange={handleChange}
                            className="brutal-input h-10 text-sm font-bold uppercase"
                            placeholder="YARDIMCI 2"
                        />
                    </label>
                </div>

                <label className="block space-y-1">
                    <span className="font-bold text-[10px] uppercase opacity-60">Dördüncü Hakem</span>
                    <input
                        type="text"
                        name="officials.fourthOfficial.name"
                        value={officials.fourthOfficial?.name || ""}
                        onChange={handleChange}
                        className="brutal-input h-10 text-sm font-black uppercase"
                        placeholder="4. HAKEM"
                    />
                </label>
            </div>

            {/* VAR / AVAR Bölümü */}
            <div className="space-y-6 pt-4 border-t border-black/10">
                <div className="flex items-center justify-between">
                    <h4 className="font-black uppercase tracking-tighter text-v-pink underline decoration-2">VAR ODASI & GÖREVLİLER</h4>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-1 cursor-pointer">
                            <span className="text-[10px] font-bold opacity-60">VAR</span>
                            <input type="checkbox" name="showVar" checked={showVar} onChange={handleChange} className="accent-v-pink" />
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <span className="text-[10px] font-bold opacity-60">AVAR</span>
                            <input type="checkbox" name="showAvar" checked={showAvar} onChange={handleChange} className="accent-v-pink" />
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <PhotoControl
                        label="VAR Hakemi"
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
                        showControls={template === 'template4'}
                    />
                    <div className="space-y-4">
                        <label className="block space-y-1">
                            <span className="font-bold text-[10px] uppercase opacity-60">VAR ADI</span>
                            <input type="text" name="officials.var.name" value={officials.var?.name || ""} onChange={handleChange} className="brutal-input h-10 text-xs font-bold uppercase" placeholder="VAR İSMİ" />
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <PhotoControl
                        label="AVAR Hakemi"
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
                        showControls={template === 'template4'}
                    />
                    <div className="space-y-4">
                        <label className="block space-y-1">
                            <span className="font-bold text-[10px] uppercase opacity-60">AVAR ADI</span>
                            <input type="text" name="officials.avar.name" value={officials.avar?.name || ""} onChange={handleChange} className="brutal-input h-10 text-xs font-bold uppercase" placeholder="AVAR İSMİ" />
                        </label>
                    </div>
                </div>

                {/* Gözlemci / Temsilci */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/5">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-[10px] uppercase opacity-60">GÖZLEMCİ</span>
                            <input type="checkbox" name="showObserver" checked={showObserver} onChange={handleChange} className="accent-black" />
                        </div>
                        {showObserver && (
                            <div className="space-y-2">
                                <input type="text" name="officials.observer.name" value={officials.observer?.name || ""} onChange={handleChange} className="brutal-input h-8 text-[10px] font-bold uppercase" placeholder="İSİM" />
                                <PhotoControl
                                    label="FOTO"
                                    image={officials.observer?.image}
                                    x={officials.observer?.x ?? 50}
                                    y={officials.observer?.y ?? 50}
                                    scale={officials.observer?.scale}
                                    onUpdate={(data) => setState(prev => ({
                                        ...prev,
                                        officials: {
                                            ...prev.officials,
                                            observer: { ...prev.officials.observer, ...data as any }
                                        }
                                    }))}
                                    accentColor="black"
                                    showControls={template === 'template4'}
                                />
                            </div>
                        )}
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-[10px] uppercase opacity-60">TEMSİLCİ</span>
                            <input type="checkbox" name="showRepresentative" checked={showRepresentative} onChange={handleChange} className="accent-black" />
                        </div>
                        {showRepresentative && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-2">
                                        <input type="text" name="officials.representative1.name" value={officials.representative1?.name || ""} onChange={handleChange} className="brutal-input h-8 text-[10px] font-bold uppercase" placeholder="TEMSİLCİ 1" />
                                        <PhotoControl
                                            label="FOTO 1"
                                            image={officials.representative1?.image}
                                            x={officials.representative1?.x ?? 50}
                                            y={officials.representative1?.y ?? 50}
                                            scale={officials.representative1?.scale}
                                            onUpdate={(data) => setState(prev => ({
                                                ...prev,
                                                officials: {
                                                    ...prev.officials,
                                                    representative1: { ...prev.officials.representative1, ...data as any }
                                                }
                                            }))}
                                            accentColor="black"
                                            showControls={template === 'template4'}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <input type="text" name="officials.representative2.name" value={officials.representative2?.name || ""} onChange={handleChange} className="brutal-input h-8 text-[10px] font-bold uppercase" placeholder="TEMSİLCİ 2" />
                                        <PhotoControl
                                            label="FOTO 2"
                                            image={officials.representative2?.image}
                                            x={officials.representative2?.x ?? 50}
                                            y={officials.representative2?.y ?? 50}
                                            scale={officials.representative2?.scale}
                                            onUpdate={(data) => setState(prev => ({
                                                ...prev,
                                                officials: {
                                                    ...prev.officials,
                                                    representative2: { ...prev.officials.representative2, ...data as any }
                                                }
                                            }))}
                                            accentColor="black"
                                            showControls={template === 'template4'}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <input type="text" name="officials.representative3.name" value={officials.representative3?.name || ""} onChange={handleChange} className="brutal-input h-8 text-[10px] font-bold uppercase" placeholder="TEMSİLCİ 3" />
                                        <PhotoControl
                                            label="FOTO 3"
                                            image={officials.representative3?.image}
                                            x={officials.representative3?.x ?? 50}
                                            y={officials.representative3?.y ?? 50}
                                            scale={officials.representative3?.scale}
                                            onUpdate={(data) => setState(prev => ({
                                                ...prev,
                                                officials: {
                                                    ...prev.officials,
                                                    representative3: { ...prev.officials.representative3, ...data as any }
                                                }
                                            }))}
                                            accentColor="black"
                                            showControls={template === 'template4'}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <input type="text" name="officials.representative4.name" value={officials.representative4?.name || ""} onChange={handleChange} className="brutal-input h-8 text-[10px] font-bold uppercase" placeholder="TEMSİLCİ 4" />
                                        <PhotoControl
                                            label="FOTO 4"
                                            image={officials.representative4?.image}
                                            x={officials.representative4?.x ?? 50}
                                            y={officials.representative4?.y ?? 50}
                                            scale={officials.representative4?.scale}
                                            onUpdate={(data) => setState(prev => ({
                                                ...prev,
                                                officials: {
                                                    ...prev.officials,
                                                    representative4: { ...prev.officials.representative4, ...data as any }
                                                }
                                            }))}
                                            accentColor="black"
                                            showControls={template === 'template4'}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Template3Form;
