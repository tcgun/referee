"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * RefereeLig Premium Landing Page
 * Theme: "VAR Room / Analysis Terminal" 
 * Colors: Deep Navy/Black, Neutral Zinc Cards, Cyan/Turquoise Accents
 * Typography: Standard Sans (Inter) with tabular-nums for data
 */

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#02040a] text-zinc-100 selection:bg-cyan-500/30">
      <HeroSection />
      <FeaturesSection />
      <HowItWorksSection />
      <ExampleMatchSection />
      <TrustSection />
      <Footer />
    </main>
  );
}

// --- Components ---

function HeroSection() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Ambient Background Animation (Particles/Lines)
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: { x: number; y: number; vx: number; vy: number }[] = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      init();
    };

    const init = () => {
      particles = [];
      const count = Math.min(window.innerWidth / 20, 80);
      for (let i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "rgba(6, 182, 212, 0.1)"; // Cyan faint
      ctx.lineWidth = 0.5;

      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(6, 182, 212, 0.2)";
        ctx.fill();

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.sqrt((p.x - p2.x) ** 2 + (p.y - p2.y) ** 2);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener("resize", resize);
    resize();
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden border-b border-white/5">
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />

      {/* Terminal UI Decorations */}
      <div className="absolute top-8 left-8 flex items-center gap-2 text-[10px] text-cyan-500/50 font-mono tracking-widest uppercase">
        <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />
        Terminal Status: Scanning Live Data
      </div>
      <div className="absolute bottom-8 right-8 text-[10px] text-zinc-500 font-mono">
        COORD_X: 41.0082 // COORD_Y: 28.9784
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl">
        <div className="inline-block mb-4 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[10px] font-bold text-cyan-400 uppercase tracking-[0.2em]">
          Yeni Nesil Hakem Analiz Platformu
        </div>
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-6 bg-gradient-to-b from-white to-zinc-500 bg-clip-text text-transparent">
          REFEREE<span className="text-cyan-500">LIG</span>
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Süper Lig hakem kararlarını veri odaklı, Trio analizleriyle ve şeffaf bir bakış açısıyla terminal hassasiyetinde keşfedin.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/matches" className="w-full sm:w-auto px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg transition-all shadow-[0_0_20px_rgba(8,145,178,0.3)] hover:scale-105 active:scale-95">
            Haftanın Maçları
          </Link>
          <Link href="/referees" className="w-full sm:w-auto px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold rounded-lg transition-all border border-zinc-700 hover:border-zinc-500">
            Hakem Analizleri
          </Link>
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const features = [
    { title: "Trio Yorumları", desc: "Eski hakemlerin en kritik pozisyonlar üzerindeki detaylı ve bağımsız yorumları.", icon: "💬" },
    { title: "Tartışmalı Pozisyonlar", desc: "Dakika dakika ayrıştırılmış, video destekli ve sonuç odaklı pozisyon arşivi.", icon: "⚖️" },
    { title: "Hakem Kadrosu", desc: "Her maçın resmi, VAR ve AVAR ekiplerinin tam listesi ve performans verileri.", icon: "🏁" },
    { title: "Maç İstatistikleri", desc: "Oyunun akışını ve hakem kararlarının maça etkisini gösteren gelişmiş veriler.", icon: "📊" },
    { title: "PFDK Kararları", desc: "Kurulun verdiği cezalar, gerekçeler ve kulüplere yansıyan resmi raporlar.", icon: "📑" },
    { title: "Kulüp Açıklamaları", desc: "Resmi kanallardan gelen tepkiler ve açıklamaların kronolojik takibi.", icon: "📢" },
  ];

  return (
    <section className="py-24 px-4 bg-[#05070f]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-black mb-4 tracking-tight">ANALİZ MERKEZİ</h2>
          <div className="h-1 w-20 bg-cyan-600 mx-auto rounded-full" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="group p-8 bg-zinc-900/40 border border-zinc-800 rounded-2xl hover:border-cyan-500/50 transition-all hover:-translate-y-1">
              <div className="text-4xl mb-6 bg-zinc-800 w-16 h-16 flex items-center justify-center rounded-xl group-hover:bg-cyan-500/10 transition-colors">
                {f.icon}
              </div>
              <h3 className="text-xl font-bold mb-3 text-zinc-100">{f.title}</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { num: "01", title: "Maçı Seç", desc: "Haftalık fikstürden incelenmesini istediğin mücadeleyi belirle." },
    { num: "02", title: "Pozisyonu İncele", desc: "Dakika bazlı filtrelerle radarımıza giren önemli kararları gör." },
    { num: "03", title: "Yorumları Karşılaştır", desc: "Farklı yorumcuların 'Verdict'lerini ve gerekçelerini oku." },
  ];

  return (
    <section className="py-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-end justify-between mb-16 gap-4">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight">NASIL ÇALIŞIR?</h2>
          <p className="text-zinc-500 font-mono text-sm max-w-sm">PROCESS_ID: 9928 // ANALYSYS_FLOW</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
          <div className="hidden md:block absolute top-12 left-0 w-full h-px bg-zinc-800 -z-10" />
          {steps.map((s, i) => (
            <div key={i} className="flex flex-col gap-6">
              <div className="w-12 h-12 bg-cyan-600 flex items-center justify-center rounded-lg text-white font-black text-xl shadow-[0_0_15px_rgba(8,145,178,0.4)]">
                {s.num}
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2 uppercase tracking-wide">{s.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExampleMatchSection() {
  return (
    <section className="py-24 px-4 bg-cyan-950/10 border-y border-white/5">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-xs font-mono text-cyan-500 uppercase tracking-widest">Örnek Rapor</span>
          <h2 className="text-3xl font-black mt-2">Haftanın Mercek Altındaki Maçı</h2>
        </div>

        <div className="max-w-3xl mx-auto bg-zinc-900/60 border border-zinc-700/50 rounded-3xl p-6 md:p-10 shadow-2xl overflow-hidden relative">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-[80px] -z-10 rounded-full" />

          <div className="flex items-center justify-center gap-6 md:gap-12 mb-10">
            <div className="text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-800 rounded-full flex items-center justify-center text-2xl md:text-4xl shadow-inner mb-3">GS</div>
              <div className="text-xs font-bold uppercase tracking-tight">Galatasaray</div>
            </div>

            <div className="text-center flex flex-col items-center">
              <div className="text-4xl md:text-6xl font-black font-mono tabular-nums tracking-tighter">2 - 1</div>
              <div className="text-[10px] font-bold text-zinc-500 uppercase mt-2 px-2 py-0.5 bg-zinc-800 rounded">Final Score</div>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-zinc-800 rounded-full flex items-center justify-center text-2xl md:text-4xl shadow-inner mb-3">FB</div>
              <div className="text-xs font-bold uppercase tracking-tight">Fenerbahçe</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="bg-zinc-800/50 p-3 rounded-xl border border-white/5 flex flex-col items-center">
              <span className="text-[10px] font-black text-green-500 uppercase mb-1">Doğru Karar</span>
              <span className="text-2xl font-mono font-black tabular-nums">12</span>
            </div>
            <div className="bg-zinc-800/50 p-3 rounded-xl border border-white/5 flex flex-col items-center">
              <span className="text-[10px] font-black text-amber-400 uppercase mb-1">Tartışmalı</span>
              <span className="text-2xl font-mono font-black tabular-nums">3</span>
            </div>
            <div className="bg-zinc-800/50 p-3 rounded-xl border border-white/5 flex flex-col items-center">
              <span className="text-[10px] font-black text-red-500 uppercase mb-1">Hatalı Karar</span>
              <span className="text-2xl font-mono font-black tabular-nums">2</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-6 border-t border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-zinc-700 rounded-lg flex items-center justify-center text-sm">👤</div>
              <div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase leading-none mb-1">Orta Hakem</div>
                <div className="text-sm font-bold">Atilla Karaoğlan</div>
              </div>
            </div>
            <Link href="/matches/sample" className="text-xs font-black text-cyan-500 hover:text-cyan-400 uppercase tracking-widest bg-cyan-500/5 py-2 px-4 rounded-lg border border-cyan-500/20 transition-all">
              Raporu Gör
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustSection() {
  return (
    <section className="py-24 px-4 text-center">
      <div className="max-w-2xl mx-auto">
        <div className="text-3xl mb-6">🛡️</div>
        <h2 className="text-xl font-bold mb-4 uppercase tracking-widest text-cyan-500">Güven & Tarafsızlık</h2>
        <p className="text-zinc-500 text-sm leading-loose italic">
          RefereeLig, hakem kararlarını bağımsız bir gözle değerlendirmek amacıyla kurulmuştur. Platformda paylaşılan görüşler Trio yorumcularının kişisel analizleri olup, Türkiye Futbol Federasyonu (TFF) veya resmi kurulların bağlayıcı kararlarını temsil etmez. Tüm analizler şeffaflık ve adil oyun kültürünü desteklemek için sunulmaktadır.
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 border-t border-white/5 bg-[#02040a]">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
        <div>
          <h2 className="text-2xl font-black tracking-tighter">REFEREE<span className="text-cyan-500">LIG</span></h2>
          <p className="text-zinc-600 text-[10px] mt-2 font-mono uppercase tracking-[0.3em]">Precision Analysis for the Beautiful Game</p>
        </div>

        <div className="flex flex-wrap justify-center gap-8 text-[11px] font-bold text-zinc-400 uppercase tracking-widest">
          <Link href="#" className="hover:text-cyan-500 transition-colors">Ana Sayfa</Link>
          <Link href="#" className="hover:text-cyan-500 transition-colors">Maçlar</Link>
          <Link href="#" className="hover:text-cyan-500 transition-colors">Hakemler</Link>
          <Link href="#" className="hover:text-cyan-500 transition-colors">Yorumcular</Link>
          <Link href="#" className="hover:text-cyan-500 transition-colors">İletişim</Link>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 text-center mt-12 text-[10px] text-zinc-700 font-mono">
        © {new Date().getFullYear()} REFEREELIG // ALL SYSTEM PROTOCOLS SECURED
      </div>
    </footer>
  );
}
