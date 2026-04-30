import { motion } from 'motion/react';
import { LayoutList } from 'lucide-react';

const USERS = [
  { name: 'Tokyo', color: 'from-violet-500 to-indigo-600', ring: 'ring-violet-500/30' },
  { name: 'Hannah', color: 'from-pink-500 to-rose-500', ring: 'ring-pink-500/30' },
];

interface UserSelectProps {
  onSelect: (name: string) => void;
}

export default function UserSelect({ onSelect }: UserSelectProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary-bg px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-14 text-center"
      >
        <div className="space-y-4">
          <div className="inline-flex items-center justify-center p-4 bg-accent/10 text-accent rounded-3xl ring-1 ring-accent/20 mx-auto">
            <LayoutList size={36} />
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-text-main">Family Checklist</h1>
          <p className="text-text-muted">Who's using the app right now?</p>
        </div>

        <div className="flex gap-6 justify-center">
          {USERS.map((user, i) => (
            <motion.button
              key={user.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => onSelect(user.name)}
              className={`group flex flex-col items-center gap-5 p-10 bg-primary-bg border border-border rounded-3xl hover:border-accent/30 transition-all hover:scale-105 ring-1 ring-transparent hover:${user.ring}`}
            >
              <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${user.color} flex items-center justify-center text-4xl font-bold text-white shadow-xl`}>
                {user.name[0]}
              </div>
              <span className="text-xl font-semibold text-text-main group-hover:text-accent transition-colors">
                {user.name}
              </span>
            </motion.button>
          ))}
        </div>

      </motion.div>
    </div>
  );
}
