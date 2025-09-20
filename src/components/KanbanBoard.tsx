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

// Single, global To Do color (DB defaults/trigger will also enforce)
const TODO_COLOR = "#FFD166";

export default function KanbanBoard({ stickyColor }: { stickyColor: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  async function fetchTasks() {
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
    // Realtime: listen to all task changes (no owner filter)
    const channel = supabase
      .channel("public:tasks")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tasks" },
        (payload) => {
          setTasks((prev) => {
            const copy = [...prev];
            if (payload.eventType === "INSERT") {
              const row = payload.new as Task;
              // Avoid dupes
              if (!copy.find((t) => t.id === row.id)) copy.push(row);
              return copy;
            }
            if (payload.eventType === "UPDATE") {
              const row = payload.new as Task;
              const idx = copy.findIndex((t) => t.id === row.id);
              if (idx !== -1) copy[idx] = row;
              return copy;
            }
            if (payload.eventType === "DELETE") {
              const row = payload.old as Task;
              return copy.filter((t) => t.id !== row.id);
            }
            return copy;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const columns = useMemo(() => {
    const by: Record<Status, Task[]> = {
      todo: [],
      in_progress: [],
      done: [],
    };
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

  // Recalculate in-column positions for stable ordering
  async function persistPositions(status: Status, items: Task[]) {
    const updates = items.map((t, idx) => ({
      id: t.id,
      position: idx,
    }));
    // Batch best-effort; fall back to per-row if needed
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
    status: Status,
    newColor?: string
  ) {
    const item = sourceArr[sourceIdx];
    sourceArr.splice(sourceIdx, 1);
    const moved = { ...item, status, sticky_color: newColor ?? item.sticky_color };
    destArr.splice(destIdx, 0, moved);
    return moved;
  }

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;

    const fromCol = source.droppableId as Status;
    const toCol = destination.droppableId as Status;
    if (!STATUS.includes(fromCol) || !STATUS.includes(toCol)) return;

    const next = { ...columns };
    const fromArr = [...next[fromCol]];
    const toArr = fromCol === toCol ? fromArr : [...next[toCol]];

    // Decide color based on target column
    let newColor: string | undefined = undefined;
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

    // Flatten back to tasks list preserving other columns untouched
    const untouched = tasks.filter(
      (t) => t.status !== fromCol && t.status !== toCol
    );
    const updated = [...untouched, ...nextColumns.todo, ...nextColumns.in_progress, ...nextColumns.done];

    setTasks(updated);

    // Persist status/color for moved card
    await persistTaskPatch(draggableId, {
      status: toCol,
      sticky_color: moved.sticky_color,
    });

    // Persist positions in both columns
    await persistPositions(fromCol, nextColumns[fromCol]);
    if (fromCol !== toCol) await persistPositions(toCol, nextColumns[toCol]);
  };

  return (
    <div className="kanban">
      <div className="kanban-header">
        <h2>Team Board</h2>
        <button onClick={openNew} className="btn-primary">
          New Task
        </button>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="columns">
            {STATUS.map((col) => (
              <Droppable droppableId={col} key={col}>
                {(provided) => (
                  <div className="column" ref={provided.innerRef} {...provided.droppableProps}>
                    <h3>{LABEL[col]}</h3>
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
                              borderLeft: `8px solid ${t.sticky_color ?? "#ccc"}`,
                              ...drag.draggableProps.style,
                            }}
                          >
                            <div className="title">{t.title}</div>
                            {t.description ? (
                              <div className="desc">{t.description}</div>
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
