import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to extract price as a clean number (e.g., "$410" -> 410)
function cleanPrice(rawPrice: string): number | null {
  if (!rawPrice) return null;
  const cleaned = rawPrice.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

// Helper function to extract clean numbers for age
function cleanNumber(val: string): number | null {
  if (!val) return null;
  const parsed = parseFloat(val.trim());
  return isNaN(parsed) ? null : parsed;
}

// Helper to parse dates like "2026 - Week 3 - Jul 6 - 10"
function parseDates(rawDates: string) {
  let weekLabel: string | null = null;
  let dateDisplay: string | null = null;

  if (rawDates) {
    const parts = rawDates.split(' - ').map((p) => p.trim());
    if (parts.length >= 3) {
      weekLabel = parts[1]; // "Week 3"
      dateDisplay = parts.slice(2).join(' - '); // "Jul 6 - 10"
    } else {
      dateDisplay = rawDates;
    }
  }

  return { weekLabel, dateDisplay };
}

async function runImport() {
  const csvFilePath = path.resolve(process.cwd(), 'camps.csv');

  if (!fs.existsSync(csvFilePath)) {
    console.error(`Could not find camps.csv at ${csvFilePath}`);
    process.exit(1);
  }

  console.log('Reading camps.csv...');
  const rows: any[] = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(csvFilePath)
      .pipe(csv())
      .on('data', (data) => rows.push(data))
      .on('end', resolve)
      .on('error', reject);
  });

  console.log(`Found ${rows.length} rows in CSV.`);

  // Step A: Extract all unique organizers and insert them
  const organizerMap = new Map<string, string>(); // Name -> UUID
  const uniqueOrganizers = new Map<string, string>(); // Name -> Website URL

  for (const row of rows) {
    const orgName = (row['Camp Organizer'] || row['Camp organizer'] || '').trim();
    const website = (row['URL'] || '').trim();
    if (orgName && !uniqueOrganizers.has(orgName)) {
      uniqueOrganizers.set(orgName, website);
    }
  }

  console.log(`Upserting ${uniqueOrganizers.size} unique organizers...`);

  for (const [name, website] of uniqueOrganizers.entries()) {
    const { data, error } = await supabase
      .from('organizers')
      .upsert({ name, website_url: website || null }, { onConflict: 'name' })
      .select('id, name')
      .single();

    if (error) {
      console.error(`Error saving organizer "${name}":`, error.message);
    } else if (data) {
      organizerMap.set(data.name, data.id);
    }
  }

  // Step B: Insert all sessions linked to their organizer
  console.log('Importing sessions...');
  let importedCount = 0;
  let errorCount = 0;

  for (const row of rows) {
    const orgName = (row['Camp Organizer'] || row['Camp organizer'] || '').trim();
    const organizerId = organizerMap.get(orgName) || null;
    const rawTimes = (row['Camp Times'] || '').trim();
    
    // Split times like "9am - 4pm"
    let startTime: string | null = null;
    let endTime: string | null = null;
    if (rawTimes.includes('-')) {
      const parts = rawTimes.split('-').map((t: string) => t.trim());
      startTime = parts[0] || null;
      endTime = parts[1] || null;
    } else if (rawTimes) {
      startTime = rawTimes;
    }

    const { weekLabel, dateDisplay } = parseDates(row['Dates'] || '');

    const sessionPayload = {
      legacy_wix_id: row['ID'] || null,
      title: row['Title'] || 'Untitled Camp',
      organizer_id: organizerId,
      activity_type: row['Type of Activity'] || null,
      neighborhood: row['Area'] || null,
      week_label: weekLabel,
      date_display: dateDisplay,
      start_time: startTime,
      end_time: endTime,
      duration_type: row['Half Day/Full Day'] || null,
      min_age: cleanNumber(row['minAge']),
      max_age: cleanNumber(row['maxAge']),
      price: cleanPrice(row['Price']),
      registration_status: row['Registration Status'] || 'Open',
      registration_date: row['Registration Date/Time'] || null,
      registration_url: row['URL'] || null,
      special_notes: row['Special Notes:'] || row['Special Notes'] || null,
      cancellation_policy: row['Cancellation Policy'] || null,
      promo_codes: row['Promo Codes'] || null,
      is_published: (row['Status'] || '').toUpperCase() === 'PUBLISHED',
      year: cleanNumber(row['Year of Information']) || 2026,
    };

    const { error } = await supabase
      .from('sessions')
      .upsert(sessionPayload, { onConflict: 'legacy_wix_id' });

    if (error) {
      console.error(`Error inserting session "${sessionPayload.title}":`, error.message);
      errorCount++;
    } else {
      importedCount++;
    }
  }

  console.log(`\nImport Complete!`);
  console.log(`- Successfully inserted/updated: ${importedCount} sessions`);
  console.log(`- Errors: ${errorCount}`);
}

runImport().catch((err) => {
  console.error('Fatal import error:', err);
  process.exit(1);
});