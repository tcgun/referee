import React, { useMemo } from "react";
import { useStore } from "../store/useStore";
import { PRESETS } from "../types";
import { Globe } from "lucide-react";
import BaseTemplate from "./common/BaseTemplate";

interface Props {
    domRef: React.RefObject<HTMLDivElement | null>;
}

const Template4: React.FC<Props> = ({ domRef }) => {
    const {
        currentPreset,
        officials,
        showVar,
        showAvar,
        showAvar2,
        showSponsor,
        sponsorLogo,
        sponsorName,
        showMatchInfo,
        homeTeam,
        awayTeam,
        date,
        matchWeek,
        fontSizeMultiplier
    } = useStore();

    const preset = PRESETS[currentPreset] || PRESETS["ratio-1-1"];
    const ratio = preset.height / preset.width;

    const isTall = ratio > 1.5;     // 9:16
    const isWide = ratio < 1;       // 16:9

    const multiplier = fontSizeMultiplier || 1;

    // Üst Bilgiler (Yazı boyutundan bağımsız - Statik)
    const mainTitlePx = isTall ? 24 : isWide ? 18 : 24;
    const refereeNamePx = mainTitlePx;
    const labelPx = isTall ? 14 : isWide ? 10 : 12;

    // VAR/AVAR Kart İsim Puntoları (VAR Boyutu Geri Getirildi)
    const varNamePx = Math.min(34 * multiplier, 34);
    const avarNamePx = Math.min(17 * multiplier, 17);
    const cardLabelPx = Math.min(11 * multiplier, 12);

    // Kutu Boyutları (VAR Eski Boyutuna Döndü, AVARlar Eşitlendi)
    const varBoxWidth = 280 * multiplier;
    const varBoxImgHeight = 250 * multiplier;
    const avarBoxWidth = 180 * multiplier;
    const avarBoxImgHeight = 130 * multiplier;

    const overlayContent = (
        <>
            {showSponsor && sponsorLogo && (
                <div className="absolute bottom-20 left-8 bg-black/40 p-4 border border-white/10 backdrop-blur-sm flex items-center gap-4">
                    <div className="flex flex-col items-start">
                        <span className="text-[8px] font-black uppercase text-v-pink opacity-50 italic">DESTEKLERİYLE</span>
                        <span className="text-white font-black italic uppercase tracking-tighter text-xl">{sponsorName || "VARSAYIM"}</span>
                    </div>
                    <img src={sponsorLogo} alt="Sponsor" className="h-10 object-contain brightness-0 invert opacity-80" />
                </div>
            )}
        </>
    );

    return (
        <BaseTemplate domRef={domRef} overlayContent={overlayContent} showBrandingHeader={true} showBrandingBar={true}>
            {/* Arkaplan Gradyanı */}
            <div className="absolute inset-0 bg-[#0a0a0a] z-0">
                <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a1a] via-[#0a0a0a] to-[#050505]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(255,20,147,0.03)_0%,transparent_70%)]" />
            </div>
            {/* ÜST SOL: BAŞLIK VE MAÇ BİLGİSİ (Template 2 Konumlandırma & Stil - TAM UYUM) */}
            <div className="absolute top-0 left-0 p-4 z-50 flex flex-col items-start gap-2">
                <div className="bg-[#FFD700] text-black border-[3px] border-black px-6 py-2 shadow-[4px_4px_0px_#000]">
                    <span
                        style={{ fontSize: `${mainTitlePx}px` }}
                        className="font-black uppercase tracking-tighter leading-none"
                    >
                        VAR / AVAR GÖREVLİLERİ
                    </span>
                </div>
                {showMatchInfo && (
                    <div className="bg-black/40 backdrop-blur-3xl px-4 py-2 border-l-8 border-[#FFD700] shadow-[4px_4px_20px_rgba(255,215,0,0.2)] flex flex-col items-start">
                        <span
                            style={{ fontSize: `${refereeNamePx}px` }}
                            className="text-white font-black uppercase italic tracking-tighter leading-none mb-1 drop-shadow-md"
                        >
                            {homeTeam} - {awayTeam}
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

            {/* MERKEZ: VAR & AVAR (DİKEY DİZİLİM) */}
            <div className={`relative z-10 flex-1 flex flex-col items-center justify-center gap-12 px-10 ${isWide ? 'mt-20' : 'mt-32'}`}>

                {/* VAR HAKEMİ KARTU (BÜYÜK) */}
                {showVar && officials.var?.name && (
                    <div className="flex flex-col items-center animate-in fade-in zoom-in duration-700">
                        <div
                            style={{ width: `${varBoxWidth}px` }}
                            className="relative border-2 border-v-pink/50 shadow-[0_0_30px_rgba(255,0,150,0.25),_0_0_10px_rgba(255,0,150,0.15)] flex flex-col bg-black overflow-hidden"
                        >
                            <div
                                style={{ height: `${varBoxImgHeight}px` }}
                                className="overflow-hidden relative"
                            >
                                {officials.var.image ? (
                                    <img
                                        src={officials.var.image}
                                        className="w-full h-full object-cover grayscale-[0.2]"
                                        style={{
                                            objectPosition: `${officials.var.x ?? 50}% ${officials.var.y ?? 50}%`,
                                            transformOrigin: `${officials.var.x ?? 50}% ${officials.var.y ?? 50}%`,
                                            transform: `scale(${officials.var.scale || 1})`,
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                        <span className="text-v-pink/20 font-black text-8xl italic">VAR</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.5)]" />
                            </div>
                            <div className="bg-black p-5 flex flex-col items-center text-center border-t-2 border-v-pink">
                                <span style={{ fontSize: `${cardLabelPx}px` }} className="text-v-pink font-black uppercase tracking-[0.4em] italic mb-2">VAR HAKEMİ</span>
                                <h3 style={{ fontSize: `${varNamePx}px` }} className="text-white font-black uppercase italic tracking-tighter leading-none drop-shadow-2xl">
                                    {officials.var.name}
                                </h3>
                            </div>
                            {/* Arkadaki katman efekti (Görseldeki gibi gölge/derinlik) */}
                            <div className="absolute -inset-[2px] border-[2px] border-white/5 pointer-events-none" />
                        </div>
                    </div>
                )}

                {/* AVAR KONTEYNERI (YATAY DİZİLİM) */}
                <div className="flex flex-row items-stretch justify-center gap-12 w-full animate-in fade-in duration-1000">
                    {/* AVAR HAKEMİ KARTU (KÜÇÜK) */}
                    {showAvar && officials.avar?.name && (
                        <div className="flex flex-col items-stretch">
                            <div
                                style={{ width: `${avarBoxWidth}px` }}
                                className="relative h-full border-2 border-v-pink/40 shadow-[0_0_20px_rgba(255,0,150,0.2),_0_0_8px_rgba(255,0,150,0.1)] flex flex-col bg-black overflow-hidden"
                            >
                                <div
                                    style={{ height: `${avarBoxImgHeight}px` }}
                                    className="overflow-hidden relative shrink-0"
                                >
                                    {officials.avar.image ? (
                                        <img
                                            src={officials.avar.image}
                                            className="w-full h-full object-cover grayscale-[0.3]"
                                            style={{
                                                objectPosition: `${officials.avar.x ?? 50}% ${officials.avar.y ?? 50}%`,
                                                transformOrigin: `${officials.avar.x ?? 50}% ${officials.avar.y ?? 50}%`,
                                                transform: `scale(${officials.avar.scale || 1})`,
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                            <span className="text-v-pink/10 font-black text-4xl italic">AVAR</span>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-black p-5 flex-1 flex flex-col items-center justify-center text-center border-t-2 border-v-pink/80">
                                    <span style={{ fontSize: `${cardLabelPx * 0.9}px` }} className="text-v-pink font-black uppercase tracking-[0.3em] italic mb-2">AVAR HAKEMİ</span>
                                    <h4 style={{ fontSize: `${avarNamePx}px` }} className="text-white font-black uppercase tracking-tighter leading-tight">
                                        {officials.avar.name}
                                    </h4>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AVAR 2 HAKEMİ KARTU (KÜÇÜK) */}
                    {showAvar2 && officials.avar2?.name && (
                        <div className="flex flex-col items-stretch animate-in fade-in slide-in-from-right-8 duration-1000 delay-150">
                            <div
                                style={{ width: `${avarBoxWidth}px` }}
                                className="relative h-full border-2 border-v-pink/40 shadow-[0_0_20px_rgba(255,0,150,0.2),_0_0_8px_rgba(255,0,150,0.1)] flex flex-col bg-black overflow-hidden"
                            >
                                <div
                                    style={{ height: `${avarBoxImgHeight}px` }}
                                    className="overflow-hidden relative shrink-0"
                                >
                                    {officials.avar2.image ? (
                                        <img
                                            src={officials.avar2.image}
                                            className="w-full h-full object-cover grayscale-[0.3]"
                                            style={{
                                                objectPosition: `${officials.avar2.x ?? 50}% ${officials.avar2.y ?? 50}%`,
                                                transformOrigin: `${officials.avar2.x ?? 50}% ${officials.avar2.y ?? 50}%`,
                                                transform: `scale(${officials.avar2.scale || 1})`,
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                                            <span className="text-v-pink/10 font-black text-4xl italic">AVAR 2</span>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-black p-5 flex-1 flex flex-col items-center justify-center text-center border-t-2 border-v-pink/80">
                                    <span style={{ fontSize: `${cardLabelPx * 0.9}px` }} className="text-v-pink font-black uppercase tracking-[0.3em] italic mb-2">AVAR 2 HAKEMİ</span>
                                    <h4 style={{ fontSize: `${avarNamePx}px` }} className="text-white font-black uppercase tracking-tighter leading-tight">
                                        {officials.avar2.name}
                                    </h4>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </BaseTemplate>
    );
};

export default Template4;
