"use client";

import { useEffect, useState } from 'react';
import { TrioSection, GeneralCommentsSection, PfdkSection, StatementsSection } from '@/components/home/DashboardWidgets';
import { StandingsTicker } from '@/components/home/StandingsTicker';
import { SummaryStatsRow } from '@/components/home/SummaryStatsRow';
import { Opinion, DisciplinaryAction, Statement, Standing } from '@/types';
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

import { Skeleton } from '@/components/ui/Skeleton';

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
        const res = await fetch('/api/public/home');
        if (!res.ok) throw new Error('Failed to fetch home data');
        const data = await res.json();
        
        setTrioGrouped(data.trioGrouped || []);
        setGeneralGrouped(data.generalGrouped || []);
        setPfdkActions(data.pfdkActions || []);
        setStatements(data.statements || []);
        setStandings(data.standings || []);
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return (
    <main className="min-h-screen bg-background pb-20 pt-8">
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-[450px] bg-card border border-border rounded-2xl p-4 space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="w-5 h-5 rounded-md" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="space-y-4">
                <Skeleton className="h-[100px] w-full rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen bg-black pb-20 pt-8">
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-6">

        {/* Simple Header instead of Hero */}


        {/* Standings Ticker */}
        <StandingsTicker standings={standings} />

        {/* Summary Widgets */}
        <SummaryStatsRow />

        {/* 4 Main Sections + Standings Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <div className="text-center py-6 text-[10px] text-muted-foreground border-t border-border mt-12">
          <p>Bu platformdaki veriler tamamen demo amaçlıdır. Gerçek lig verileriyle eşleşmeyebilir.</p>
        </div>
      </div>
    </main>
  );
}
