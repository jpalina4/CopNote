/**
 * Sample data for demonstration, inserted once when the database is created.
 *
 * The first account uses the project author's name, rank and regimental
 * number. All other people, officers and incidents are FICTIONAL. Place names are real
 * PNG suburbs and towns so the examples feel realistic, but no real case is
 * described.
 *
 * Demo logins (shown on the login screen):
 *   Regimental no. 16237       PIN 2580  — Constable Johnson PALINA, Boroko
 *   Regimental no. RPNGC-7731  PIN 1357  — Sergeant Grace Waim, Lae (Top Town)
 */
import { createPinRecord } from '../services/authService';
import { toDateString, toTimestamp } from '../utils/dates';
import { insertOfficer } from './officerRepo';

const DEMO_OFFICERS = [
  { fullName: 'Johnson PALINA', regimentalNumber: '16237', rank: 'Constable', station: 'Boroko Police Station', pin: '2580' },
  { fullName: 'Grace Waim', regimentalNumber: 'RPNGC-7731', rank: 'Sergeant', station: 'Lae Top Town Police Station', pin: '1357' },
];

/** Date N days before today, as 'YYYY-MM-DD' and a matching timestamp. */
const daysAgo = (n, hh = 9, mm = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hh, mm, 0, 0);
  return { date: toDateString(d), stamp: toTimestamp(d) };
};

// Pages for the first demo officer. Order matters: page numbers follow it.
const JOHNSON_PAGES = [
  {
    ago: 6, time: '08:40', status: 'saved',
    title: 'Market stall theft – Gordons Market',
    location: 'Gordons Market, Port Moresby',
    type: 'Theft',
    people: 'Complainant: female stall holder (betel nut and garden produce). Suspect: unknown male, approx. 20 years, red cap.',
    description: 'Complainant reported cash tin taken from her stall at approx. 08:15 while she served customers. Witnesses saw a young male run toward the PMV stop.',
    action: 'Statement taken from complainant and one witness. Area patrolled, suspect not located. Complainant advised to attend Boroko station for formal report.',
  },
  {
    ago: 4, time: '17:25', status: 'saved',
    title: 'Two-vehicle collision – Waigani Drive',
    location: 'Waigani Drive near the Vision City roundabout',
    type: 'Traffic accident',
    people: 'Driver 1: PMV Route 9 driver. Driver 2: private sedan driver. No injuries reported.',
    description: 'Rear-end collision in heavy traffic. Sedan stopped suddenly; PMV unable to stop in time. Minor damage to sedan rear bumper and PMV front grille.',
    action: 'Traffic directed until vehicles moved. Licences and registration sighted and recorded. Both parties given incident reference.',
  },
  {
    ago: 2, time: '21:10', status: 'saved',
    title: 'Noise complaint and dispute – Gerehu Stage 2',
    location: 'Gerehu Stage 2, Port Moresby',
    type: 'Domestic dispute',
    people: 'Two neighbouring households (adults). Names recorded in station occurrence book.',
    description: 'Neighbours reported loud argument and shouting. On arrival the parties had separated. Dispute concerned a shared boundary fence.',
    action: 'Both parties spoken to and calmed. Advised on mediation through the ward councillor. No further police action required.',
  },
  {
    ago: 0, time: '10:05', status: 'draft',
    title: 'Broken window – Boroko shop',
    location: 'Boroko town, near the post office',
    type: 'Property damage',
    people: 'Shop manager (complainant).',
    description: 'Front window found smashed when shop opened.',
    action: '',
  },
];

const GRACE_PAGES = [
  {
    ago: 1, time: '13:30', status: 'saved',
    title: 'Lost passport handed in – Lae Main Market',
    location: 'Lae Main Market',
    type: 'Other',
    people: 'Finder: market vendor.',
    description: 'Vendor handed in a PNG passport found near the bus stop. Owner not present.',
    action: 'Passport logged as found property and secured at Top Town station. Owner to be contacted.',
  },
];

const insertSeedPages = async (db, officerId, pages) => {
  let pageNumber = 0;
  for (const p of pages) {
    const { date, stamp } = daysAgo(p.ago, ...p.time.split(':').map(Number));
    const isSaved = p.status === 'saved';
    if (isSaved) pageNumber += 1;
    await db.runAsync(
      `INSERT INTO pages
         (officer_id, page_number, title, incident_date, incident_time, location, incident_type,
          people_involved, description, action_taken, status, created_at, updated_at, saved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        officerId, isSaved ? pageNumber : null, p.title, date, p.time, p.location, p.type,
        p.people, p.description, p.action || null, p.status, stamp, stamp, isSaved ? stamp : null,
      ],
    );
  }
};

export async function seedDatabase(db) {
  const ids = [];
  for (const { pin, ...officer } of DEMO_OFFICERS) {
    const pinRecord = await createPinRecord(pin);
    ids.push(await insertOfficer(db, { ...officer, ...pinRecord, createdAt: toTimestamp() }));
  }
  const [johnsonId, graceId] = ids;
  await insertSeedPages(db, johnsonId, JOHNSON_PAGES);
  await insertSeedPages(db, graceId, GRACE_PAGES);

  // An example amendment on Johnson's page 1, showing how corrections are recorded.
  const first = await db.getFirstAsync('SELECT id FROM pages WHERE officer_id = ? AND page_number = 1', [johnsonId]);
  await db.runAsync('INSERT INTO amendments (page_id, officer_id, note, created_at) VALUES (?, ?, ?, ?)', [
    first.id,
    johnsonId,
    'Correction: suspect was wearing a BLUE cap, not red, per second witness interviewed later the same day.',
    daysAgo(6, 15, 20).stamp,
  ]);
}
