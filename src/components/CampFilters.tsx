'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { Search, RotateCcw } from 'lucide-react';

interface FilterProps {
  neighborhoods: string[];
  weeks: string[];
  activityTypes: string[];
}

export default function CampFilters({
  neighborhoods,
  weeks,
  activityTypes,
}: FilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSearch = searchParams.get('q') || '';
  const currentAge = searchParams.get('age') || '';
  const currentWeek = searchParams.get('week') || '';
  const currentNeighborhood = searchParams.get('neighborhood') || '';
  const currentActivity = searchParams.get('activity') || '';

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function clearAll() {
    startTransition(() => {
      router.push(pathname);
    });
  }

  const hasActiveFilters = Boolean(
    currentSearch || currentAge || currentWeek || currentNeighborhood || currentActivity
  );

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-8 space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by camp name, topic, or organizer..."
          defaultValue={currentSearch}
          onChange={(e) => updateFilter('q', e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
        />
      </div>

      {/* Dropdown Filters Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Child's Age */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Child's Age
          </label>
          <select
            value={currentAge}
            onChange={(e) => updateFilter('age', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="">Any Age</option>
            {Array.from({ length: 14 }, (_, i) => i + 3).map((age) => (
              <option key={age} value={age}>
                {age} years old
              </option>
            ))}
          </select>
        </div>

        {/* Camp Week */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Camp Week
          </label>
          <select
            value={currentWeek}
            onChange={(e) => updateFilter('week', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="">All Weeks</option>
            {weeks.map((week) => (
              <option key={week} value={week}>
                {week}
              </option>
            ))}
          </select>
        </div>

        {/* Neighborhood */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Neighborhood
          </label>
          <select
            value={currentNeighborhood}
            onChange={(e) => updateFilter('neighborhood', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="">All Areas</option>
            {neighborhoods.map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </select>
        </div>

        {/* Activity Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            Category
          </label>
          <select
            value={currentActivity}
            onChange={(e) => updateFilter('activity', e.target.value)}
            className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-700"
          >
            <option value="">All Categories</option>
            {activityTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clear Filters bar */}
      {hasActiveFilters && (
        <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500">
            {isPending ? 'Filtering...' : 'Filters active'}
          </span>
          <button
            onClick={clearAll}
            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset all filters
          </button>
        </div>
      )}
    </div>
  );
}