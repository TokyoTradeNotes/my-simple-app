const EDGE_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sheet-logger`
  : undefined;

interface SheetPayload {
  id: string;
  text: string;
  priority: string;
  dueDate: string | null;
  tags: string[];
  createdBy: string;
  createdAt: string;
  completedAt: string | null;
  action: 'created' | 'completed' | 'uncompleted';
}

export async function logToSheet(payload: SheetPayload): Promise<void> {
  if (!EDGE_URL) return;
  try {
    await fetch(EDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // fire-and-forget — sheet sync failure never breaks the app
  }
}
