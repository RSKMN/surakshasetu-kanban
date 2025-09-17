// src/components/KanbanBoard.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import TaskModal, { Task } from "./TaskModal";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";

type Status = "todo" | "in_progress" | "done";

const STATUS: Status[] = ["todo", "in_progress", "done"];
const LABEL: Record<Status, string> = {
  todo: "To Do",
  in_progress: "In Progress",
  done: "Completed",
};

export default function KanbanBoard({ stickyColor }: { stickyColor: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Load session and initial tasks
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id ?? null;
      setUserId(uid);
      if (uid) await fetchTasks(uid);
    })();
  }, []); // get session once [7]

  // Realtime subscription scoped to owner
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("tasks-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks", filter: `created_by=eq.${userId}` },
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            setTasks((prev) => [...prev, payload.new as Task]);
          } else if (payload.eventType === "UPDATE") {
            setTasks((prev) => prev.map((t) => (t.id === payload.new.id ? (payload.new as Task) : t)));
          } else if (payload.eventType === "DELETE") {
            setTasks((prev) => prev.filter((t) => t.id !== payload.old.id));
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]); // filtered realtime per docs [3]

  async function fetchTasks(uid: string) {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("created_by", uid)
      .order("created_at", { ascending: true });
    if (error) console.error("Fetch failed:", error.message);
    setTasks((data as Task[]) ?? []);
    setLoading(false);
  } // owner-scoped fetch using filters [7]

  async function handleDragEnd(result: DropResult) {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const newStatus = destination.droppableId as Status;
    const update: Partial<Task> = { status: newStatus };
    if (newStatus === "in_progress") update.sticky_color = stickyColor;

    const { error } = await supabase.from("tasks").update(update).eq("id", draggableId);
    if (error) {
      console.error("Drag update failed", error.message);
      alert("Move failed: " + error.message);
    }
  } // simple update; RLS enforces ownership [7]

  const columns = useMemo(
    () => ({
      todo: tasks.filter((t) => t.status === "todo"),
      in_progress: tasks.filter((t) => t.status === "in_progress"),
      done: tasks.filter((t) => t.status === "done"),
    }),
    [tasks]
  ); // local memoized partitioning [7]

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <button
          className="btn-primary"
          onClick={() => {
            setSelectedTask(null);
            setModalOpen(true);
          }}
        >
          + New Task
        </button>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid md:grid-cols-3 gap-4">
          {STATUS.map((status) => (
            <Droppable droppableId={status} key={status}>
              {(drop) => (
                <div ref={drop.innerRef} {...drop.droppableProps} className="glass-col p-3 min-h-[220px]">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-slate-100">{LABEL[status]}</h3>
                    <span className="text-slate-300">{columns[status].length}</span>
                  </div>

                  {loading && <div className="text-slate-400">Loading...</div>}
                  {!loading && columns[status].length === 0 && (
                    <div className="text-slate-400">No tasks</div>
                  )}

                  {!loading &&
                    columns[status].map((task, index) => {
                      const bg = status === "in_progress" ? task.sticky_color || stickyColor : undefined;
                      return (
                        <Draggable draggableId={String(task.id)} index={index} key={task.id}>
                          {(drag) => (
                            <div
                              ref={drag.innerRef}
                              {...drag.draggableProps}
                              {...drag.dragHandleProps}
                              className="task-card mb-2"
                              style={{ ...drag.draggableProps.style, backgroundColor: bg }}
                              onClick={() => {
                                setSelectedTask(task);
                                setModalOpen(true);
                              }}
                            >
                              <div className="text-slate-100 font-medium">{task.title}</div>
                              {task.description && (
                                <div className="text-slate-300 text-sm mt-1">{task.description}</div>
                              )}
                              {task.priority && (
                                <div className="text-slate-400 text-xs mt-1">{task.priority}</div>
                              )}
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                  {drop.placeholder}
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>

      <TaskModal isOpen={modalOpen} onClose={() => setModalOpen(false)} task={selectedTask ?? null} />
    </>
  );
}
