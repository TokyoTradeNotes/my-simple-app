/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { Plus, Calendar, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Priority } from '../types';

interface AddTodoProps {
  onAdd: (text: string, priority: Priority, dueDate?: string) => void;
}

export default function AddTodo({ onAdd }: AddTodoProps) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onAdd(text.trim(), priority, dueDate || undefined);
      setText('');
      setPriority('medium');
      setDueDate('');
    }
  };

  const priorityColors = {
    low: 'bg-emerald-500',
    medium: 'bg-amber-500',
    high: 'bg-rose-500',
  };

  const setQuickDate = (offset: { days?: number; months?: number; years?: number }) => {
    const d = new Date();
    if (offset.days) d.setDate(d.getDate() + offset.days);
    if (offset.months) d.setMonth(d.getMonth() + offset.months);
    if (offset.years) d.setFullYear(d.getFullYear() + offset.years);
    setDueDate(d.toISOString().slice(0, 10));
  };

  const toISODate = (d: Date) => d.toISOString().slice(0, 10);

  const quickDates = [
    { label: '1W', offset: { days: 7 } },
    { label: '1M', offset: { months: 1 } },
    { label: '1Y', offset: { years: 1 } },
  ].map(({ label, offset }) => {
    const d = new Date();
    if (offset.days) d.setDate(d.getDate() + offset.days);
    if (offset.months) d.setMonth(d.getMonth() + offset.months);
    if (offset.years) d.setFullYear(d.getFullYear() + offset.years);
    return { label, value: toISODate(d) };
  });

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="relative group">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a new task for today..."
          className="w-full pl-6 pr-14 py-5 bg-secondary-bg rounded-2xl border border-border focus:border-accent/40 focus:outline-none transition-all placeholder:text-text-muted/40 text-lg font-medium shadow-inner"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          type="submit"
          disabled={!text.trim()}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-accent text-white rounded-xl disabled:opacity-20 disabled:cursor-not-allowed transition-all shadow-lg shadow-accent/20 hover:bg-accent/80"
        >
          <Plus size={20} strokeWidth={3} />
        </motion.button>
      </form>
      
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-text-muted/40 px-2 leading-none">Priority</span>
          <div className="flex gap-2 p-1 bg-secondary-bg rounded-xl border border-border">
            {(['low', 'medium', 'high'] as Priority[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  priority === p 
                    ? `${priorityColors[p]} text-white shadow-lg` 
                    : 'text-text-muted/60 hover:text-text-main hover:bg-primary-bg'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-text-muted/40 px-2 leading-none">Due Date</span>
          <div className="relative flex items-center bg-secondary-bg rounded-xl border border-border px-3 py-1.5 group/date">
            <Calendar size={14} className="text-text-muted/60 mr-2" />
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-text-main focus:outline-none [color-scheme:dark]"
            />
            {dueDate && (
              <button
                type="button"
                onClick={() => setDueDate('')}
                className="ml-2 text-text-muted hover:text-rose-500 transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <div className="flex gap-1.5">
            {quickDates.map(({ label, value }) => (
              <button
                key={label}
                type="button"
                onClick={() => setDueDate(value)}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${
                  dueDate === value
                    ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20'
                    : 'bg-secondary-bg border-border text-text-muted/60 hover:text-text-main hover:border-accent/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
