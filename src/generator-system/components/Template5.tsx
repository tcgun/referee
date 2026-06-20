import React from "react";
import { useStore } from "../store/useStore";
import { PRESETS } from "../types";
import { Check, X, HelpCircle } from "lucide-react";
import BaseTemplate from "./common/BaseTemplate";

interface Props {
    domRef: React.RefObject<HTMLDivElement | null>;
}

const Template5: React.FC<Props> = ({ domRef }) => {
    const {
        currentPreset,
        matchMistakes,
        showSponsor,
        sponsorLogo,
        sponsorName,
        showMatchInfo,
        homeTeam,
        awayTeam,
        date,
        matchWeek,
        fontSizeMultiplier,
        showNextPageIndicator
    } = useStore();

    const preset = PRESETS[currentPreset] || PRESETS["ratio-1-1"];
    const ratio = preset.height / preset.width;

    const isTall = ratio > 1.5;     // 9:16
    const isWide = ratio < 1;       // 16:9

    // Base multiplier specifically for Template 5 (0.5x adjustment)
    const t5Scale = 0.5;
    const multiplier = (fontSizeMultiplier || 1) * t5Scale;

    // Font Sizes (Adjusted to 0.5x scale relative to previous large values)
    const mainTitlePx = isTall ? 28 : isWide ? 22 : 28;
    const refereeNamePx = mainTitlePx;
    const labelPx = isTall ? 16 : isWide ? 12 : 14;

    const rowTitlePx = Math.min(28 * multiplier, 36);
    const rowDescPx = Math.min(20 * multiplier, 24);
    const minutePx = Math.min(36 * multiplier, 48);

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
            {/* Background Gradient matching brand theme */}
            <div className="absolute inset-0 bg-[#0a0a0a] z-0">
                <div className="absolute inset-0 bg-linear-to-b from-[#1a1a1a] via-[#0a0a0a] to-[#050505]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(255,20,147,0.03)_0%,transparent_70%)]" />
            </div>

            {/* HEADER */}
            <div className="absolute top-0 left-0 p-4 z-50 flex flex-col items-start gap-2">
                <div className="bg-[#FFD700] text-black border-[3px] border-black px-6 py-2 shadow-[4px_4px_0px_#000]">
                    <span
                        style={{ fontSize: `${mainTitlePx}px` }}
                        className="font-black uppercase tracking-tighter leading-none"
                    >
                        TARTIŞMALI POZİSYONLAR / KARAR ÖZETİ
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

            {/* CONTENT LIST */}
            <div className={`relative z-10 flex-1 h-full w-full flex flex-col items-stretch justify-between gap-3 md:gap-4 px-6 md:px-8 pt-[160px] md:pt-[180px] pb-6 md:pb-8`}>
                {matchMistakes.map((mistake, index) => (
                    <div 
                        key={mistake.id}
                        className="w-full max-w-5xl mx-auto flex-1 flex items-stretch gap-4 md:gap-4 animate-in fade-in slide-in-from-bottom-4 min-h-0"
                        style={{ animationDelay: `${index * 150}ms` }}
                    >
                        {/* OUTSIDE ICON */}
                        {mistake.icon && mistake.icon !== 'none' ? (
                            <div className="w-12 md:w-16 shrink-0 flex flex-col justify-center items-center">
                                {mistake.icon === 'check' && (
                                    <div className="bg-green-500 rounded-full p-2 md:p-3 flex items-center justify-center border-[3px] border-black shadow-[4px_4px_0px_#FFD700]">
                                        <Check className="w-6 h-6 md:w-8 md:h-8 text-white stroke-3" />
                                    </div>
                                )}
                                {mistake.icon === 'cross' && (
                                    <div className="bg-red-500 rounded-full p-2 md:p-3 flex items-center justify-center border-[3px] border-black shadow-[4px_4px_0px_#FFD700]">
                                        <X className="w-6 h-6 md:w-8 md:h-8 text-white stroke-3" />
                                    </div>
                                )}
                                {mistake.icon === 'question' && (
                                    <div className="bg-blue-500 rounded-full p-2 md:p-3 flex items-center justify-center border-[3px] border-black shadow-[4px_4px_0px_#FFD700]">
                                        <HelpCircle className="w-6 h-6 md:w-8 md:h-8 text-white stroke-3" />
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-12 md:w-16 shrink-0" /> // Placeholder to keep alignment
                        )}

                        <div className="flex-1 bg-[#151515] border-2 border-white/10 flex flex-row shadow-[4px_4px_0px_#FFD700] overflow-hidden rounded-3xl min-h-0">
                            {/* LEFT: MINUTE */}
                            <div className="w-20 md:w-24 shrink-0 bg-[#FFD700] flex flex-col items-center justify-center border-r-2 border-black p-2 md:p-4">
                                <span className="text-black font-black uppercase tracking-widest text-xs md:text-sm opacity-80 mb-1">DAKİKA</span>
                                <span style={{ fontSize: `${minutePx}px` }} className="text-black font-black italic tracking-tighter leading-none">
                                    {mistake.minute}
                                </span>
                            </div>

                        {/* MIDDLE: TITLE & ICON */}
                        <div className="w-1/3 md:w-[35%] shrink-0 flex items-center justify-start border-r-2 border-black/30 p-4 md:p-6 relative overflow-hidden">
                            {/* Accent Glow */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,rgba(255,215,0,0.1)_0%,transparent_70%)] pointer-events-none" />
                            
                            <div className="flex items-center gap-4 z-10 pl-4 w-full">
                                <div className="flex flex-col gap-1 items-start">
                                    <h3 style={{ fontSize: `${rowTitlePx}px` }} className="text-white font-black uppercase italic tracking-tighter leading-tight text-left drop-shadow-lg">
                                        {mistake.title}
                                    </h3>
                                </div>
                            </div>
                        </div>

                        {/* RIGHT: DESCRIPTIONS */}
                        <div className="flex-1 flex flex-row items-center justify-between p-4 md:p-6 gap-4 bg-[#1a1a1a] relative overflow-hidden">
                            {/* DECISIONS COLUMN */}
                            <div className="flex-1 flex flex-col justify-center gap-3 md:gap-4">
                                {mistake.refDecision && (
                                    <div className="flex flex-col gap-0.5 relative z-10">
                                        <span className="text-[12px] md:text-[14px] text-white/40 font-bold uppercase tracking-widest">HAKEM KARARI</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white/50 shrink-0" />
                                            <span style={{ fontSize: `${rowDescPx}px` }} className="text-white/80 font-bold uppercase tracking-wide">
                                                {mistake.refDecision}
                                            </span>
                                        </div>
                                    </div>
                                )}

                                {mistake.finalDecision && (
                                    <div className="flex flex-col gap-0.5 relative z-10">
                                        <span className="text-[12px] md:text-[14px] text-[#FFD700]/60 font-bold uppercase tracking-widest">NET KARAR</span>
                                        <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700] shrink-0 shadow-[0_0_8px_rgba(255,215,0,0.8)]" />
                                            <span style={{ fontSize: `${rowDescPx}px` }} className="text-[#FFD700] font-black uppercase tracking-wide">
                                                {mistake.finalDecision}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* DETAILS COLUMN (VAR & KART) */}
                            {(mistake.cardPlayer || mistake.varIntervention) && (
                                <div className="flex flex-col items-end justify-center gap-3 shrink-0 ml-auto border-l-2 border-white/5 pl-4 md:pl-6 max-w-[45%]">
                                    {mistake.varIntervention && (
                                        <div className="flex flex-col items-stretch gap-1 text-right w-full">
                                            <span className="text-[11px] md:text-[12px] text-sky-400/50 font-bold uppercase tracking-widest">VAR MÜDAHALESİ</span>
                                            <div className="bg-sky-500/10 border border-sky-500/30 px-3 py-1.5 rounded-md shadow-[0_0_10px_rgba(56,189,248,0.1)] flex items-center justify-end w-full">
                                                <span style={{ fontSize: `${rowDescPx}px` }} className="text-sky-400 font-bold uppercase tracking-wide">
                                                    {mistake.varIntervention}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {mistake.cardPlayer && (
                                        <div className="flex flex-col items-stretch gap-1 text-right w-full">
                                            <span className="text-[11px] md:text-[12px] text-red-100/40 font-bold uppercase tracking-widest">
                                                {/EKSİK/i.test(mistake.cardPlayer) && !/HATALI/i.test(mistake.cardPlayer)
                                                    ? 'EKSİK KART' 
                                                    : (/HATALI/i.test(mistake.cardPlayer) || /KART/i.test(mistake.cardPlayer)) && !/EKSİK/i.test(mistake.cardPlayer)
                                                        ? 'HATALI KART' 
                                                        : 'HATALI/EKSİK KART'}
                                            </span>
                                            <div className="bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-md flex items-center justify-end gap-2 shadow-[0_0_10px_rgba(239,68,68,0.1)] w-full">
                                                <div className="relative w-4 h-4 flex items-center justify-center shrink-0">
                                                    <div className="absolute w-2.5 h-3.5 bg-red-500 rounded-[1px] border border-black rotate-15 shadow-sm ml-1" />
                                                    <div className="absolute w-2.5 h-3.5 bg-yellow-400 rounded-[1px] border border-black -rotate-10 -ml-2 shadow-sm" />
                                                </div>
                                                <span style={{ fontSize: `${rowDescPx}px` }} className="text-red-100 font-bold uppercase tracking-wide wrap-break-word text-right">
                                                    {mistake.cardPlayer.replace(/^(HATALI:\s*|EKSİK:\s*|KART:\s*|HATALI\s*|EKSİK\s*|KART\s*)/i, '').replace(/\s*\|\s*(HATALI:\s*|EKSİK:\s*|KART:\s*|HATALI\s*|EKSİK\s*|KART\s*)/i, ' | ')}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* FALLBACK DESCRIPTIONS */}
                            {(!mistake.refDecision && !mistake.finalDecision) && (
                                <div className="flex flex-col gap-2 w-full">
                                    {[mistake.description1, mistake.description2, mistake.description3].map((desc, i) => (
                                        desc ? (
                                            <div key={i} className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#FFD700] shrink-0" />
                                                <span style={{ fontSize: `${rowDescPx}px` }} className="text-white/90 font-bold uppercase tracking-wide">
                                                    {desc}
                                                </span>
                                            </div>
                                        ) : null
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}

                {/* NEXT PAGE INDICATOR */}
                {showNextPageIndicator && (
                    <div className="w-full max-w-4xl mt-4 flex items-center justify-center">
                        <div className="bg-[#FFD700] text-black px-8 py-2 md:py-3 rounded-full flex items-center shadow-[0_0_15px_rgba(255,215,0,0.3)] border-2 border-black">
                            <div className="flex gap-1.5 items-center mr-3">
                                <span className="w-1.5 h-1.5 rounded-full bg-black" />
                                <span className="w-1.5 h-1.5 rounded-full bg-black" />
                                <span className="w-1.5 h-1.5 rounded-full bg-black" />
                            </div>
                            <span className="font-black italic uppercase tracking-wider text-sm md:text-base">Devamı Diğer Sayfada</span>
                        </div>
                    </div>
                )}
            </div>
        </BaseTemplate>
    );
};

export default Template5;
