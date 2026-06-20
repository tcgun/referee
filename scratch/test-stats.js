const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Simple helper to load .env.local manually without dotenv dependency
function loadEnvLocal() {
    const envPath = path.join(__dirname, '../.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('.env.local file not found!');
        return;
    }
    const content = fs.readFileSync(envPath, 'utf8');
    content.split('\n').forEach(line => {
        const cleanLine = line.trim();
        if (!cleanLine || cleanLine.startsWith('#')) return;
        const index = cleanLine.indexOf('=');
        if (index === -1) return;
        const key = cleanLine.substring(0, index).trim();
        let val = cleanLine.substring(index + 1).trim();
        // Remove quotes if any
        if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
        } else if (val.startsWith("'") && val.endsWith("'")) {
            val = val.substring(1, val.length - 1);
        }
        process.env[key] = val;
    });
}

loadEnvLocal();

const privateKey = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
  : undefined;

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });
}

const db = admin.firestore();

// Replication of stats API logic
const makeAcc = () => ({
    totalYellowCards: 0,
    totalRedCards: 0,
    totalFouls: 0,
    totalGoals: 0,
    totalHomeGoals: 0,
    totalAwayGoals: 0,
    totalHomeFouls: 0,
    totalAwayFouls: 0,
    totalHomeYellow: 0,
    totalAwayYellow: 0,
    totalHomeRed: 0,
    totalAwayRed: 0,
    ballInPlaySeconds: 0,
    ballInPlayMatchCount: 0,
    matchesWithYellow: 0,
    matchesWithRed: 0,
    matchesWithGoals: 0,
    refMatchCount: 0,
    weeklyGoals: [],
    totalPenalties: 0,
    totalVarInterventions: 0,
    varConfirmedCount: 0,
    varReversedCount: 0,
    varByType: { penalty: 0, red_card: 0, goal_cancelled: 0, other: 0 },
});

const parseBallInPlay = (value) => {
    if (!value) return null;
    const mainPart = value.includes('/') ? value.split('/')[0].trim() : value;
    const parts = mainPart.split(':');
    if (parts.length !== 2) return null;
    const mins = parseInt(parts[0], 10);
    const secs = parseInt(parts[1], 10);
    if (isNaN(mins) || isNaN(secs)) return null;
    return mins * 60 + secs;
};

const accumulateMatchStats = (stat, match) => {
    const acc = stat.acc;
    acc.refMatchCount++;

    const ms = match.stats;
    const rs = match.refereeStats;

    // --- Goals ---
    const hGoals = match.homeScore ?? 0;
    const aGoals = match.awayScore ?? 0;
    const totalGoals = hGoals + aGoals;
    acc.totalGoals += totalGoals;
    acc.totalHomeGoals += hGoals;
    acc.totalAwayGoals += aGoals;
    if (totalGoals > 0) acc.matchesWithGoals++;
    if (match.week) acc.weeklyGoals.push({ week: match.week, goals: totalGoals });

    // --- Cards ---
    const hYellow = ms?.homeYellowCards ?? 0;
    const aYellow = ms?.awayYellowCards ?? 0;
    const hRed = ms?.homeRedCards ?? 0;
    const aRed = ms?.awayRedCards ?? 0;

    const totalYellow = (hYellow + aYellow) > 0
        ? hYellow + aYellow
        : (rs?.yellowCards ?? 0);
    const totalRed = (hRed + aRed) > 0
        ? hRed + aRed
        : (rs?.redCards ?? 0);

    acc.totalYellowCards += totalYellow;
    acc.totalRedCards += totalRed;
    acc.totalHomeYellow += hYellow;
    acc.totalAwayYellow += aYellow;
    acc.totalHomeRed += hRed;
    acc.totalAwayRed += aRed;

    if (totalYellow > 0) acc.matchesWithYellow++;
    if (totalRed > 0) acc.matchesWithRed++;

    // --- Fouls ---
    const hFouls = ms?.homeFouls ?? 0;
    const aFouls = ms?.awayFouls ?? 0;
    const totalFouls = (hFouls + aFouls) > 0
        ? hFouls + aFouls
        : (rs?.fouls ?? 0);

    acc.totalFouls += totalFouls;
    acc.totalHomeFouls += hFouls;
    acc.totalAwayFouls += aFouls;

    // --- Ball in play ---
    const bip = parseBallInPlay(rs?.ballInPlayTime);
    if (bip !== null) {
        acc.ballInPlaySeconds += bip;
        acc.ballInPlayMatchCount++;
    }

    // --- Penalties ---
    if (rs?.penalties) {
        acc.totalPenalties += rs.penalties;
    }

    // --- VAR Interventions ---
    if (rs?.varInterventions && rs.varInterventions.length > 0) {
        rs.varInterventions.forEach(v => {
            acc.totalVarInterventions++;
            if (v.decision === 'confirmed') acc.varConfirmedCount++;
            else if (v.decision === 'reversed') acc.varReversedCount++;
            const t = v.type;
            if (t in acc.varByType) acc.varByType[t]++;
        });
    }
};

async function test() {
  try {
    const season = '2025-2026';
    const matchesSnap = await db.collection('matches').get();
    let matches = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    matches = matches.filter(m => (m.season || '2025-2026') === season);

    const refereeStats = {};

    for (const match of matches) {
      const referee = match.referee;
      if (referee) {
        const cleanName = referee.trim();
        if (!refereeStats[cleanName]) {
          refereeStats[cleanName] = {
            name: cleanName,
            matches: 0,
            roles: { referee: 0, assistant: 0, fourth: 0, var: 0, avar: 0 },
            errors: 0, controversial: 0, correct: 0,
            teamCounts: {},
            acc: makeAcc(),
          };
        }
        const stat = refereeStats[cleanName];
        stat.roles.referee++;
        stat.matches++;
        
        accumulateMatchStats(stat, match);
      }
    }
    console.log('Success! No errors encountered in loop.');
  } catch (err) {
    console.error('CRASHED WITH ERROR:');
    console.error(err);
  }
}

test();
