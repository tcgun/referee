"use client";

import React, { useEffect, useRef, useState } from "react";
import { useStore } from "./store/useStore";
import Editor from "./components/Editor";
import Preview from "./components/Preview";
import { toPng } from "html-to-image";
import { Match, Incident } from "@/types";
import { toast } from "sonner";
import { Database, Zap } from "lucide-react";

interface Props {
  activeMatch?: Match | null;
  activeIncidents?: Incident[];
}

export default function GeneratorWrapper({ activeMatch, activeIncidents }: Props) {
  const state = useStore();
  const [mounted, setMounted] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDownload = async () => {
    if (!captureRef.current) return;

    try {
      const dataUrl = await toPng(captureRef.current, {
        quality: 1,
        pixelRatio: 2,
        cacheBust: true,
      });

      const link = document.createElement("a");
      link.download = `varsayim-${state.currentPreset}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Download failed", err);
      toast.error("Görsel oluşturulurken bir hata oluştu.");
    }
  };

  const handleSavePreset = () => {
    toast.success("Ayarlar otomatik olarak kaydedildi!");
  };

  const handleFetchFromMatch = () => {
    if (!activeMatch) {
      toast.error("Lütfen önce bir maç seçin.");
      return;
    }

    const { setState } = state;

    // Map incidents to matchMistakes
    const newMistakes = (activeIncidents || []).sort((a,b) => (a.id || '').localeCompare(b.id || '')).map(inc => {
        let icon: "check" | "cross" | "question" = "question";
        const finalUpper = (inc.finalDecision || '').toUpperCase();
        if (finalUpper.includes('DOĞRU')) icon = 'check';
        else if (finalUpper.includes('YANLIŞ') || finalUpper.includes('GÖRMELİYDİ') || finalUpper.includes('GEREK YOK')) icon = 'cross';

        // Card logic
        let cardPlayer = '';
        if (inc.missedCards && Array.isArray(inc.missedCards) && inc.missedCards.length > 0) {
            const cards = inc.missedCards.map(c => `${c.player} (${c.card === 'yellow' ? 'Sarı' : 'Kırmızı'})`).join(', ');
            cardPlayer = `EKSİK: ${cards}`;
        }
        if (inc.incorrectCards && Array.isArray(inc.incorrectCards) && inc.incorrectCards.length > 0) {
            const cards = inc.incorrectCards.map(c => `${c.player} (${c.givenCard}->${c.correctCard})`).join(', ');
            const prefix = cardPlayer ? ' | ' : '';
            cardPlayer += `${prefix}HATALI: ${cards}`;
        }

        return {
            id: inc.id || Math.random().toString(36).substr(2, 9),
            minute: (inc.minute || "0").toString(),
            title: inc.description || "POZİSYON",
            refDecision: inc.refereeDecision || '',
            finalDecision: inc.finalDecision || '',
            varIntervention: inc.varDecision && inc.varDecision !== '-' ? inc.varDecision : '',
            cardPlayer: cardPlayer,
            icon: icon,
            description1: '',
            description2: '',
            description3: ''
        };
    });

    const matchDate = activeMatch.date instanceof Date ? activeMatch.date.toLocaleDateString('tr-TR') : (activeMatch.date || '');

    setState({
        homeTeam: activeMatch.homeTeamName,
        awayTeam: activeMatch.awayTeamName,
        matchWeek: `${activeMatch.week}. HAFTA`,
        date: matchDate,
        matchMistakes: newMistakes.slice(0, 5), // Template 5 usually shows top 4-5
        template: 'template5'
    });

    toast.success(`${activeMatch.homeTeamName} - ${activeMatch.awayTeamName} verileri başarıyla aktarıldı! ✨`);
  };

  if (!mounted) return (
    <div className="h-[600px] w-full flex items-center justify-center bg-v-gray text-black font-bold italic border-brutal border-black rounded-brutal">
      VARSAYIM LABS YÜKLENİYOR...
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-v-gray relative border-brutal border-black rounded-brutal overflow-hidden">
        {/* Helper Toolbar */}
        <div className="bg-black text-white p-3 flex items-center justify-between border-b-2 border-black">
            <div className="flex items-center gap-2">
                <Zap className="text-v-yellow w-5 h-5 fill-v-yellow" />
                <span className="font-black italic uppercase tracking-tighter">Görsel Oluşturma Sistemi</span>
            </div>
            {activeMatch && (
                <button 
                    onClick={handleFetchFromMatch}
                    className="flex items-center gap-2 bg-v-yellow text-black px-4 py-1.5 rounded-full font-black text-xs uppercase hover:scale-105 transition-all shadow-[0_0_15px_rgba(255,221,0,0.5)]"
                >
                    <Database className="w-3.5 h-3.5" />
                    {activeMatch.homeTeamName} Verilerini Aktar
                </button>
            )}
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
            <Editor />
            <Preview
                domRef={captureRef}
                onSavePreset={handleSavePreset}
                onDownload={handleDownload}
            />
        </div>
    </div>
  );
}
