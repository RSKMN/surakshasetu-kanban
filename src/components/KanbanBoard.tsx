// src/components/KanbanBoard.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import TaskModal, { type Task } from "./TaskModal";
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
const TODO_COLOR = "#FFD166";

export default function KanbanBoard({ stickyColor }: { stickyColor: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  async function fetchTasks() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tasks")
      .select("*")
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      console.error("fetchTasks error", error);
      setTasks([]);
    } else {
      setTasks((data as Task[]) ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchTasks();

    // React to CRUD events from TaskModal (works without Realtime)
    const handler = () => fetchTasks();
    window.addEventListener("tasks:refresh", handler);

    // Realtime subscription (works if enabled for the tasks table)
    const channel = supabase
      .channel("public:tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        () => fetchTasks()
      )
      .subscribe();

    return () => {
      window.removeEventListener("tasks:refresh", handler);
      supabase.removeChannel(channel);
    };
  }, []);

  const columns = useMemo(() => {
    const by: Record<Status, Task[]> = { todo: [], in_progress: [], done: [] };
    for (const t of tasks) by[t.status]?.push(t);
    return by;
  }, [tasks]);

  function openNew() {
    setSelectedTask(null);
    setModalOpen(true);
  }

  function openEdit(task: Task) {
    setSelectedTask(task);
    setModalOpen(true);
  }

  async function persistTaskPatch(id: string, patch: Partial<Task>) {
    const { error } = await supabase.from("tasks").update(patch).eq("id", id);
    if (error) console.error("persistTaskPatch error", error);
  }

  async function persistPositions(items: Task[]) {
    const updates = items.map((t, idx) => ({ id: t.id, position: idx }));
    const { error } = await supabase.from("tasks").upsert(updates, {
      onConflict: "id",
    });
    if (error) console.error("persistPositions error", error);
  }

  function localMove(
    sourceArr: Task[],
    destArr: Task[],
    sourceIdx: number,
    destIdx: number,
    toStatus: Status,
    newColor?: string
  ) {
    const item = sourceArr[sourceIdx];
    sourceArr.splice(sourceIdx, 1);
    const moved = {
      ...item,
      status: toStatus,
      sticky_color: newColor ?? item.sticky_color,
    };
    destArr.splice(destIdx, 0, moved);
    return moved;
  }

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const fromCol = source.droppableId as Status;
    const toCol = destination.droppableId as Status;
    if (!STATUS.includes(fromCol) || !STATUS.includes(toCol)) return;

    const fromArr = [...columns[fromCol]];
    const toArr = fromCol === toCol ? fromArr : [...columns[toCol]];

    let newColor: string | undefined;
    if (toCol === "todo") newColor = TODO_COLOR;
    if (toCol === "in_progress") newColor = stickyColor;

    const moved = localMove(
      fromArr,
      toArr,
      source.index,
      destination.index,
      toCol,
      newColor
    );

    const nextColumns = {
      ...columns,
      [fromCol]: fromCol === toCol ? toArr : fromArr,
      [toCol]: toArr,
    };

    const untouched = tasks.filter(
      (t) => t.status !== fromCol && t.status !== toCol
    );
    setTasks([
      ...untouched,
      ...nextColumns.todo,
      ...nextColumns.in_progress,
      ...nextColumns.done,
    ]);

    await persistTaskPatch(draggableId, {
      status: toCol,
      sticky_color: moved.sticky_color,
    });
    await persistPositions(nextColumns[fromCol]);
    if (fromCol !== toCol) await persistPositions(nextColumns[toCol]);
  };

  return (
    <div className="kanban">
      <div className="kanban-header">
        <h2>Team Board</h2>
        <button onClick={openNew} className="btn btn-primary">
          New Task
        </button>
      </div>

      {loading ? (
        <div className="muted">Loading…</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="columns">
            {STATUS.map((col) => (
              <Droppable droppableId={col} key={col}>
                {(provided) => (
                  <div
                    className="column"
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    <h3 className="col-title">{LABEL[col]}</h3>
                    {columns[col].map((t, idx) => (
                      <Draggable draggableId={t.id} index={idx} key={t.id}>
                        {(drag) => (
                          <div
                            className="card"
                            onClick={() => openEdit(t)}
                            ref={drag.innerRef}
                            {...drag.draggableProps}
                            {...drag.dragHandleProps}
                            style={{
                              borderLeft: `8px solid ${t.sticky_color ?? "#415a77"}`,
                              ...drag.draggableProps.style,
                            }}
                          >
                            <div className="card-title">{t.title}</div>
                            {t.description ? (
                              <div className="card-desc">{t.description}</div>
                            ) : null}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            ))}
          </div>
        </DragDropContext>
      )}

      <TaskModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        task={selectedTask}
      />
    </div>
  );
}
