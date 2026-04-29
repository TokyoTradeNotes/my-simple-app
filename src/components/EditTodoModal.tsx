/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, Calendar, AlertCircle, Plus, Trash2, CheckCircle2, Circle, Bell, Tag as TagIcon, Clock } from 'lucide-react';
import { Todo, Priority, SubTask } from '../types';

const toDateTimeLocal = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

interface EditTodoModalProps {
  todo: Todo;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Todo>) => void;
}

export default function EditTodoModal({ todo, isOpen, onClose, onSave }: EditTodoModalProps) {
  const [text, setText] = useState(todo.text);
  const [priority, setPriority] = useState<Priority>(todo.priority);
  const [dueDate, setDueDate] = useState(todo.dueDate || '');
  const [reminder, setReminder] = useState(todo.reminder || '');
  const [tags, setTags] = useState<string[]>(todo.tags || []);
  const [newTag, setNewTag] = useState('');
  const [subtasks, setSubtasks] = useState<SubTask[]>(todo.subtasks || []);
  const [newSubtaskText, setNewSubtaskText] = useState('');
  const [completedAt, setCompletedAt] = useState(toDateTimeLocal(todo.completedAt));

  const handleSave = () => {
    if (text.trim()) {
      onSave(todo.id, {
        text: text.trim(),
        priority,
        dueDate: dueDate || null,
        reminder: reminder || null,
        tags,
        subtasks,
        ...(todo.completed && { completedAt: completedAt ? new Date(completedAt).toISOString() : todo.completedAt }),
      });
      onClose();
    }
  };

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim().toLowerCase()]);
      setNewTag('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const addSubtask = () => {
    if (newSubtaskText.trim()) {
      const newSubtask: SubTask = {
        id: crypto.randomUUID(),
        text: newSubtaskText.trim(),
        completed: false,
      };
      setSubtasks([...subtasks, newSubtask]);
      setNewSubtaskText('');
    }
  };

  const toggleSubtask = (id: string) => {
    setSubtasks(subtasks.map(st => 
      st.id === id ? { ...st, completed: !st.completed } : st
    ));
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const priorityColors = {
    low: 'bg-emerald-500',
    medium: 'bg-amber-500',
    high: 'bg-rose-500',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-secondary-bg/80 backdrop-blur-md z-50 flex items-center justify-center p-6"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none p-6"
          >
            <div className="bg-primary-bg w-full max-w-lg rounded-3xl border border-border shadow-2xl pointer-events-auto overflow-hidden flex flex-col max-h-[90vh]">
              <header className="p-6 border-b border-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/10 text-accent rounded-xl">
                    <AlertCircle size={20} />
                  </div>
                  <h2 className="text-xl font-bold tracking-tight">Edit Task</h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-text-muted hover:text-text-main hover:bg-secondary-bg rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </header>

              <div className="p-8 space-y-8 overflow-y-auto">
                {/* Description */}
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-text-muted/60 pl-1">Description</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What needs to be done?"
                    className="w-full bg-secondary-bg border border-border rounded-2xl py-4 px-5 focus:outline-none focus:border-accent/40 transition-all text-lg font-medium resize-none min-h-[100px]"
                  />
                </div>

                {/* Tags Section */}
                <div className="space-y-3">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-text-muted/60 pl-1">Tags</label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map((tag) => (
                      <span 
                        key={tag} 
                        className="flex items-center gap-1.5 px-3 py-1 bg-accent/10 border border-accent/20 text-accent text-[10px] font-bold uppercase tracking-wider rounded-lg group/tag"
                      >
                        {tag}
                        <button 
                          onClick={() => removeTag(tag)}
                          className="hover:text-rose-500 transition-colors"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="relative flex items-center bg-secondary-bg rounded-xl border border-border px-4 py-2 group/tag-input">
                    <TagIcon size={16} className="text-text-muted/40 group-focus-within/tag-input:text-accent transition-colors mr-3" />
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                      placeholder="Add a tag..."
                      className="bg-transparent text-xs font-medium text-text-main focus:outline-none w-full placeholder:text-text-muted/20"
                    />
                  </div>
                </div>

                {/* Subtasks Section */}
                <div className="space-y-4">
                  <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-text-muted/60 pl-1">Subtasks</label>
                  
                  <div className="space-y-2">
                    {subtasks.map((st) => (
                      <div key={st.id} className="flex items-center gap-3 p-3 bg-secondary-bg rounded-xl border border-border group/sub">
                        <button 
                          onClick={() => toggleSubtask(st.id)}
                          className={`transition-colors ${st.completed ? 'text-accent' : 'text-text-muted/40 hover:text-accent'}`}
                        >
                          {st.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                        </button>
                        <span className={`flex-grow text-sm font-medium ${st.completed ? 'text-text-muted line-through' : 'text-text-main'}`}>
                          {st.text}
                        </span>
                        <button 
                          onClick={() => removeSubtask(st.id)}
                          className="opacity-0 group-hover/sub:opacity-100 p-1.5 text-text-muted hover:text-rose-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newSubtaskText}
                      onChange={(e) => setNewSubtaskText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
                      placeholder="Add a subtask..."
                      className="flex-grow bg-secondary-bg border border-border rounded-xl py-2 px-4 text-sm focus:outline-none focus:border-accent/40 transition-all"
                    />
                    <button
                      onClick={addSubtask}
                      disabled={!newSubtaskText.trim()}
                      className="p-2 bg-accent/10 text-accent rounded-xl hover:bg-accent/20 transition-all disabled:opacity-20"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  {/* Priority */}
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-text-muted/60 pl-1">Priority</label>
                    <div className="flex gap-2 p-1 bg-secondary-bg rounded-xl border border-border">
                      {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setPriority(p)}
                          className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
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

                  {/* Due Date */}
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-text-muted/60 pl-1">Due Date</label>
                    <div className="relative flex items-center bg-secondary-bg rounded-xl border border-border px-4 py-2 group/date">
                      <Calendar size={16} className="text-accent mr-3" />
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="bg-transparent text-sm font-bold uppercase tracking-widest text-text-main focus:outline-none [color-scheme:dark] w-full"
                      />
                    </div>
                  </div>

                  {/* Reminder */}
                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-text-muted/60 pl-1">Reminder</label>
                    <div className="relative flex items-center bg-secondary-bg rounded-xl border border-border px-4 py-2 group/reminder">
                      <Bell size={16} className="text-amber-500 mr-3" />
                      <input
                        type="datetime-local"
                        value={reminder}
                        onChange={(e) => setReminder(e.target.value)}
                        className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-text-main focus:outline-none [color-scheme:dark] w-full"
                      />
                      {reminder && (
                        <button
                          onClick={() => setReminder('')}
                          className="ml-2 text-text-muted hover:text-rose-500 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Completed At — only for completed tasks */}
                  {todo.completed && (
                    <div className="space-y-3 sm:col-span-2">
                      <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-accent/60 pl-1">Completed At</label>
                      <div className="relative flex items-center bg-secondary-bg rounded-xl border border-accent/20 px-4 py-2">
                        <Clock size={16} className="text-accent mr-3 shrink-0" />
                        <input
                          type="datetime-local"
                          value={completedAt}
                          onChange={(e) => setCompletedAt(e.target.value)}
                          className="bg-transparent text-[10px] font-bold uppercase tracking-widest text-text-main focus:outline-none [color-scheme:dark] w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <footer className="p-6 bg-secondary-bg/50 border-t border-border flex gap-3 shrink-0">
                <button
                  onClick={onClose}
                  className="flex-1 py-4 px-6 rounded-2xl bg-primary-bg border border-border text-text-muted font-bold tracking-widest uppercase text-xs hover:bg-primary-bg/80 transition-all hover:text-text-main hover:border-text-muted/20"
                >
                  Discard
                </button>
                <button
                  onClick={handleSave}
                  disabled={!text.trim()}
                  className="flex-[2] py-4 px-6 bg-accent text-white rounded-2xl font-bold tracking-widest uppercase text-xs flex items-center justify-center gap-2 hover:bg-accent/80 transition-all disabled:opacity-20 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
                >
                  <Save size={16} />
                  Save Changes
                </button>
              </footer>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
