export type Priority = 'low' | 'medium' | 'high';

export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  dueDate: string | null;
  completedAt: string | null;
  subtasks: SubTask[];
  reminder: string | null;
  tags: string[];
  createdAt: string;
  createdBy: string;
}
