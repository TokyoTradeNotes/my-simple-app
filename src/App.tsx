import { useState, useEffect } from 'react';
import { LayoutList, Search, Users } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import TodoItem from './components/TodoItem';
import AddTodo from './components/AddTodo';
import EditTodoModal from './components/EditTodoModal';
import { Todo, Priority } from './types';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  
  const [onlineUsers] = useState(['Leowa', 'Wife']);
  const currentUser = 'Leowa';

  useEffect(() => {
    const fetchTodos = async () => {
      const { data } = await supabase
        .from('todos')
        .select('*')
        .order('createdAt', { ascending: false });
      if (data) setTodos(data);
    };

    fetchTodos();

    const channel = supabase
      .channel('todos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, fetchTodos)
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const addTodo = async (text: string, priority: Priority, dueDate?: string) => {
    const newTodo = {
      text,
      completed: false,
      priority,
      dueDate: dueDate || null,
      createdAt: new Date().toISOString(),
      completedAt: null,
      subtasks: [],
      reminder: null,
      tags: [],
      userId: currentUser,
    };
    await supabase.from('todos').insert(newTodo);
  };

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;
    await supabase
      .from('todos')
      .update({
        completed: !todo.completed,
        completedAt: !todo.completed ? new Date().toISOString() : null,
      })
      .eq('id', id);
  };

  const deleteTodo = async (id: string) => {
    await supabase.from('todos').delete().eq('id', id);
  };

  const updateTodo = async (id: string, updates: Partial<Todo>) => {
    await supabase.from('todos').update(updates).eq('id', id);
  };

  const filteredTodos = todos.filter(todo =>
    todo.text.toLowerCase().includes(searchQuery.toLowerCase()) &&
    (selectedTags.length === 0 || selectedTags.every(tag => todo.tags?.includes(tag)))
  );

  const sortedTodos = [...filteredTodos].sort((a, b) =>
    a.completed === b.completed ? 0 : a.completed ? 1 : -1
  );

  return (
    <div className="min-h-screen py-12 px-6 bg-secondary-bg text-text-main">
      <div className="max-w-2xl mx-auto space-y-12">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent/10 text-accent rounded-2xl">
              <LayoutList size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Family Todo List</h1>
              <p className="text-text-muted">Shared with your wife ✨</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-primary-bg border border-border rounded-2xl px-5 py-2.5">
            <Users size={18} className="text-accent" />
            <div className="flex -space-x-2">
              {onlineUsers.map((name, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-secondary-bg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                  {name[0]}
                </div>
              ))}
            </div>
            <span className="text-sm text-text-muted">{onlineUsers.length} online</span>
          </div>
        </header>

        <AddTodo onAdd={addTodo} />

        <div className="relative">
          <Search className="absolute left-4 top-3.5 text-text-muted" size={20} />
          <input
            type="text"
            placeholder="Search tasks..."
            className="w-full pl-12 pr-4 py-3 bg-primary-bg border border-border rounded-2xl focus:outline-none focus:border-accent"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-3">
          {sortedTodos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
              onEdit={setEditingTodo}
            />
          ))}
        </div>

        {editingTodo && (
          <EditTodoModal
            todo={editingTodo}
            onClose={() => setEditingTodo(null)}
            onSave={updateTodo}
          />
        )}
      </div>
    </div>
  );
}
