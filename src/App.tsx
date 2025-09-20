// src/App.tsx
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { SignInWithGoogleButton, SignOutButton } from "./components/AuthButtons";
import KanbanBoard from "./components/KanbanBoard";

function Intro() {
  return (
    <div className="intro-hero">
      <div className="intro-card">
        <h1 className="intro-title">Welcome, Collaborator</h1>
        <p className="intro-sub">Thank you for teaming up on <span className="brand">SurakshaSetu</span> Mobile App</p>
        <p className="intro-desc">Plan, prioritize, and deliver with a delightful Kanban experience crafted for civic impact.</p>
        <div className="intro-actions"><SignInWithGoogleButton /></div>
      </div>
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [userColor, setUserColor] = useState("#06D6A0");
  const [theme, setTheme] = useState<"dark" | "light">(
    (localStorage.getItem("theme") as "dark" | "light") || "dark"
  );

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user ?? null;
      setUid(u?.id ?? null);
      setEmail(u?.email ?? null);
      if (u?.id) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("color")
          .eq("id", u.id)
          .maybeSingle();
        if (prof?.color) setUserColor(prof.color);
      }
      setReady(true);
    })();
  }, []);

  async function handleColorChange(newColor: string) {
    if (!uid) return;
    setUserColor(newColor);
    await supabase.from("profiles").update({ color: newColor }).eq("id", uid);
    await supabase
      .from("tasks")
      .update({ sticky_color: newColor })
      .eq("assigned_to", uid)
      .neq("status", "todo");
    window.dispatchEvent(new CustomEvent("tasks:refresh"));
  }

  if (!ready) return <div className="page-pad">Loading…</div>;
  if (!email) return <Intro />;

  return (
    <div className="page-pad">
      <header className="topbar">
        <div className="brand">SurakshaSetu Kanban</div>
        <div className="toolbar">
          <span className="chip">Sprint 2</span>
          <label className="picker">
            Color:
            <input
              type="color"
              value={userColor}
              onChange={(e) => handleColorChange(e.target.value)}
              aria-label="Choose my color"
            />
          </label>
          <button
            className="btn"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "Light" : "Dark"} mode
          </button>
          <span className="muted">Signed in as {email}</span>
          <SignOutButton />
        </div>
      </header>

      <KanbanBoard stickyColor={userColor} currentUserId={uid!} />
    </div>
  );
}
