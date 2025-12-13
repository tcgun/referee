"use client";

import { useEffect, useState } from 'react';
import { collection, getDocs, collectionGroup, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/firebase/client';
import { TrioSection, GeneralCommentsSection, PfdkSection, StatementsSection, StandingsSection } from '@/components/home/DashboardWidgets';
import Link from 'next/link';

export default function Home() {
  const [trioGrouped, setTrioGrouped] = useState<any[]>([]);
  const [generalGrouped, setGeneralGrouped] = useState<any[]>([]);
  const [pfdkActions, setPfdkActions] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [standings, setStandings] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        // Helper to group opinions by match
        const groupOpinions = async (querySnapshot: any) => {
          const groups: { [key: string]: any } = {};

          // 1. Group by MatchID from Ref Path
          for (const d of querySnapshot.docs) {
            // Path: matches/{matchId}/incidents/{incId}/opinions/{opId}
            const matchId = d.ref.path.split('/')[1];
            if (!groups[matchId]) {
              groups[matchId] = { matchId, matchName: 'Yükleniyor...', opinions: [] };
            }
            groups[matchId].opinions.push(d.data());
          }

          // 2. Fetch Match Names
          const matchIds = Object.keys(groups);
          if (matchIds.length > 0) {
            // For now, fetch individually or promise.all (efficient enough for small N)
            const { doc, getDoc } = await import('firebase/firestore');
            await Promise.all(matchIds.map(async (mid) => {
              try {
                const mSnap = await getDoc(doc(db, 'matches', mid));
                if (mSnap.exists()) {
                  const mData = mSnap.data();
                  groups[mid].matchName = `${mData.homeTeamName} - ${mData.awayTeamName}`;
                }
              } catch (e) { console.error('Match name fetch err', e) }
            }));
          }

          return Object.values(groups);
        };

        // 1. Fetch Trio Opinions (Global)
        const trioQ = query(collectionGroup(db, 'opinions'), where('type', '==', 'trio'), limit(20));
        const trioSnap = await getDocs(trioQ);
        setTrioGrouped(await groupOpinions(trioSnap));

        // 2. Fetch General Opinions
        const genQ = query(collectionGroup(db, 'opinions'), where('type', '==', 'general'), limit(20));
        const genSnap = await getDocs(genQ);
        setGeneralGrouped(await groupOpinions(genSnap));

        // 3. PFDK
        const pfdkSnap = await getDocs(collection(db, 'disciplinary_actions'));
        setPfdkActions(pfdkSnap.docs.map(d => d.data()));

        // 4. Statements
        const stmtSnap = await getDocs(collection(db, 'statements'));
        setStatements(stmtSnap.docs.map(d => d.data()));

        // 5. Standings
        const standSnap = await getDocs(collection(db, 'standings'));
        setStandings(standSnap.docs.map(d => d.data()));

      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50 text-gray-500">Yükleniyor...</div>;

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-8 space-y-6">
      <header className="flex justify-between items-center bg-white p-4 rounded shadow-sm border-b-4 border-red-600">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">REFEREE <span className="text-red-600">LIG</span></h1>
          <p className="text-xs text-gray-500">Süper Lig Hakem Analiz Platformu</p>
        </div>
        {/* Temporary Navigation to Match for Demo */}
        <Link href="/matches/week1-gfk-gs" className="bg-red-600 text-white px-4 py-2 rounded font-bold text-sm hover:bg-red-700 transition">
          Haftanın Maçı &rarr;
        </Link>
      </header>

      {/* Top Row: 3 Columns (Trio, Statements, General) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[500px]">
        <TrioSection groupedOpinions={trioGrouped} />
        <StatementsSection statements={statements.filter(s => !s.title.toLowerCase().includes('pfdk'))} />
        <GeneralCommentsSection groupedOpinions={generalGrouped} />
      </div>

      {/* Bottom Row: 2 Columns (PFDK, Standings) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <PfdkSection
            actions={pfdkActions}
            statements={statements.filter(s => s.title.toLowerCase().includes('pfdk'))}
          />
        </div>
        <div>
          <StandingsSection standings={standings} />
        </div>
      </div>

      <div className="text-center p-4 text-xs text-gray-400 mt-8">
        <p>Bu platformdaki veriler tamamen demo amaçlıdır. Gerçek kurum ve kişilerle ilgisi olmayabilir.</p>
      </div>
    </main>
  );
}
