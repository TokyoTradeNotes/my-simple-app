/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutList, CheckCircle2, Search, Bell, X, Undo2, Redo2, Tag as TagIcon } from 'lucide-react';
import { Todo, Priority } from './types';
import TodoItem from './components/TodoItem';
import AddTodo from './components/AddTodo';
import EditTodoModal from './components/EditTodoModal';

export default function App() {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const saved = localStorage.getItem('taskflow-todos');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [activeNotification, setActiveNotification] = useState<Todo | null>(null);
  const notifiedReminders = useRef<Set<string>>(new Set());

  // History State
  const [history, setHistory] = useState<Todo[][]>([todos]);
  const [historyPointer, setHistoryPointer] = useState(0);
  const isInternalChange = useRef(false);

  useEffect(() => {
    localStorage.setItem('taskflow-todos', JSON.stringify(todos));
    
    if (!isInternalChange.current) {
      const currentHistory = history[historyPointer];
      // Only push if the state actually changed
      if (JSON.stringify(currentHistory) !== JSON.stringify(todos)) {
        const newHistory = history.slice(0, historyPointer + 1);
        newHistory.push(todos);
        
        // Limit history to 50 steps
        if (newHistory.length > 50) {
          newHistory.shift();
          setHistory(newHistory);
          setHistoryPointer(newHistory.length - 1);
        } else {
          setHistory(newHistory);
          setHistoryPointer(newHistory.length - 1);
        }
      }
    }
    isInternalChange.current = false;
  }, [todos, history, historyPointer]);

  const undo = useCallback(() => {
    if (historyPointer > 0) {
      isInternalChange.current = true;
      const prevPointer = historyPointer - 1;
      setHistoryPointer(prevPointer);
      setTodos(history[prevPointer]);
    }
  }, [history, historyPointer]);

  const redo = useCallback(() => {
    if (historyPointer < history.length - 1) {
      isInternalChange.current = true;
      const nextPointer = historyPointer + 1;
      setHistoryPointer(nextPointer);
      setTodos(history[nextPointer]);
    }
  }, [history, historyPointer]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Reminder Check Logic
  useEffect(() => {
    const checkReminders = () => {
      const now = Date.now();
      todos.forEach(todo => {
        if (!todo.completed && todo.reminder && !notifiedReminders.current.has(todo.id)) {
          const reminderTime = new Date(todo.reminder).getTime();
          // Notify if within the current minute
          if (now >= reminderTime && now < reminderTime + 60000) {
            setActiveNotification(todo);
            notifiedReminders.current.add(todo.id);
            
            // Try Browser Notification
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("TaskFlow Reminder", {
                body: todo.text,
                icon: "/favicon.ico"
              });
            }
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [todos]);

  // Request Notification Permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  const addTodo = (text: string, priority: Priority, dueDate?: string) => {
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      priority,
      dueDate,
      createdAt: Date.now(),
    };
    setTodos([newTodo, ...todos]);
  };

  const toggleTodo = (id: string) => {
    setTodos(todos.map(t => {
      if (t.id === id) {
        const completed = !t.completed;
        return { 
          ...t, 
          completed, 
          completedAt: completed ? Date.now() : undefined 
        };
      }
      return t;
    }));
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(t => t.id !== id));
  };

  const updateTodo = (id: string, updates: Partial<Todo>) => {
    setTodos(todos.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const completedCount = todos.filter(t => t.completed).length;
  
  const allTags = Array.from(new Set(todos.flatMap(t => t.tags || []))).sort();

  const filteredTodos = todos.filter(todo => {
    const matchesSearch = todo.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags = selectedTags.length === 0 || selectedTags.every(tag => todo.tags?.includes(tag));
    return matchesSearch && matchesTags;
  });

  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    
    if (!a.completed) {
      if (a.dueDate && b.dueDate) {
        if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      } else if (a.dueDate) {
        return -1;
      } else if (b.dueDate) {
        return 1;
      }

      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
    }
    
    return b.createdAt - a.createdAt;
  });

  return (
    <div className="min-h-screen py-12 px-6 sm:py-24 bg-secondary-bg text-text-main selection:bg-accent/30">
      <div className="max-w-2xl mx-auto space-y-12">
        {/* Header */}
        <header className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/10 text-accent rounded-2xl ring-1 ring-accent/20">
                <LayoutList size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-text-main">Daily Checklist</h1>
                <p className="text-text-muted text-sm mt-1">
                  Manage your workflow with elegance
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-primary-bg border border-border rounded-xl p-1 gap-1">
                <button
                  onClick={undo}
                  disabled={historyPointer === 0}
                  className="p-2 text-text-muted hover:text-accent disabled:opacity-20 disabled:hover:text-text-muted transition-all rounded-lg hover:bg-secondary-bg"
                  title="Undo (Ctrl+Z)"
                >
                  <Undo2 size={18} />
                </button>
                <button
                  onClick={redo}
                  disabled={historyPointer >= history.length - 1}
                  className="p-2 text-text-muted hover:text-accent disabled:opacity-20 disabled:hover:text-text-muted transition-all rounded-lg hover:bg-secondary-bg"
                  title="Redo (Ctrl+Shift+Z)"
                >
                  <Redo2 size={18} />
                </button>
              </div>
              <div className="flex -space-x-2">
                <div className="w-9 h-9 rounded-full border-2 border-secondary-bg bg-accent flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-border">UN</div>
                <div className="w-9 h-9 rounded-full border-2 border-secondary-bg bg-emerald-500 flex items-center justify-center text-[10px] font-bold text-white ring-1 ring-border">AI</div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono bg-primary-bg border border-border px-2 py-0.5 rounded text-xs text-accent">{todos.length}</span>
                <span className="text-text-muted">Tasks</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono bg-primary-bg border border-border px-2 py-0.5 rounded text-xs text-accent">{completedCount}</span>
                <span className="text-text-muted">Completed</span>
              </div>
            </div>

            <div className="relative group/search flex-grow max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within/search:text-accent transition-colors" />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full pl-9 pr-4 py-2 bg-primary-bg border border-border rounded-xl text-xs font-medium focus:outline-none focus:border-accent/40 transition-all placeholder:text-text-muted/40"
              />
            </div>
          </div>

          <AnimatePresence>
            {allTags.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center gap-2 pt-2"
              >
                <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-bold text-text-muted/40 mr-2">
                  <TagIcon size={12} />
                  Filter Tags
                </div>
                {allTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTags(prev => 
                      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                    )}
                    className={`px-3 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg border transition-all ${
                      selectedTags.includes(tag) 
                        ? 'bg-accent border-accent text-white shadow-lg shadow-accent/20' 
                        : 'bg-primary-bg border-border text-text-muted hover:border-accent/40'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
                {selectedTags.length > 0 && (
                  <button 
                    onClick={() => setSelectedTags([])}
                    className="p-1 px-2 text-[9px] font-bold uppercase tracking-widest text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                  >
                    Clear All
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </header>

        {/* Input */}
        <section className="bg-primary-bg p-6 rounded-3xl border border-border shadow-2xl shadow-black/20">
          <AddTodo onAdd={addTodo} />
        </section>

        {/* List */}
        <section className="space-y-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {sortedTodos.length > 0 ? (
              sortedTodos.map(todo => (
                <TodoItem 
                  key={todo.id} 
                  todo={todo} 
                  onToggle={toggleTodo} 
                  onDelete={deleteTodo} 
                  onEdit={() => setEditingTodo(todo)}
                />
              ))
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="py-24 text-center space-y-4 rounded-3xl border-2 border-dashed border-border"
              >
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-bg text-text-muted/20 border border-border">
                  <CheckCircle2 size={40} strokeWidth={1} />
                </div>
                <div className="space-y-1">
                  <p className="text-text-main font-semibold">Empty Space</p>
                  <p className="text-text-muted text-sm">You've cleared your schedule for now.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Footer info */}
        <footer className="pt-12 border-t border-border flex flex-col items-center gap-4">
          <div className="flex gap-4">
            <div className="w-2 h-2 rounded-full bg-rose-500"></div>
            <div className="w-2 h-2 rounded-full bg-amber-500"></div>
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted/30">
            TaskFlow Premium Architecture &bull; 2026
          </p>
        </footer>
      </div>

      {editingTodo && (
        <EditTodoModal
          todo={editingTodo}
          isOpen={!!editingTodo}
          onClose={() => setEditingTodo(null)}
          onSave={updateTodo}
        />
      )}

      {/* Notification Toast */}
      <AnimatePresence>
        {activeNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-8 right-8 z-[100] flex items-center gap-4 bg-primary-bg border border-accent/40 rounded-2xl p-5 shadow-2xl shadow-accent/20 min-w-[320px]"
          >
            <div className="p-3 bg-accent/10 text-accent rounded-xl">
              <Bell size={24} className="animate-bounce" />
            </div>
            <div className="flex-grow">
              <h4 className="text-xs font-bold uppercase tracking-widest text-accent mb-1">Reminder</h4>
              <p className="text-sm font-semibold text-text-main line-clamp-1">{activeNotification.text}</p>
            </div>
            <button 
              onClick={() => setActiveNotification(null)}
              className="p-2 text-text-muted hover:text-text-main hover:bg-secondary-bg rounded-lg transition-all"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

