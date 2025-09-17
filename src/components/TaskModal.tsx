/* src/components/TaskModal.tsx */
import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type TaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  task?: {
    id: string;
    title: string;
    description?: string;
    priority?: "Low" | "Medium" | "High";
    status: "todo" | "in_progress" | "done";
  };
};

export default function TaskModal({ isOpen, onClose, task }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title || "");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">(task?.priority || "Medium");
  const [status, setStatus] = useState<"todo" | "in_progress" | "done">(task?.status || "todo");
  const [description, setDescription] = useState(task?.description || "");
  const [saving, setSaving] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(task?.title || "");
    setPriority((task?.priority as any) || "Medium");
    setStatus((task?.status as any) || "todo");
    setDescription(task?.description || "");
  }, [task]);

  useEffect(() => {
    if (isOpen) setTimeout(() => firstFieldRef.current?.focus(), 20);
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSave() {
    if (!title.trim()) {
      alert("Task title is required");
      return;
    }
    setSaving(true);
    try {
      if (task) {
        const { error } = await supabase
          .from("tasks")
          .update({ title, priority, status, description })
          .eq("id", task.id);
        if (error) throw error;
      } else {
        // Get current user for RLS owner/created_by column
        const { data: sessionData, error: sessErr } = await supabase.auth.getSession();
        if (sessErr) throw sessErr;
        const owner = sessionData.session?.user?.id;
        if (!owner) throw new Error("Not authenticated");

        // If you have a SELECT policy on tasks, you can chain .select() to return inserted row.
        // If not, omit .select() to avoid RLS blocking.
        const { error } = await supabase
          .from("tasks")
          .insert({ title, priority, status, description, owner });
        if (error) throw error;
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
    if (!task) return;
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", task.id);
      if (error) throw error;
      onClose();
    } catch (e: any) {
      console.error("Delete failed:", e?.message || e);
      alert(`Delete failed: ${e?.message || e}`);
    }
  }

  // Dark-friendly select styling including options
  const selectClass =
    "w-full rounded-lg bg-slate-900 text-slate-100 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300 " +
    "[&>option]:bg-slate-900 [&>option]:text-slate-100";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl text-slate-100">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{task ? "Edit Task" : "Add New Task"}</h3>
          <button
            onClick={onClose}
            className="text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300 rounded-md px-2"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm mb-1">Title</label>
            <input
              ref={firstFieldRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg bg-white/10 text-slate-100 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300 placeholder:text-slate-300/70"
              placeholder="e.g. Design login screen"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className={selectClass}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className={selectClass}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg bg-white/10 text-slate-100 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300 placeholder:text-slate-300/70"
              placeholder="Details that help the team move forward…"
            />
          </div>
        </div>

        <div className="p-5 border-t border-white/10 flex items-center justify-between">
          {task ? (
            <button
              onClick={handleDelete}
              className="px-4 py-2 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white focus:outline-none focus:ring-2 focus:ring-rose-300"
            >
              Delete
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Save Task"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
