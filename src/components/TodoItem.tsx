/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Check, Trash2, Circle, Edit3, Calendar, Bell, Tag as TagIcon } from 'lucide-react';
import React from 'react';
import { Todo } from '../types';

function getDaysLeft(dueDate: string): { label: string; color: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: 'text-rose-500' };
  if (diff === 0) return { label: 'Today', color: 'text-amber-400' };
  if (diff === 1) return { label: '1 day left', color: 'text-amber-400' };
  if (diff <= 3) return { label: `${diff} days left`, color: 'text-amber-400' };
  return { label: `${diff} days left`, color: 'text-text-muted' };
}

const USER_COLORS: Record<string, string> = {
  Tokyo: 'from-violet-500 to-indigo-600',
  Hannah: 'from-pink-500 to-rose-500',
};

interface TodoItemProps {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
}

export default function TodoItem({ todo, onToggle, onDelete, onEdit }: TodoItemProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ scale: 1.005, backgroundColor: '#1C1C21' }}
      className="group flex items-center gap-4 p-5 bg-primary-bg rounded-2xl border border-border hover:border-accent/40 transition-all shadow-lg shadow-black/5"
    >
      <button
        onClick={() => onToggle(todo.id)}
        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
          todo.completed 
            ? 'bg-accent text-white shadow-lg shadow-accent/20' 
            : 'border-2 border-border hover:border-accent'
        }`}
      >
        {todo.completed ? <Check size={14} strokeWidth={4} /> : <Circle size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-accent" />}
      </button>

      <div className="flex-grow min-w-0 flex flex-col gap-1">
        <span 
          onClick={() => !todo.completed && onEdit()}
          className={`text-lg transition-all duration-300 break-words cursor-pointer ${
            todo.completed 
              ? 'text-text-muted line-through opacity-40 cursor-default' 
              : 'text-text-main font-medium hover:text-accent/80'
          }`}
        >
          {todo.text}
        </span>

        {todo.tags && todo.tags.length > 0 && !todo.completed && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {todo.tags.map(tag => (
              <span key={tag} className="flex items-center gap-1 text-[8px] uppercase tracking-tighter font-bold bg-accent/5 text-accent/60 px-1.5 py-0.5 rounded border border-accent/10 transition-all hover:bg-accent/10">
                <TagIcon size={8} />
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {todo.completed && (
          <div className="flex items-center gap-2 opacity-40">
            {todo.createdBy && (
              <div
                title={`Added by ${todo.createdBy}`}
                className={`w-4 h-4 rounded-full bg-gradient-to-br ${USER_COLORS[todo.createdBy] ?? 'from-slate-500 to-slate-600'} flex items-center justify-center text-[7px] font-bold text-white shrink-0`}
              >
                {todo.createdBy[0]}
              </div>
            )}
            {todo.completedAt && (
              <button
                onClick={onEdit}
                className="flex items-center gap-1.5 hover:opacity-70 transition-opacity group/time text-left"
              >
                <span className="text-[9px] uppercase tracking-wider font-bold text-text-muted group-hover/time:text-accent transition-colors">
                  Completed {new Date(todo.completedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </button>
            )}
          </div>
        )}
        
        {!todo.completed && (
          <div className="flex flex-wrap items-center gap-3">
            {todo.createdBy && (
              <div
                title={`Added by ${todo.createdBy}`}
                className={`w-5 h-5 rounded-full bg-gradient-to-br ${USER_COLORS[todo.createdBy] ?? 'from-slate-500 to-slate-600'} flex items-center justify-center text-[8px] font-bold text-white shrink-0`}
              >
                {todo.createdBy[0]}
              </div>
            )}
            <span className={`text-[9px] uppercase tracking-[0.15em] font-bold px-2 py-0.5 rounded-md border ${
              todo.priority === 'high' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
              todo.priority === 'medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
              'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            }`}>
              {todo.priority} Priority
            </span>
            
            {todo.dueDate && (() => {
              const { label, color } = getDaysLeft(todo.dueDate);
              return (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary-bg border border-border rounded-md shadow-sm">
                  <Calendar size={10} className="text-accent" />
                  <span className="text-[9px] uppercase tracking-wider font-bold text-text-muted">
                    {new Date(todo.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                  <span className={`text-[9px] uppercase tracking-wider font-bold ${color}`}>
                    · {label}
                  </span>
                </div>
              );
            })()}

            {todo.reminder && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-primary-bg border border-border rounded-md shadow-sm">
                <Bell size={10} className="text-amber-500" />
                <span className="text-[9px] uppercase tracking-wider font-bold text-text-muted">
                  {new Date(todo.reminder).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}

            {todo.subtasks && todo.subtasks.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-12 h-1 bg-secondary-bg rounded-full overflow-hidden border border-border">
                  <div 
                    className="h-full bg-accent transition-all duration-500" 
                    style={{ width: `${(todo.subtasks.filter(s => s.completed).length / todo.subtasks.length) * 100}%` }}
                  />
                </div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-text-muted">
                  {todo.subtasks.filter(s => s.completed).length}/{todo.subtasks.length} subtasks
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={onEdit}
          className="opacity-0 group-hover:opacity-100 p-2.5 text-text-muted hover:text-accent hover:bg-accent/10 rounded-xl transition-all"
          aria-label="Edit task"
        >
          <Edit3 size={18} />
        </button>
        <button
          onClick={() => onDelete(todo.id)}
          className="opacity-0 group-hover:opacity-100 p-2.5 text-text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
          aria-label="Delete todo"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </motion.div>
  );
}
