"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, collectionGroup, query, where, limit, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { TrioSection, GeneralCommentsSection, PfdkSection, StatementsSection, StandingsSection } from '@/components/home/DashboardWidgets';
import { Opinion, DisciplinaryAction, Statement, Standing, Match } from '@/types';
import Link from 'next/link';

interface GroupedOpinion {
  matchId: string;
  matchName: string;
  opinions: Opinion[];
}

export default function Home() {
  const [trioGrouped, setTrioGrouped] = useState<GroupedOpinion[]>([]);
  const [generalGrouped, setGeneralGrouped] = useState<GroupedOpinion[]>([]);
  const [pfdkActions, setPfdkActions] = useState<DisciplinaryAction[]>([]);
  const [statements, setStatements] = useState<Statement[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const groupOpinions = async (querySnapshot: QuerySnapshot<DocumentData>) => {
          const groups: { [key: string]: GroupedOpinion } = {};
          for (const d of querySnapshot.docs) {
            const matchId = d.ref.path.split('/')[1];
            if (!groups[matchId]) {
              groups[matchId] = { matchId, matchName: 'Yükleniyor...', opinions: [] };
            }
            const opinionData = d.data() as Opinion;
            groups[matchId].opinions.push(opinionData);
          }
          const matchIds = Object.keys(groups);
          if (matchIds.length > 0) {
            const { doc, getDoc } = await import('firebase/firestore');
            await Promise.all(matchIds.map(async (mid) => {
              try {
                const mSnap = await getDoc(doc(db, 'matches', mid));
                if (mSnap.exists()) {
                  const mData = mSnap.data() as Match;
                  groups[mid].matchName = `${mData.homeTeamName} - ${mData.awayTeamName}`;
                }
              } catch (e) { console.error('Match name fetch err', e) }
            }));
          }
          return Object.values(groups);
        };

        const trioQ = query(collectionGroup(db, 'opinions'), where('type', '==', 'trio'), limit(20));
        const trioSnap = await getDocs(trioQ);
        setTrioGrouped(await groupOpinions(trioSnap));

        const genQ = query(collectionGroup(db, 'opinions'), where('type', '==', 'general'), limit(20));
        const genSnap = await getDocs(genQ);
        setGeneralGrouped(await groupOpinions(genSnap));

        const pfdkSnap = await getDocs(collection(db, 'disciplinary_actions'));
        setPfdkActions(pfdkSnap.docs.map(d => d.data() as DisciplinaryAction));

        const stmtSnap = await getDocs(collection(db, 'statements'));
        setStatements(stmtSnap.docs.map(d => d.data() as Statement));

        const standSnap = await getDocs(collection(db, 'standings'));
        setStandings(standSnap.docs.map(d => d.data() as Standing));

      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-medium">Veriler Yükleniyor...</span>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-800 text-white pb-24 pt-10 px-4 md:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <header className="flex justify-between items-center mb-12">
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tighter">
                REFEREE<span className="text-primary">LIG</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">Süper Lig Hakem Performans Analizi</p>
            </div>
          </header>

          <div className="glass-panel p-1 rounded-2xl border border-white/10 max-w-2xl">
            <div className="bg-slate-950/80 rounded-xl p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <span className="inline-block px-3 py-1 bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider rounded-full mb-3">
                  Haftanın Maçı
                </span>
                <h2 className="text-2xl font-bold mb-1">Gaziantep FK - Galatasaray</h2>
                <div className="flex items-center justify-center md:justify-start gap-4 text-sm text-slate-400">
                  <span>Ali Şansalan</span>
                  <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                  <span>19.00</span>
                </div>
              </div>
              <Link
                href="/matches/week1-gfk-gs"
                className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-lg font-bold transition-all shadow-lg hover:shadow-primary/25 whitespace-nowrap"
              >
                Analize Git &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-16 relative z-20 space-y-8">

        {/* Top Row: Opinions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 h-[500px]">
            <TrioSection groupedOpinions={trioGrouped} />
          </div>
          <div className="lg:col-span-1 h-[500px]">
            <StatementsSection statements={statements.filter(s => !s.title.toLowerCase().includes('pfdk'))} />
          </div>
          <div className="lg:col-span-1 h-[500px]">
            <GeneralCommentsSection groupedOpinions={generalGrouped} />
          </div>
        </div>

        {/* Bottom Row: PFDK & Standings */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PfdkSection
              actions={pfdkActions}
              statements={statements.filter(s => s.title.toLowerCase().includes('pfdk'))}
            />
          </div>
          <div className="lg:col-span-1">
            <StandingsSection standings={standings} />
          </div>
        </div>

        <div className="text-center py-8 text-xs text-muted-foreground border-t border-border mt-8">
          <p>Bu platformdaki veriler tamamen demo amaçlıdır. Gerçek kurum ve kişilerle ilgisi olmayabilir.</p>
        </div>
      </div>
    </main>
  );
}
