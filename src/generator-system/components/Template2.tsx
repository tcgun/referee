import React from "react";
import { useStore } from "../store/useStore";
import { PRESETS } from "../types";
import BaseTemplate from "./common/BaseTemplate";

interface Props {
    domRef: React.RefObject<HTMLDivElement | null>;
}

const Template2: React.FC<Props> = ({ domRef }) => {
    const { currentPreset, officials, stats, fontSizeMultiplier, showMatchInfo, homeTeam, awayTeam, matchWeek, date, score } = useStore();

    const preset = PRESETS[currentPreset] || PRESETS["ratio-1-1"];
    const ratio = preset.height / preset.width;

    const isTall = ratio > 1.5;
    const isPortrait = ratio > 1.1;
    const isSquare = ratio >= 1 && ratio <= 1.1;
    const isWide = ratio < 1;

    // Üst Bilgiler (Yazı boyutundan bağımsız - Statik)
    const mainTitlePx = isTall ? 24 : isWide ? 18 : 24;
    const refereeNamePx = mainTitlePx;
    const labelPx = isTall ? 14 : isWide ? 10 : 12;

    // Dinamik Font Boyutları (Baz Değerler * Çarpan)
    const multiplier = fontSizeMultiplier || 1;
    const statLabelPx = (isTall ? 18 : isWide ? 14 : 16) * multiplier;
    const statValuePx = (isTall ? 48 : isWide ? 28 : 36) * multiplier;
    const subStatPx = (isTall ? 14 : isWide ? 10 : 12) * multiplier;

    return (
        <BaseTemplate domRef={domRef}>
            <div className="relative flex-1 flex flex-col w-full h-full">
                {/* ÜST BİLGİLER: Header & İsim (SOL) */}
                <div className="absolute top-0 left-0 p-4 z-[60] flex flex-col items-start gap-2">
                    <div className="bg-[#FFD700] text-black border-[3px] border-black shadow-[4px_4px_0px_#000] px-6 py-2">
                        <span
                            className={`font-black tracking-tighter uppercase text-black leading-none`}
                            style={{ fontSize: `${mainTitlePx}px` }}
                        >
                            HAKEM İSTATİSTİKLERİ
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

                {/* ANA İÇERİK KONTEYNERI */}
                <div className={`relative z-10 flex-1 flex flex-col items-center ${isWide ? 'justify-center p-12' : isSquare ? 'justify-end pb-8 px-6' : 'justify-end pb-8 px-4'} text-white`}>

                    {/* 1:1 (KARE) TABLO DÜZENİ */}
                    {isSquare && (
                        <div className="w-full flex flex-col gap-4 max-w-5xl">
                            <div className="w-full bg-black/30 backdrop-blur-3xl border-t-4 border-white p-3 flex flex-col items-center shadow-2xl border-x border-b border-white/5">
                                <span
                                    className={`font-bold opacity-90 mb-3 uppercase tracking-[0.1em] text-white`}
                                    style={{ fontSize: `${statLabelPx}px` }}
                                >
                                    TOPLAM GÖREV
                                </span>
                                <div className="flex w-full justify-around items-center">
                                    <div className="flex flex-col items-center">
                                        <span style={{ fontSize: `${subStatPx}px` }} className="font-bold opacity-80 uppercase mb-0.5">HAKEM</span>
                                        <span
                                            className={`font-black text-white leading-none drop-shadow-xl`}
                                            style={{ fontSize: `${statValuePx}px` }}
                                        >
                                            {stats.matches || "0"}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center border-l border-white/20 pl-4 pr-4">
                                        <span style={{ fontSize: `${subStatPx}px` }} className="font-bold opacity-80 uppercase mb-0.5">VAR</span>
                                        <span
                                            className={`font-black text-white leading-none drop-shadow-xl`}
                                            style={{ fontSize: `${statValuePx}px` }}
                                        >
                                            {stats.varMatches || "0"}
                                        </span>
                                    </div>
                                    <div className="flex flex-col items-center border-l border-white/20 pl-4">
                                        <span style={{ fontSize: `${subStatPx}px` }} className="font-bold opacity-80 uppercase mb-0.5">AVAR</span>
                                        <span
                                            className={`font-black text-white leading-none drop-shadow-xl`}
                                            style={{ fontSize: `${statValuePx}px` }}
                                        >
                                            {stats.avarMatches || "0"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 w-full">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/30 backdrop-blur-3xl border-t-4 border-v-yellow p-3 flex flex-col items-center justify-center text-center shadow-[0px_0px_30px_rgba(250,204,21,0.2)] border-x border-b border-white/5">
                                        <span style={{ fontSize: `${statLabelPx}px` }} className="font-bold opacity-90 mb-1 uppercase tracking-wider">VAR MÜDAHALESİ</span>
                                        <span style={{ fontSize: `${statValuePx * 1.2}px` }} className="font-black text-v-yellow leading-none tracking-tighter drop-shadow-2xl">{stats.varGo || "0"}</span>
                                        {stats.varCalls && (
                                            <div style={{ fontSize: `${subStatPx * 1.2}px` }} className="mt-1 font-bold opacity-80 text-white uppercase tracking-tighter">Çağrı: {stats.varCalls}</div>
                                        )}
                                    </div>
                                    <div className="bg-black/30 backdrop-blur-3xl border-t-4 border-red-500 p-3 flex flex-col items-center justify-center text-center shadow-[0px_0px_30px_rgba(239,68,68,0.2)] border-x border-b border-white/5">
                                        <span style={{ fontSize: `${subStatPx}px` }} className="font-bold opacity-90 mb-1 uppercase tracking-tight leading-tight h-8 flex items-center justify-center">YORUMCU İSTATİSTİKLERİNE GÖRE</span>
                                        <span style={{ fontSize: `${statValuePx * 1.2}px` }} className="font-black text-red-500 leading-none tracking-tighter drop-shadow-2xl">{stats.wrongDecision || "0"}</span>
                                        <span style={{ fontSize: `${statLabelPx}px` }} className="font-bold opacity-80 text-white uppercase tracking-tight mt-1">HATALI KARAR</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-yellow-400/10 backdrop-blur-3xl border-t-2 border-yellow-400 p-2 flex flex-col items-center border-x border-b border-white/5">
                                        <span style={{ fontSize: `${statLabelPx * 0.9}px` }} className="font-bold opacity-80 uppercase">SARI KART (M.B.O)</span>
                                        <span style={{ fontSize: `${statValuePx}px` }} className="font-black text-yellow-400 drop-shadow-md">{stats.yellowCards || "0.0"}</span>
                                        <div style={{ fontSize: `${subStatPx}px` }} className="flex w-full justify-between items-center font-bold opacity-90 mt-1 border-t border-white/5 pt-1">
                                            <span>EV SAHİBİ: {stats.homeYellow || "0"}</span>
                                            <span>DEPLASMAN: {stats.awayYellow || "0"}</span>
                                        </div>
                                    </div>
                                    <div className="bg-red-500/10 backdrop-blur-3xl border-t-2 border-red-500 p-2 flex flex-col items-center border-x border-b border-white/5">
                                        <span style={{ fontSize: `${statLabelPx * 0.9}px` }} className="font-bold opacity-80 uppercase">KIRMIZI KART (M.B.O)</span>
                                        <span style={{ fontSize: `${statValuePx}px` }} className="font-black text-red-500 drop-shadow-md">{stats.redCards || "0.0"}</span>
                                        <div style={{ fontSize: `${subStatPx}px` }} className="flex w-full justify-between items-center font-bold opacity-90 mt-1 border-t border-white/5 pt-1">
                                            <span>EV SAHİBİ: {stats.homeRed || "0"}</span>
                                            <span>DEPLASMAN: {stats.awayRed || "0"}</span>
                                        </div>
                                    </div>
                                    <div className="bg-white/5 backdrop-blur-3xl border-t-2 border-white p-2 flex flex-col items-center border-x border-b border-white/5">
                                        <span style={{ fontSize: `${statLabelPx * 0.9}px` }} className="font-bold opacity-80 uppercase">PENALTI</span>
                                        <span style={{ fontSize: `${statValuePx}px` }} className="font-black text-white drop-shadow-md">{stats.penalties || "0"}</span>
                                        <div style={{ fontSize: `${subStatPx}px` }} className="flex w-full justify-between items-center font-bold opacity-90 mt-1 border-t border-white/5 pt-1">
                                            <span>EV SAHİBİ: {stats.homePenalty || "0"}</span>
                                            <span>DEPLASMAN: {stats.awayPenalty || "0"}</span>
                                        </div>
                                    </div>
                                    <div className="bg-v-pink/10 backdrop-blur-3xl border-t-2 border-v-pink p-2 flex flex-col items-center border-x border-b border-white/5">
                                        <span style={{ fontSize: `${statLabelPx * 0.9}px` }} className="font-bold opacity-80 uppercase">FAUL (M.B.O)</span>
                                        <span style={{ fontSize: `${statValuePx}px` }} className="font-black text-v-pink drop-shadow-md">{stats.fouls || "0.0"}</span>
                                        <div style={{ fontSize: `${subStatPx}px` }} className="flex w-full justify-between items-center font-bold opacity-90 mt-1 border-t border-white/5 pt-1">
                                            <span>EV SAHİBİ: {stats.homeFoul || "0"}</span>
                                            <span>DEPLASMAN: {stats.awayFoul || "0"}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* YATAY (LANDSCAPE) DÜZENİ */}
                    {isWide && (
                        <div className="flex flex-row items-center justify-between w-full max-w-full px-4 mt-8 flex-1">
                            <div className="flex-1" />
                            <div className="w-[35%] flex flex-col gap-4 items-center justify-center">
                                <div className="w-full bg-black/30 backdrop-blur-3xl border-t-4 border-white p-5 flex flex-col items-center justify-center text-center shadow-2xl border-x border-b border-white/5">
                                    <span style={{ fontSize: `${statLabelPx}px` }} className="font-bold opacity-90 mb-2 uppercase tracking-wider text-white">TOPLAM GÖREV</span>
                                    <div className="flex flex-col w-full gap-2">
                                        <div className="flex justify-between items-center border-b border-white/10 pb-1">
                                            <span style={{ fontSize: `${statLabelPx * 0.8}px` }} className="font-bold opacity-80 uppercase text-white">HAKEM</span>
                                            <span style={{ fontSize: `${statValuePx}px` }} className="font-black text-white leading-none">{stats.matches || "0"}</span>
                                        </div>
                                        <div className="flex justify-between items-center border-b border-white/10 pb-1">
                                            <span style={{ fontSize: `${statLabelPx * 0.8}px` }} className="font-bold opacity-80 uppercase text-white">VAR</span>
                                            <span style={{ fontSize: `${statValuePx}px` }} className="font-black text-white leading-none">{stats.varMatches || "0"}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span style={{ fontSize: `${statLabelPx * 0.8}px` }} className="font-bold opacity-80 uppercase text-white">AVAR</span>
                                            <span style={{ fontSize: `${statValuePx}px` }} className="font-black text-white leading-none">{stats.avarMatches || "0"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full bg-black/30 backdrop-blur-3xl border-t-4 border-v-yellow p-5 flex flex-col items-center justify-center text-center shadow-[0px_0px_30px_rgba(250,204,21,0.2)] border-x border-b border-white/5">
                                    <span style={{ fontSize: `${statLabelPx}px` }} className="font-bold opacity-90 mb-1 uppercase tracking-wider text-white">VAR MÜDAHALESİ</span>
                                    <span style={{ fontSize: `${statValuePx}px` }} className="font-black text-v-yellow leading-none tracking-tighter drop-shadow-2xl">{stats.varGo || "0"}</span>
                                    {stats.varCalls && (
                                        <div className="mt-3 pt-2 border-t border-white/10 w-full flex flex-col items-center">
                                            <span style={{ fontSize: `${statLabelPx * 0.8}px` }} className="font-bold opacity-80 uppercase text-white">VAR'a Çağırma</span>
                                            <span style={{ fontSize: `${statValuePx * 0.8}px` }} className="font-black text-white">{stats.varCalls}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="w-full bg-black/30 backdrop-blur-3xl border-t-4 border-red-500 p-5 flex flex-col items-center justify-center text-center shadow-[0px_0px_30px_rgba(239,68,68,0.2)] border-x border-b border-white/5">
                                    <span style={{ fontSize: `${statLabelPx * 0.7}px` }} className="font-bold opacity-90 mb-1 uppercase tracking-tight leading-tight h-10 flex items-center justify-center text-white text-center">YORUMCU İSTATİSTİKLERİNE GÖRE</span>
                                    <span style={{ fontSize: `${statValuePx}px` }} className="font-black text-red-500 leading-none tracking-tighter mt-2 drop-shadow-2xl">{stats.wrongDecision || "0"}</span>
                                    <span style={{ fontSize: `${statLabelPx}px` }} className="font-bold opacity-80 text-white uppercase tracking-tight mt-1">HATALI KARAR</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ALT: KARTLAR GRİDİ (LANDSCAPE İÇİN ALTTA) */}
                    {isWide && (
                        <div className="w-full max-w-6xl mt-8 px-12 mb-8">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-yellow-400/20 backdrop-blur-3xl border-t-4 border-yellow-400 p-4 flex flex-col items-center justify-center text-center shadow-[0px_0px_20px_rgba(250,204,21,0.2)] overflow-hidden border-x border-b border-white/5">
                                    <span style={{ fontSize: `${statLabelPx * 0.8}px` }} className="font-bold opacity-90 mb-1 uppercase tracking-wider leading-tight">SARI KART (M.B.O)</span>
                                    <span style={{ fontSize: `${statValuePx}px` }} className="font-black text-yellow-400 leading-none tracking-tighter drop-shadow-md">{stats.yellowCards || "0.0"}</span>
                                </div>
                                <div className="bg-red-500/20 backdrop-blur-3xl border-t-4 border-red-500 p-4 flex flex-col items-center justify-center text-center shadow-[0px_0px_20px_rgba(239,68,68,0.2)] overflow-hidden border-x border-b border-white/5">
                                    <span style={{ fontSize: `${statLabelPx * 0.8}px` }} className="font-bold opacity-90 mb-1 uppercase tracking-wider leading-tight">KIRMIZI KART (M.B.O)</span>
                                    <span style={{ fontSize: `${statValuePx}px` }} className="font-black text-red-500 leading-none tracking-tighter drop-shadow-md">{stats.redCards || "0.0"}</span>
                                </div>
                                <div className="bg-white/10 backdrop-blur-3xl border-t-4 border-white p-4 flex flex-col items-center justify-center text-center shadow-2xl overflow-hidden border-x border-b border-white/5">
                                    <span style={{ fontSize: `${statLabelPx}px` }} className="font-bold opacity-90 mb-1 uppercase tracking-wider text-center">PENALTI</span>
                                    <span style={{ fontSize: `${statValuePx}px` }} className="font-black text-white leading-none tracking-tighter drop-shadow-md">{stats.penalties || "0"}</span>
                                </div>
                                <div className="bg-v-pink/20 backdrop-blur-3xl border-t-4 border-v-pink p-4 flex flex-col items-center justify-center text-center shadow-[0px_0px_20px_rgba(244,114,182,0.2)] overflow-hidden border-x border-b border-white/5">
                                    <span style={{ fontSize: `${statLabelPx * 0.8}px` }} className="font-bold opacity-90 mb-1 uppercase tracking-wider leading-tight">FAUL (M.B.O)</span>
                                    <span style={{ fontSize: `${statValuePx}px` }} className="font-black text-v-pink leading-none tracking-tighter drop-shadow-md">{stats.fouls || "0.0"}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* DİKEY (PORTRAIT/STORY) DÜZENİ */}
                    {isPortrait && !isSquare && (
                        <div className="w-full">
                            <div className="space-y-6">
                                <div className="bg-black/30 backdrop-blur-3xl border-t-4 border-white p-6 flex flex-col items-center justify-center text-center shadow-2xl border-x border-b border-white/5">
                                    <span style={{ fontSize: `${statLabelPx * 1.5}px` }} className="font-bold opacity-90 mb-4 uppercase tracking-[0.2em]">TOPLAM GÖREV</span>
                                    <div className="flex w-full gap-4 justify-around">
                                        <div className="flex flex-col items-center">
                                            <span style={{ fontSize: `${statLabelPx}px` }} className="font-bold opacity-80 uppercase mb-1">HAKEM</span>
                                            <span style={{ fontSize: `${statValuePx * 1.2}px` }} className="font-black text-white leading-none drop-shadow-md">{stats.matches || "0"}</span>
                                        </div>
                                        <div className="flex flex-col items-center border-l border-white/10 pl-4">
                                            <span style={{ fontSize: `${statLabelPx}px` }} className="font-bold opacity-80 uppercase mb-1">VAR</span>
                                            <span style={{ fontSize: `${statValuePx * 1.2}px` }} className="font-black text-white leading-none drop-shadow-md">{stats.varMatches || "0"}</span>
                                        </div>
                                        <div className="flex flex-col items-center border-l border-white/10 pl-4">
                                            <span style={{ fontSize: `${statLabelPx}px` }} className="font-bold opacity-80 uppercase mb-1">AVAR</span>
                                            <span style={{ fontSize: `${statValuePx * 1.2}px` }} className="font-black text-white leading-none drop-shadow-md">{stats.avarMatches || "0"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-black/30 backdrop-blur-3xl border-t-4 border-v-yellow p-8 flex flex-col items-center justify-center text-center shadow-[0px_0px_30px_rgba(250,204,21,0.2)] border-x border-b border-white/5">
                                        <span style={{ fontSize: `${statLabelPx}px` }} className="font-bold opacity-90 mb-2 uppercase tracking-wider">VAR MÜDAHALESİ</span>
                                        <span style={{ fontSize: `${statValuePx * 1.2}px` }} className="font-black text-v-yellow leading-none tracking-tighter drop-shadow-2xl">{stats.varGo || "0"}</span>
                                    </div>
                                    <div className="bg-black/30 backdrop-blur-3xl border-t-4 border-red-500 p-8 flex flex-col items-center justify-center text-center shadow-[0px_0px_30px_rgba(239,68,68,0.2)] border-x border-b border-white/5">
                                        <span style={{ fontSize: `${statLabelPx * 0.8}px` }} className="font-bold opacity-90 mb-1 uppercase tracking-tight leading-tight h-10 flex items-center justify-center text-center">YORUMCU İSTATİSTİKLERİNE GÖRE</span>
                                        <span style={{ fontSize: `${statValuePx * 1.2}px` }} className="font-black text-red-500 leading-none tracking-tighter drop-shadow-2xl">{stats.wrongDecision || "0"}</span>
                                        <span style={{ fontSize: `${statLabelPx}px` }} className="font-bold opacity-80 text-white uppercase tracking-tight mt-1">HATALI KARAR</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6 pb-12">
                                    <div className="bg-yellow-400/10 backdrop-blur-3xl border-t-2 border-yellow-400 p-6 flex flex-col items-center border-x border-b border-white/5">
                                        <span style={{ fontSize: `${subStatPx * 1.5}px` }} className="font-bold opacity-80 uppercase mb-1 leading-tight text-center">SARI KART (M.B.O)</span>
                                        <span style={{ fontSize: `${statValuePx * 1.2}px` }} className="font-black text-yellow-400 drop-shadow-md leading-none">{stats.yellowCards || "0.0"}</span>
                                    </div>
                                    <div className="bg-red-500/10 backdrop-blur-3xl border-t-2 border-red-500 p-6 flex flex-col items-center border-x border-b border-white/5">
                                        <span style={{ fontSize: `${subStatPx * 1.5}px` }} className="font-bold opacity-80 uppercase mb-1 leading-tight text-center">KIRMIZI KART (M.B.O)</span>
                                        <span style={{ fontSize: `${statValuePx * 1.2}px` }} className="font-black text-red-500 drop-shadow-md leading-none">{stats.redCards || "0.0"}</span>
                                    </div>
                                    <div className="bg-white/5 backdrop-blur-3xl border-t-2 border-white p-6 flex flex-col items-center border-x border-b border-white/5">
                                        <span style={{ fontSize: `${statLabelPx}px` }} className="font-bold opacity-80 uppercase mb-1">PENALTI</span>
                                        <span style={{ fontSize: `${statValuePx * 1.2}px` }} className="font-black text-white drop-shadow-md leading-none">{stats.penalties || "0"}</span>
                                    </div>
                                    <div className="bg-v-pink/10 backdrop-blur-3xl border-t-2 border-v-pink p-6 flex flex-col items-center border-x border-b border-white/5">
                                        <span style={{ fontSize: `${subStatPx * 1.5}px` }} className="font-bold opacity-80 uppercase mb-1 leading-tight text-center">FAUL (M.B.O)</span>
                                        <span style={{ fontSize: `${statValuePx * 1.2}px` }} className="font-black text-v-pink drop-shadow-md leading-none">{stats.fouls || "0.0"}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </BaseTemplate>
    );
};

export default Template2;
