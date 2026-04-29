import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutList, CheckCircle2, Search, Bell, X, Tag as TagIcon } from 'lucide-react';
import { supabase } from './lib/supabase';
import { logToSheet } from './lib/sheets';
import { Todo, Priority } from './types';
import TodoItem from './components/TodoItem';
import AddTodo from './components/AddTodo';
import EditTodoModal from './components/EditTodoModal';
import UserSelect from './components/UserSelect';
import CalendarPanel from './components/CalendarPanel';
import PinGate from './components/PinGate';

const USER_COLORS: Record<string, string> = {
  Tokyo: 'from-violet-500 to-indigo-600',
  Hannah: 'from-pink-500 to-rose-500',
};

export default function App() {
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(() =>
    localStorage.getItem('family-todo-user')
  );
  const [todos, setTodos] = useState<Todo[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [activeNotification, setActiveNotification] = useState<Todo | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const notifiedReminders = useRef<Set<string>>(new Set());

  const handleSelectUser = (name: string) => {
    localStorage.setItem('family-todo-user', name);
    setCurrentUser(name);
  };

  const handleSwitchUser = () => {
    localStorage.removeItem('family-todo-user');
    setCurrentUser(null);
    setOnlineUsers([]);
  };

  // Fetch todos + realtime sync
  useEffect(() => {
    if (!currentUser) return;

    const fetchTodos = async () => {
      const { data } = await supabase
        .from('todos')
        .select('*')
        .order('createdAt', { ascending: false });
      if (data) setTodos(data as Todo[]);
    };

    fetchTodos();

    const channel = supabase
      .channel('db-todos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, fetchTodos)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  // Presence — who's currently viewing
  useEffect(() => {
    if (!currentUser) return;

    const channel = supabase.channel('presence:family-todo', {
      config: { presence: { key: currentUser } },
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ name: string }>();
      const users = Object.values(state)
        .map((presences) => (presences as { name: string }[])[0]?.name)
        .filter(Boolean) as string[];
      setOnlineUsers(users);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ name: currentUser });
      }
    });

    return () => { supabase.removeChannel(channel); };
  }, [currentUser]);

  // Reminders
  useEffect(() => {
    if (!currentUser) return;
    const check = () => {
      const now = Date.now();
      todos.forEach((todo) => {
        if (!todo.completed && todo.reminder && !notifiedReminders.current.has(todo.id)) {
          const t = new Date(todo.reminder).getTime();
          if (now >= t && now < t + 60000) {
            setActiveNotification(todo);
            notifiedReminders.current.add(todo.id);
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Family Checklist', { body: todo.text });
            }
          }
        }
      });
    };
    const id = setInterval(check, 30000);
    return () => clearInterval(id);
  }, [todos, currentUser]);

  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const addTodo = async (text: string, priority: Priority, dueDate?: string) => {
    const createdAt = new Date().toISOString();
    const { data } = await supabase.from('todos').insert({
      text,
      completed: false,
      priority,
      dueDate: dueDate || null,
      completedAt: null,
      subtasks: [],
      reminder: null,
      tags: [],
      createdAt,
      createdBy: currentUser,
    }).select().single();

    if (data) {
      logToSheet({
        id: data.id,
        text,
        priority,
        dueDate: dueDate || null,
        tags: [],
        createdBy: currentUser!,
        createdAt,
        completedAt: null,
        action: 'created',
      });
    }
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find((t) => t.id === id);
    if (!todo) return;
    const nowCompleting = !todo.completed;
    const completedAt = nowCompleting ? new Date().toISOString() : null;
    await supabase.from('todos').update({ completed: nowCompleting, completedAt }).eq('id', id);
    logToSheet({
      id: todo.id,
      text: todo.text,
      priority: todo.priority,
      dueDate: todo.dueDate,
      tags: todo.tags || [],
      createdBy: todo.createdBy,
      createdAt: todo.createdAt,
      completedAt,
      action: nowCompleting ? 'completed' : 'uncompleted',
    });
  };

  const deleteTodo = async (id: string) => {
    await supabase.from('todos').delete().eq('id', id);
  };

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    await supabase.from('todos').update(updates).eq('id', id);
  };

  if (!pinUnlocked) {
    return <PinGate onUnlock={() => setPinUnlocked(true)} />;
  }

  if (!currentUser) {
    return <UserSelect onSelect={handleSelectUser} />;
  }

  const completedCount = todos.filter((t) => t.completed).length;
  const allTags = Array.from(new Set(todos.flatMap((t) => t.tags || []))).sort();

  const filteredTodos = todos.filter((todo) => {
    const matchesSearch = todo.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags =
      selectedTags.length === 0 || selectedTags.every((tag) => todo.tags?.includes(tag));
    const matchesDay = !selectedDay || todo.dueDate?.slice(0, 10) === selectedDay;
    return matchesSearch && matchesTags && matchesDay;
  });

  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (!a.completed) {
      if (a.dueDate && b.dueDate && a.dueDate !== b.dueDate)
        return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate && !b.dueDate) return -1;
      if (!a.dueDate && b.dueDate) return 1;
      const order = { high: 0, medium: 1, low: 2 };
      if (a.priority !== b.priority) return order[a.priority] - order[b.priority];
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div className="min-h-screen py-12 px-6 sm:py-16 bg-secondary-bg text-text-main selection:bg-accent/30">
      <div className="max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-10 items-start">
      <div className="flex-grow min-w-0 space-y-12">

        <header className="space-y-8">
          <div className="flex items-center justify-between">
            {/* Title */}
            <div className="flex items-center gap-4">
              <div className="p-3 bg-accent/10 text-accent rounded-2xl ring-1 ring-accent/20">
                <LayoutList size={28} />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-text-main">Family Checklist</h1>
                <p className="text-text-muted text-sm mt-1">Shared to-do list</p>
              </div>
            </div>

            {/* Presence + switch user */}
            <div className="flex items-center gap-3">
              {onlineUsers.length > 0 && (
                <span className="text-[10px] uppercase tracking-widest font-bold text-text-muted/40 hidden sm:block">
                  Viewing
                </span>
              )}
              <div className="flex -space-x-2">
                {['Tokyo', 'Hannah'].map((name) => {
                  const isOnline = onlineUsers.includes(name);
                  return (
                    <div
                      key={name}
                      title={`${name}${isOnline ? ' — online' : ' — offline'}${name === currentUser ? ' (you)' : ''}`}
                      className={`relative w-9 h-9 rounded-full border-2 border-secondary-bg bg-gradient-to-br ${USER_COLORS[name]} flex items-center justify-center text-[11px] font-bold text-white transition-all ${isOnline ? 'opacity-100' : 'opacity-25'}`}
                    >
                      {name[0]}
                      {isOnline && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border border-secondary-bg" />
                      )}
                    </div>
                  );
                })}
              </div>
              <button
                onClick={handleSwitchUser}
                className="text-[9px] uppercase tracking-widest font-bold text-text-muted/40 hover:text-accent transition-colors px-2 py-1 rounded-lg hover:bg-accent/10"
              >
                Switch
              </button>
            </div>
          </div>

          {/* Stats + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono bg-primary-bg border border-border px-2 py-0.5 rounded text-xs text-accent">
                  {todos.length}
                </span>
                <span className="text-text-muted">Tasks</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono bg-primary-bg border border-border px-2 py-0.5 rounded text-xs text-accent">
                  {completedCount}
                </span>
                <span className="text-text-muted">Completed</span>
              </div>
            </div>
            <div className="relative group/search flex-grow max-w-xs">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within/search:text-accent transition-colors"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tasks..."
                className="w-full pl-9 pr-4 py-2 bg-primary-bg border border-border rounded-xl text-xs font-medium focus:outline-none focus:border-accent/40 transition-all placeholder:text-text-muted/40"
              />
            </div>
          </div>

          {/* Tag filter */}
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
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() =>
                      setSelectedTags((prev) =>
                        prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
                      )
                    }
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

        {/* Add task */}
        <section className="bg-primary-bg p-6 rounded-3xl border border-border shadow-2xl shadow-black/20">
          <AddTodo onAdd={addTodo} />
        </section>

        {/* Task list */}
        <section className="space-y-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {sortedTodos.length > 0 ? (
              sortedTodos.map((todo) => (
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
                  <p className="text-text-main font-semibold">All clear!</p>
                  <p className="text-text-muted text-sm">No tasks yet. Add one above.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        <footer className="pt-12 border-t border-border flex justify-center">
          <p className="text-[10px] uppercase tracking-widest font-bold text-text-muted/30">
            Family Checklist &bull; {new Date().getFullYear()}
          </p>
        </footer>
      </div>

      {/* Calendar sidebar */}
      <div className="lg:w-72 shrink-0 lg:sticky lg:top-16">
        <CalendarPanel
          todos={todos}
          selectedDay={selectedDay}
          onDaySelect={setSelectedDay}
        />
      </div>

      </div>
      </div>

      {editingTodo && (
        <EditTodoModal
          todo={editingTodo}
          isOpen={true}
          onClose={() => setEditingTodo(null)}
          onSave={updateTodo}
        />
      )}

      {/* Reminder toast */}
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
              <p className="text-sm font-semibold text-text-main line-clamp-1">
                {activeNotification.text}
              </p>
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
