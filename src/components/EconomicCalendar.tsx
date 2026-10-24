import React, { useState } from 'react';
import {
  Clock,
  Flame,
} from 'lucide-react';
import { EconomicEvent } from '../types/forex';

interface EconomicCalendarProps {
  events: EconomicEvent[];
}

export const EconomicCalendar: React.FC<EconomicCalendarProps> = ({ events }) => {
  const [filterImpact, setFilterImpact] = useState<'all' | 'high' | 'medium'>('all');
  const [filterDate, setFilterDate] = useState<'all' | 'Today' | 'Tomorrow'>('all');

  const filteredEvents = events.filter((evt) => {
    const matchesImpact = filterImpact === 'all' || evt.impact === filterImpact;
    const matchesDate = filterDate === 'all' || evt.date === filterDate;
    return matchesImpact && matchesDate;
  });

  return (
    <section id="calendar" className="py-14 bg-zinc-50 border-b border-zinc-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-rose-600 uppercase tracking-widest mb-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              <span>GLOBAL MACRO DATA RELEASE FEED</span>
            </div>
            <h2 className="text-3xl font-extrabold text-[#191919] tracking-tight">
              Forex Economic Calendar
            </h2>
            <p className="text-zinc-600 text-sm mt-1">
              Live updates on central bank decisions, CPI inflation prints, interest rates, and employment reports.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-white p-1 rounded-xl border border-zinc-200">
              <button
                onClick={() => setFilterImpact('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  filterImpact === 'all' ? 'bg-[#191919] text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                All Events
              </button>
              <button
                onClick={() => setFilterImpact('high')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center gap-1 ${
                  filterImpact === 'high' ? 'bg-rose-600 text-white' : 'text-rose-700 hover:bg-rose-50'
                }`}
              >
                <Flame className="w-3 h-3" />
                <span>High Impact Only</span>
              </button>
            </div>

            <div className="flex bg-white p-1 rounded-xl border border-zinc-200">
              <button
                onClick={() => setFilterDate('all')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  filterDate === 'all' ? 'bg-[#191919] text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                All Days
              </button>
              <button
                onClick={() => setFilterDate('Today')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  filterDate === 'Today' ? 'bg-[#191919] text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setFilterDate('Tomorrow')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                  filterDate === 'Tomorrow' ? 'bg-[#191919] text-white' : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                Tomorrow
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Time (GMT)</th>
                  <th className="py-3 px-4">Currency</th>
                  <th className="py-3 px-4">Impact</th>
                  <th className="py-3 px-4">Event Description</th>
                  <th className="py-3 px-4">Actual</th>
                  <th className="py-3 px-4">Forecast</th>
                  <th className="py-3 px-4">Previous</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 text-sm">
                {filteredEvents.map((evt) => {
                  const isHigh = evt.impact === 'high';
                  const isMedium = evt.impact === 'medium';
                  return (
                    <tr key={evt.id} className="hover:bg-zinc-50/80 transition">
                      <td className="py-3.5 px-4 font-mono text-xs font-semibold text-zinc-900 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-zinc-400" />
                          <span>{evt.time}</span>
                          <span className="text-[10px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded ml-1">
                            {evt.date}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-zinc-800">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{evt.flag}</span>
                          <span className="font-mono text-xs">{evt.currency}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            isHigh
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : isMedium
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                          }`}
                        >
                          {isHigh && <Flame className="w-3 h-3 fill-rose-500 text-rose-500" />}
                          <span>{evt.impact}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-zinc-900">
                        {evt.title}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        {evt.actual ? (
                          <span
                            className={`px-2 py-0.5 rounded text-xs ${
                              evt.outcome === 'better'
                                ? 'bg-emerald-100 text-emerald-800'
                                : evt.outcome === 'worse'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-zinc-100 text-zinc-800'
                            }`}
                          >
                            {evt.actual}
                          </span>
                        ) : (
                          <span className="text-zinc-400 text-xs italic">Pending</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-zinc-600">
                        {evt.forecast}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs text-zinc-500">
                        {evt.previous}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
};
