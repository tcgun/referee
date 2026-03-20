import React, { useMemo } from "react";
import { useStore } from "../store/useStore";
import { PRESETS } from "../types";
import BaseTemplate from "./common/BaseTemplate";

interface Props {
    domRef: React.RefObject<HTMLDivElement | null>;
}

const Template3: React.FC<Props> = ({ domRef }) => {
    const {
        currentPreset,
        homeTeam,
        awayTeam,
        score,
        officials,
        showMatchInfo,
        matchWeek,
        separator,
        date,
        showVar,
        showAvar,
        showObserver,
        showRepresentative,
        fontSizeMultiplier
    } = useStore();

    const preset = PRESETS[currentPreset] || PRESETS["ratio-1-1"];
    const ratio = preset.height / preset.width;

    const isTall = ratio > 1.5;     // 9:16
    const isPortrait = ratio > 1.1; // 4:5
    const isWide = ratio < 1;       // 16:9

    const multiplier = fontSizeMultiplier || 1;

    // Üst Bilgiler (Yazı boyutundan bağımsız - Statik)
    const mainTitlePx = isTall ? 24 : isWide ? 18 : 24;
    const refereeNamePx = mainTitlePx;
    const labelPx = isTall ? 14 : isWide ? 10 : 12;

    // Font Boyutları (Üst sınırlarla korunmuştur)
    const titleLabelPx = Math.min((isTall ? 14 : isWide ? 14 : 16) * multiplier, 24);
    const mainRefereePx = Math.min((isTall ? 72 : isWide ? 44 : 56) * multiplier, 100);
    const assistantLabelPx = Math.min((isTall ? 12 : isWide ? 10 : 12) * multiplier, 18);
    const assistantNamePx = Math.min((isTall ? 36 : isWide ? 22 : 28) * multiplier, 48);
    const boxLabelPx = Math.min((isTall ? 11 : isWide ? 9 : 10) * multiplier, 16);
    const boxNamePx = Math.min((isTall ? 28 : isWide ? 18 : 22) * multiplier, 36);

    const renderReps = () => {
        const reps = [
            officials.representative1,
            officials.representative2,
            officials.representative3,
            officials.representative4
        ].filter(r => r?.name);

        return reps.map((rep, i) => (
            <div key={i} style={{ fontSize: `${boxNamePx}px` }} className="font-bold uppercase leading-tight text-slate-200">
                {rep?.name}
            </div>
        ));
    };

    return (
        <BaseTemplate domRef={domRef} showBrandingHeader={true} showBrandingBar={true}>
            {/* ARKAPLAN GRADYANI (Görseldeki gibi merkezden parlayan karanlık) */}
            <div className="absolute inset-0 bg-[#0a0a0a] z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] via-[#0a0a0a] to-[#050505]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(255,215,0,0.03)_0%,transparent_70%)]" />
            </div>

            {/* ÜST SOL: BAŞLIK VE MAÇ BİLGİSİ */}
            <div className="absolute top-0 left-0 p-4 z-[60] flex flex-col items-start gap-2">
                <div className="bg-[#FFD700] text-black border-[3px] border-black px-6 py-2 shadow-[4px_4px_0px_#000]">
                    <span
                        style={{ fontSize: `${mainTitlePx}px` }}
                        className="font-black uppercase tracking-tighter leading-none"
                    >
                        MAÇ GÖREVLİLERİ
                    </span>
                </div>
                {showMatchInfo && (
                    <div className="bg-black/40 backdrop-blur-3xl px-4 py-2 border-l-8 border-[#FFD700] shadow-[4px_4px_20px_rgba(255,215,0,0.2)] flex flex-col items-start">
                        <span
                            style={{ fontSize: `${refereeNamePx}px` }}
                            className="text-white font-black uppercase italic tracking-tighter leading-none mb-1 drop-shadow-md"
                        >
                            {homeTeam} {score || "-"} {awayTeam}
                        </span>
                        <div className="flex items-center gap-2">
                            <span
                                style={{ fontSize: `${labelPx}px` }}
                                className="text-[#FFD700] font-black uppercase tracking-widest opacity-90"
                            >
                                {matchWeek}
                            </span>
                            <span className="text-white/40 text-[10px]">|</span>
                            <span
                                style={{ fontSize: `${labelPx}px` }}
                                className="text-white/60 font-bold uppercase"
                            >
                                {date}
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* MERKEZ: HAKEM GRUBU */}
            <div className={`relative z-10 flex-1 flex flex-col items-center justify-center ${isWide ? 'mt-28' : 'mt-40'} px-10`}>

                <div className="w-full max-w-5xl flex flex-col items-center text-center">
                    {/* ANA HAKEM */}
                    <div className="flex flex-col items-center mb-10 w-full">
                        <span style={{ fontSize: `${titleLabelPx}px` }} className="text-[#FFD700] font-black uppercase tracking-[0.4em] mb-3 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                            MÜSABAKANIN HAKEMİ
                        </span>
                        <h2 style={{ fontSize: `${mainRefereePx}px` }} className="text-white font-black uppercase italic tracking-tighter leading-none drop-shadow-[0_10px_15px_rgba(0,0,0,0.8)]">
                            {officials.referee?.name || "İSİMSİZ HAKEM"}
                        </h2>
                        <div className="w-4/5 h-[2px] bg-gradient-to-r from-transparent via-white/20 to-transparent mt-8" />
                    </div>

                    {/* YARDIMCILAR */}
                    <div className="grid grid-cols-2 gap-x-24 gap-y-10 w-full mb-10">
                        <div className="flex flex-col items-center">
                            <span style={{ fontSize: `${assistantLabelPx}px` }} className="text-[#FFD700] font-black uppercase tracking-[0.3em] mb-2 opacity-90">
                                1. YARDIMCI HAKEM
                            </span>
                            <span style={{ fontSize: `${assistantNamePx}px` }} className="text-white font-bold uppercase italic tracking-tight drop-shadow-lg">
                                {officials.assistant1?.name || "-"}
                            </span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span style={{ fontSize: `${assistantLabelPx}px` }} className="text-[#FFD700] font-black uppercase tracking-[0.3em] mb-2 opacity-90">
                                2. YARDIMCI HAKEM
                            </span>
                            <span style={{ fontSize: `${assistantNamePx}px` }} className="text-white font-bold uppercase italic tracking-tight drop-shadow-lg">
                                {officials.assistant2?.name || "-"}
                            </span>
                        </div>
                    </div>

                    {/* DÖRDÜNCÜ HAKEM */}
                    <div className="flex flex-col items-center mb-14">
                        <span style={{ fontSize: `${assistantLabelPx}px` }} className="text-[#FFD700] font-black uppercase tracking-[0.3em] mb-2 opacity-90">
                            DÖRDÜNCÜ HAKEM
                        </span>
                        <span style={{ fontSize: `${assistantNamePx}px` }} className="text-white font-bold uppercase italic tracking-tight text-center drop-shadow-lg">
                            {officials.fourthOfficial?.name || "-"}
                        </span>
                    </div>
                </div>

                {/* ALT GRİD: VAR / AVAR / GÖZLEMCİ / TEMSİLCİ */}
                <div className="w-full max-w-6xl grid grid-cols-2 gap-4 mt-auto mb-12">
                    {/* VAR BOX (Görseldeki koyu gri-siyah kutular) */}
                    {showVar && (
                        <div className="bg-[#111] border-[1px] border-white/10 p-5 flex flex-col items-center justify-center text-center shadow-2xl min-h-[140px] rounded-sm">
                            <span style={{ fontSize: `${boxLabelPx}px` }} className="text-[#FF0096] font-black uppercase tracking-[0.3em] mb-3 drop-shadow-sm">VAR HAKEMİ</span>
                            <span style={{ fontSize: `${boxNamePx}px` }} className="text-white font-bold uppercase italic tracking-tighter leading-tight drop-shadow-md">
                                {officials.var?.name || "-"}
                            </span>
                        </div>
                    )}
                    {/* AVAR BOX */}
                    {showAvar && (
                        <div className="bg-[#111] border-[1px] border-white/10 p-5 flex flex-col items-center justify-center text-center shadow-2xl min-h-[140px] rounded-sm">
                            <span style={{ fontSize: `${boxLabelPx}px` }} className="text-[#FF0096] font-black uppercase tracking-[0.3em] mb-3 drop-shadow-sm">AVAR HAKEMİ</span>
                            <span style={{ fontSize: `${boxNamePx}px` }} className="text-white font-bold uppercase italic tracking-tighter leading-tight drop-shadow-md">
                                {officials.avar?.name || "-"}
                            </span>
                        </div>
                    )}
                    {/* GÖZLEMCİ BOX */}
                    {showObserver && (
                        <div className="bg-[#111] border-[1px] border-white/10 p-5 flex flex-col items-center justify-center text-center shadow-2xl min-h-[140px] rounded-sm">
                            <span style={{ fontSize: `${boxLabelPx}px` }} className="text-[#FFD700] font-black uppercase tracking-[0.3em] mb-3 opacity-90">GÖZLEMCİ</span>
                            <span style={{ fontSize: `${boxNamePx}px` }} className="text-white font-bold uppercase italic tracking-tighter leading-tight drop-shadow-md">
                                {officials.observer?.name || "-"}
                            </span>
                        </div>
                    )}
                    {/* TEMSİLCİ BOX */}
                    {showRepresentative && (
                        <div className="bg-[#111] border-[1px] border-white/10 p-5 flex flex-col items-center justify-center text-center shadow-2xl min-h-[140px] rounded-sm">
                            <span style={{ fontSize: `${boxLabelPx}px` }} className="text-[#FFD700] font-black uppercase tracking-[0.3em] mb-3 opacity-90">TEMSİLCİ</span>
                            <div className="flex flex-col items-center gap-1">
                                {renderReps()}
                                {!officials.representative1?.name && <span className="text-white/20">-</span>}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </BaseTemplate>
    );
};

export default Template3;
