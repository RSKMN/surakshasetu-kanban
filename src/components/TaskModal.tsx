// src/components/TaskModal.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export type Task = {
  id: string;
  title: string;
  description?: string | null;
  priority?: "Low" | "Medium" | "High" | null;
  status: "todo" | "in_progress" | "done";
  sticky_color?: string | null;
  created_by?: string | null;
  created_at?: string | null;
  position?: number | null;
};

type TaskModalProps = {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
};

const TODO_COLOR = "#FFD166";

export default function TaskModal({ isOpen, onClose, task }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">(task?.priority ?? "Medium");
  const [status, setStatus] = useState<Task["status"]>(task?.status ?? "todo");
  const [description, setDescription] = useState(task?.description ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title ?? "");
      setPriority((task.priority as any) ?? "Medium");
      setStatus(task.status ?? "todo");
      setDescription(task.description ?? "");
    } else {
      setTitle("");
      setPriority("Medium");
      setStatus("todo");
      setDescription("");
    }
  }, [task, isOpen]);

  if (!isOpen) return null;

  const close = () => onClose();

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (task?.id) {
        const patch: Partial<Task> = {
          title: title.trim(),
          description: description.trim() || null,
          priority,
          status,
        };
        if (status === "todo") patch.sticky_color = TODO_COLOR;
        const { error } = await supabase.from("tasks").update(patch).eq("id", task.id);
        if (error) throw error;
      } else {
        const { data: s } = await supabase.auth.getSession();
        const uid = s?.session?.user?.id ?? null;
        const createRow = {
          title: title.trim(),
          description: description.trim() || null,
          priority,
          status: "todo" as const,
          sticky_color: TODO_COLOR,
          created_by: uid,
        };
        const { error } = await supabase.from("tasks").insert([createRow]);
        if (error) throw error;
      }
      close();
    } catch (e: any) {
      alert(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task?.id) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) alert(error.message);
    close();
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.4)",
        display: "grid",
        placeItems: "center",
        zIndex: 1000,
      }}
    >
      <div style={{ width: 420, background: "#0b132b", color: "white", borderRadius: 8, padding: 16 }}>
        <h3 style={{ marginTop: 0 }}>{task ? "Edit Task" : "New Task"}</h3>

        <label>Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title"
          style={{ width: "100%", padding: 8, marginBottom: 10 }}
        />

        <label>Description</label>
        <textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Optional details"
          style={{ width: "100%", padding: 8, marginBottom: 10 }}
        />

        <label>Priority</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as any)}
          style={{ width: "100%", padding: 8, marginBottom: 10 }}
        >
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>

        {task ? (
          <>
            <label>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              style={{ width: "100%", padding: 8, marginBottom: 10 }}
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Completed</option>
            </select>
          </>
        ) : null}

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          {task?.id ? (
            <button onClick={handleDelete} style={{ padding: "6px 10px" }}>Delete</button>
          ) : null}
          <button onClick={close} style={{ padding: "6px 10px" }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: "6px 10px" }}>
            {saving ? "Saving..." : task ? "Save" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
