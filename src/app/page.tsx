import { supabase } from '@/lib/supabase';
import { createClient } from '@/lib/supabase-server';
import CampFilters from '@/components/CampFilters';
import Navbar from '@/components/Navbar';
import { MapPin, Calendar, Clock, Lock } from 'lucide-react';

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    q?: string;
    age?: string;
    week?: string;
    neighborhood?: string;
    activity?: string;
    payment?: string;
  }>;
}

export default async function HomePage({ searchParams }: PageProps) {
  const params = await searchParams;

  // 1. Check User & Season Pass Status
  const serverSupabase = await createClient();
  const {
    data: { user },
  } = await serverSupabase.auth.getUser();

  let hasSeasonPass = false;
  if (user) {
    const { data: profile } = await serverSupabase
      .from('profiles')
      .select('has_season_pass')
      .eq('id', user.id)
      .single();
    hasSeasonPass = Boolean(profile?.has_season_pass);
  }

  // 2. Build Query
  let query = supabase
    .from('sessions')
    .select(`
      id,
      title,
      activity_type,
      neighborhood,
      week_label,
      date_display,
      start_time,
      end_time,
      duration_type,
      min_age,
      max_age,
      price,
      registration_status,
      registration_url,
      special_notes,
      organizers (
        name,
        website_url
      )
    `)
    .eq('is_published', true);

  if (params.q) query = query.ilike('title', `%${params.q}%`);
  if (params.age) {
    const ageNum = parseFloat(params.age);
    query = query.lte('min_age', ageNum).gte('max_age', ageNum);
  }
  if (params.week) query = query.eq('week_label', params.week);
  if (params.neighborhood) query = query.eq('neighborhood', params.neighborhood);
  if (params.activity) query = query.eq('activity_type', params.activity);

  const { data: sessions } = await query
    .order('week_label', { ascending: true })
    .order('title', { ascending: true })
    .limit(100);

  // Fetch filter options
  const [areasRes, weeksRes, typesRes] = await Promise.all([
    supabase.from('sessions').select('neighborhood').not('neighborhood', 'is', null),
    supabase.from('sessions').select('week_label').not('week_label', 'is', null),
    supabase.from('sessions').select('activity_type').not('activity_type', 'is', null),
  ]);

  const uniqueNeighborhoods = Array.from(
    new Set(areasRes.data?.map((r) => r.neighborhood).filter(Boolean))
  ).sort() as string[];

  const uniqueWeeks = Array.from(
    new Set(weeksRes.data?.map((r) => r.week_label).filter(Boolean))
  ).sort() as string[];

  const uniqueActivityTypes = Array.from(
    new Set(typesRes.data?.map((r) => r.activity_type).filter(Boolean))
  ).sort() as string[];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar user={user} hasPass={hasSeasonPass} />

      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {params.payment === 'success' && (
            <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-semibold text-center">
              🎉 Payment successful! You now have full access to all 2026 camp registration details.
            </div>
          )}

          {/* Value Prop Banner */}
          {!hasSeasonPass && (
            <div className="mb-6 p-5 bg-gradient-to-r from-indigo-900 to-indigo-800 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <div>
                <h2 className="text-base font-bold">West Seattle 2026 Summer Camp Directory</h2>
                <p className="text-xs text-indigo-200 mt-1 max-w-xl">
                  Browse all 1,000+ local camps for free. Unlock exact pricing, full daily schedules, and direct camp registration links with the one-time $20 Season Pass.
                </p>
              </div>
            </div>
          )}

          {/* Filters */}
          <CampFilters
            neighborhoods={uniqueNeighborhoods}
            weeks={uniqueWeeks}
            activityTypes={uniqueActivityTypes}
          />

          {/* Results Summary */}
          <div className="flex justify-between items-center mb-6">
            <p className="text-sm font-medium text-slate-500">
              Showing <span className="font-bold text-slate-800">{sessions?.length || 0}</span> camp sessions
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {sessions?.map((camp: any) => (
              <div
                key={camp.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <span className="text-xs font-semibold tracking-wide text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">
                      {camp.activity_type || 'General'}
                    </span>
                    {camp.registration_status && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                        {camp.registration_status}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">
                    {camp.title}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                    by {camp.organizers?.name || 'Local Organizer'}
                  </p>

                  <div className="mt-4 space-y-2 text-xs text-slate-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        <strong className="text-slate-700">{camp.week_label || 'Dates'}:</strong>{' '}
                        {camp.date_display || 'Varies'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>
                        {hasSeasonPass
                          ? camp.start_time && camp.end_time
                            ? `${camp.start_time} - ${camp.end_time}`
                            : camp.duration_type || 'Hours vary'
                          : camp.duration_type || 'Full / Half Day (Unlock hours)'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{camp.neighborhood || 'West Seattle'}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="w-3.5 text-center font-bold text-slate-400 text-[11px]">Yr</span>
                      <span>
                        Ages{' '}
                        {camp.min_age && camp.max_age
                          ? `${camp.min_age} - ${camp.max_age}`
                          : 'All ages'}
                      </span>
                    </div>
                  </div>

                  {camp.special_notes && (
                    <p className="mt-3 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg line-clamp-2">
                      {camp.special_notes}
                    </p>
                  )}
                </div>

                {/* Card Footer: Gated vs Unlocked */}
                <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block leading-none">Cost</span>
                    {hasSeasonPass ? (
                      <span className="text-base font-bold text-slate-900">
                        {camp.price ? `$${camp.price}` : 'TBA'}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400 italic">
                        Locked (Pass)
                      </span>
                    )}
                  </div>

                  {hasSeasonPass ? (
                    camp.registration_url && (
                      <a
                        href={camp.registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-2xs transition"
                      >
                        Register &rarr;
                      </a>
                    )
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 bg-slate-100 px-2.5 py-1 rounded-md">
                      <Lock className="w-3 h-3" />
                      Link Locked
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}