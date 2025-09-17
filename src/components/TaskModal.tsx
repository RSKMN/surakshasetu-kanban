// src/components/TaskModal.tsx
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type TaskStatus = "todo" | "in_progress" | "done";
type TaskPriority = "Low" | "Medium" | "High";

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  priority?: TaskPriority | null;
  status: TaskStatus;
  sticky_color?: string | null;
  created_by: string;
};

type TaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
};

export default function TaskModal({ isOpen, onClose, task }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "Medium");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo");
  const [description, setDescription] = useState(task?.description ?? "");
  const [saving, setSaving] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setTitle(task?.title ?? "");
    setPriority(task?.priority ?? "Medium");
    setStatus(task?.status ?? "todo");
    setDescription(task?.description ?? "");
  }, [task]); // keep fields in sync with selected task [7]

  useEffect(() => {
    if (isOpen) setTimeout(() => firstFieldRef.current?.focus(), 20);
  }, [isOpen]); // minor UX improvement [7]

  if (!isOpen) return null; // do not render when closed [7]

  async function handleSave() {
    if (!title.trim()) {
      alert("Task title is required");
      return;
    }

    setSaving(true);
    try {
      if (task?.id) {
        const { error } = await supabase
          .from("tasks")
          .update({ title, priority, status, description })
          .eq("id", task.id);
        if (error) throw error; // update existing task [7]
      } else {
        const { data: s, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;
        const uid = s?.session?.user?.id;
        if (!uid) throw new Error("Not authenticated");

        // Insert with created_by so RLS passes; select() only if a caller needs the created row
        const { error } = await supabase
          .from("tasks")
          .insert([{ title, priority, status, description, created_by: uid }]);
        if (error) throw error; // insert without selecting to minimize payload [9][15]
      }
      onClose();
    } catch (e: any) {
      console.error("Save failed:", e?.message || e);
      alert(`Save failed: ${e?.message || e}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task?.id) return;
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (error) throw error; // delete guarded by RLS [7]
      onClose();
    } catch (e: any) {
      console.error("Delete failed:", e?.message || e);
      alert(`Delete failed: ${e?.message || e}`);
    }
  }

  const selectClass =
    "w-full rounded-lg bg-slate-900 text-slate-100 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300 [&>option]:bg-slate-900 [&>option]:text-slate-100";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-lg glass-card border border-white/10 p-5 text-slate-200">
        <h3 className="text-lg font-semibold mb-4">{task ? "Edit Task" : "Add New Task"}</h3>

        <label className="block text-sm mb-1">Title</label>
        <input
          ref={firstFieldRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg bg-white/10 text-slate-100 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300 placeholder:text-slate-300/70"
          placeholder="e.g. Design login screen"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <div>
            <label className="block text-sm mb-1">Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={selectClass}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as TaskStatus)} className={selectClass}>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Completed</option>
            </select>
          </div>
        </div>

        <label className="block text-sm mt-4 mb-1">Description</label>
        <textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full rounded-lg bg-white/10 text-slate-100 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300 placeholder:text-slate-300/70"
          placeholder="Details that help the team move forward…"
        />

        <div className="mt-6 flex items-center justify-between">
          {task?.id ? (
            <button onClick={handleDelete} className="btn-ghost">
              Delete
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="btn-glass">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Save Task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
