"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, collectionGroup, query, where, limit, QuerySnapshot, DocumentData } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { TrioSection, GeneralCommentsSection, PfdkSection, StatementsSection, StandingsSection } from '@/components/home/DashboardWidgets';
import { SummaryStatsRow } from '@/components/home/SummaryStatsRow';
import { Opinion, DisciplinaryAction, Statement, Standing, Match } from '@/types';
import Link from 'next/link';

interface GroupedOpinion {
  matchId: string;
  matchName: string;
  week?: number;
  homeTeam?: string;
  awayTeam?: string;
  score?: string;
  opinions: Opinion[];
  againstCount?: number;
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
              groups[matchId] = { matchId, matchName: 'Yükleniyor...', opinions: [], againstCount: 0 };
            }
            const opinionData = d.data() as Opinion;
            groups[matchId].opinions.push(opinionData);
          }
          const matchIds = Object.keys(groups);
          if (matchIds.length > 0) {
            const { doc, getDoc, collection, getDocs } = await import('firebase/firestore');
            await Promise.all(matchIds.map(async (mid) => {
              try {
                // 1. Fetch Match Basic Info
                const mSnap = await getDoc(doc(db, 'matches', mid));
                if (mSnap.exists()) {
                  const mData = mSnap.data() as Match;
                  groups[mid].matchName = `${mData.week}. Hafta: ${mData.homeTeamName} - ${mData.awayTeamName}`;
                  groups[mid].week = mData.week;
                  groups[mid].homeTeam = mData.homeTeamName;
                  groups[mid].awayTeam = mData.awayTeamName;

                  // Fix: Handle scores properly
                  const hScore = mData.homeScore !== undefined ? mData.homeScore : '-';
                  const aScore = mData.awayScore !== undefined ? mData.awayScore : '-';
                  groups[mid].score = (hScore !== '-' || aScore !== '-') ? `${hScore} - ${aScore}` : (mData.score || 'v');
                }

                // 2. Fetch Incidents to count "Aleyhe" (Incorrect judgments)
                // A position is "against" if any critic in Trio says it's 'incorrect'
                const incSnap = await getDocs(collection(db, 'matches', mid, 'incidents'));
                let againstCount = 0;
                for (const incDoc of incSnap.docs) {
                  const opsSnap = await getDocs(collection(db, 'matches', mid, 'incidents', incDoc.id, 'opinions'));
                  const hasIncorrect = opsSnap.docs.some(o => o.data().judgment === 'incorrect');
                  if (hasIncorrect) againstCount++;
                }
                groups[mid].againstCount = againstCount;

              } catch (e) { console.error('Match data fetch err', e) }
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
    <main className="min-h-screen bg-background pb-20 pt-8">
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6">

        {/* Simple Header instead of Hero */}


        {/* Summary Widgets */}
        <SummaryStatsRow />

        {/* 4 Main Sections + Standings Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Left Area: 4 Widgets (2x2) */}
          <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div id="trio" className="scroll-mt-24 h-[450px]">
              <TrioSection groupedOpinions={trioGrouped} />
            </div>
            <div id="comments" className="scroll-mt-24 h-[450px]">
              <GeneralCommentsSection groupedOpinions={generalGrouped} />
            </div>
            <div id="pfdk" className="scroll-mt-24 h-[450px]">
              <PfdkSection actions={pfdkActions} statements={statements.filter(s => s.title.toLowerCase().includes('pfdk'))} />
            </div>
            <div id="statements" className="scroll-mt-24 h-[450px]">
              <StatementsSection statements={statements.filter(s => !s.title.toLowerCase().includes('pfdk'))} />
            </div>
          </div>

          {/* Right Area: Standings */}
          <div className="lg:col-span-1 h-full min-h-[500px]">
            <div className="sticky top-4 h-full">
              <StandingsSection standings={standings} />
            </div>
          </div>

        </div>

        <div className="text-center py-6 text-[10px] text-muted-foreground border-t border-border mt-12">
          <p>Bu platformdaki veriler tamamen demo amaçlıdır. Gerçek lig verileriyle eşleşmeyebilir.</p>
        </div>
      </div>
    </main>
  );
}
