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

// Single, global To Do color (must match KanbanBoard)
const TODO_COLOR = "#FFD166";

export default function TaskModal({ isOpen, onClose, task }: TaskModalProps) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [priority, setPriority] = useState<"Low" | "Medium" | "High">(task?.priority ?? "Medium");
  const [status, setStatus] = useState<Task["status"]>(task?.status ?? "todo");
  const [description, setDescription] = useState(task?.description ?? "");

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

    if (task?.id) {
      const patch: Partial<Task> = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        status,
      };
      // If moving into To Do here, enforce the fixed color
      if (status === "todo") patch.sticky_color = TODO_COLOR;

      const { error } = await supabase.from("tasks").update(patch).eq("id", task.id);
      if (error) console.error("update task error", error);
      close();
      return;
    }

    // New task: force To Do status and color
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user?.id ?? null;

    const createRow = {
      title: title.trim(),
      description: description.trim() || null,
      priority,
      status: "todo" as const,
      sticky_color: TODO_COLOR,
      created_by: uid, // optional, not used for filtering
    };

    const { error } = await supabase.from("tasks").insert([createRow]);
    if (error) console.error("insert task error", error);
    close();
  }

  async function handleDelete() {
    if (!task?.id) return;
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) console.error("delete task error", error);
    close();
  }

  return (
    <div className="modal">
      <div className="modal-card">
        <h3>{task ? "Edit Task" : "New Task"}</h3>

        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" />

        <label>Description</label>
        <textarea value={description ?? ""} onChange={(e) => setDescription(e.target.value)} />

        <label>Priority</label>
        <select value={priority} onChange={(e) => setPriority(e.target.value as any)}>
          <option>Low</option>
          <option>Medium</option>
          <option>High</option>
        </select>

        {task ? (
          <>
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value as any)}>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Completed</option>
            </select>
          </>
        ) : null}

        <div className="actions">
          {task?.id ? (
            <button className="btn-danger" onClick={handleDelete}>Delete</button>
          ) : null}
          <button className="btn-secondary" onClick={close}>Cancel</button>
          <button className="btn-primary" onClick={handleSave}>{task ? "Save" : "Create"}</button>
        </div>
      </div>
    </div>
  );
}
