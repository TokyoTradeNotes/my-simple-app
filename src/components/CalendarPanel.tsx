import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Todo } from '../types';

interface CalendarPanelProps {
  todos: Todo[];
  onDaySelect: (date: string | null) => void;
  selectedDay: string | null;
}

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-rose-500',
  medium: 'bg-amber-500',
  low: 'bg-emerald-500',
};

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CalendarPanel({ todos, onDaySelect, selectedDay }: CalendarPanelProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Build a map: "YYYY-MM-DD" -> highest priority with a due task
  const dueDateMap: Record<string, 'high' | 'medium' | 'low'> = {};
  const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 };

  todos.forEach((t) => {
    if (!t.dueDate) return;
    const key = t.dueDate.slice(0, 10);
    if (!dueDateMap[key] || PRIORITY_ORDER[t.priority] < PRIORITY_ORDER[dueDateMap[key]]) {
      dueDateMap[key] = t.priority;
    }
  });

  const toKey = (d: number) =>
    `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="bg-primary-bg rounded-3xl border border-border p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar size={14} className="text-accent" />
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-text-muted/60">Calendar</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={prevMonth}
            className="p-1.5 text-text-muted hover:text-text-main hover:bg-secondary-bg rounded-lg transition-all"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs font-bold text-text-main px-1 min-w-[110px] text-center">{monthLabel}</span>
          <button
            onClick={nextMonth}
            className="p-1.5 text-text-muted hover:text-text-main hover:bg-secondary-bg rounded-lg transition-all"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-0.5">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-center text-[9px] font-bold uppercase tracking-widest text-text-muted/30 py-1">
            {d}
          </div>
        ))}

        {/* Day cells */}
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const key = toKey(day);
          const priority = dueDateMap[key];
          const isToday = key === todayKey;
          const isSelected = key === selectedDay;

          return (
            <button
              key={key}
              onClick={() => onDaySelect(isSelected ? null : key)}
              className={`relative flex flex-col items-center justify-center rounded-lg py-1.5 transition-all text-[11px] font-bold
                ${isSelected ? 'bg-accent text-white shadow-lg shadow-accent/20' : ''}
                ${isToday && !isSelected ? 'ring-1 ring-accent/40 text-accent' : ''}
                ${!isToday && !isSelected ? 'text-text-muted hover:bg-secondary-bg hover:text-text-main' : ''}
              `}
            >
              {day}
              {priority && (
                <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${PRIORITY_DOT[priority]} ${isSelected ? 'opacity-80' : ''}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 pt-1 border-t border-border">
        {(['high', 'medium', 'low'] as const).map((p) => (
          <div key={p} className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[p]}`} />
            <span className="text-[8px] uppercase tracking-widest font-bold text-text-muted/40">{p}</span>
          </div>
        ))}
        {selectedDay && (
          <button
            onClick={() => onDaySelect(null)}
            className="ml-auto text-[8px] uppercase tracking-widest font-bold text-rose-500 hover:text-rose-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
