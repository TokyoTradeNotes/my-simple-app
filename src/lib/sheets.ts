const SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL as string | undefined;

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
  if (!SCRIPT_URL) return;
  try {
    await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });
  } catch {
    // fire-and-forget — sheet sync failure never breaks the app
  }
}
