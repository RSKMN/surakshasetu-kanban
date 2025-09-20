// src/App.tsx
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { SignInWithGoogleButton, SignOutButton } from "./components/AuthButtons";
import KanbanBoard from "./components/KanbanBoard";

// Simple branded intro shown before login
function Intro() {
  return (
    <div className="intro-hero">
      <div className="intro-card">
        <h1 className="intro-title">Welcome, Collaborator</h1>
        <p className="intro-sub">
          Thank you for teaming up on <span className="brand">SurakshaSetu</span> Mobile App
        </p>
        <p className="intro-desc">
          Plan, prioritize, and deliver with a delightful Kanban experience crafted for civic impact.
        </p>
        <div className="intro-actions">
          <SignInWithGoogleButton />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [ready, setReady] = useState(false);
  const [userColor, setUserColor] = useState<string>("#06D6A0"); // fallback
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user ?? null;
      setEmail(u?.email ?? null);

      // Pull profile color when logged in (optional polish)
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

  if (!ready) return <div className="page-pad">Loading…</div>;

  // Not signed in — show intro page
  if (!email) return <Intro />;

  // Signed in — show board shell
  return (
    <div className="page-pad">
      <header className="topbar">
        <div className="brand">SurakshaSetu Kanban</div>
        <div className="auth">
          <span className="muted">Signed in as {email}</span>
          <SignOutButton />
        </div>
      </header>

      <KanbanBoard stickyColor={userColor} />
    </div>
  );
}
