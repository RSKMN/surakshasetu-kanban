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
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(task?.title || "");
    setPriority(task?.priority || "Medium");
    setStatus(task?.status || "todo");
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
    if (task) {
      const { error } = await supabase
        .from("tasks")
        .update({ title, priority, status, description })
        .eq("id", task.id);
      if (error) console.error("Update failed:", error.message);
    } else {
      const { error } = await supabase.from("tasks").insert([{ title, priority, status, description }]);
      if (error) console.error("Insert failed:", error.message);
    }
    onClose();
  }

  async function handleDelete() {
    if (!task) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) console.error("Delete failed:", error.message);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl shadow-2xl text-slate-100">
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{task ? "Edit Task" : "Add New Task"}</h3>
          <button onClick={onClose} className="text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-300 rounded-md px-2" aria-label="Close">
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
              className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300 placeholder:text-slate-300/70"
              placeholder="e.g. Design login screen"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300"
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
                className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm mb-1">Labels</label>
              <div className="flex gap-2">
                <span className="badge-green">Safety</span>
                <span className="badge-amber">UI/UX</span>
                <span className="badge-sky">API</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-300 placeholder:text-slate-300/70"
              placeholder="Details that help the team move forward…"
            />
          </div>
        </div>

        <div className="p-5 border-t border-white/10 flex items-center justify-between">
          {task ? (
            <button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-rose-600/90 hover:bg-rose-600 text-white focus:outline-none focus:ring-2 focus:ring-rose-300">
              Delete
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-3">
            <button onClick={onClose} className="btn-ghost">Cancel</button>
            <button onClick={handleSave} className="btn-primary">Save Task</button>
          </div>
        </div>
      </div>
    </div>
  );
}
