// src/App.tsx
import { useEffect, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import { SignInWithGoogleButton, SignOutButton } from "./components/AuthButtons";
import KanbanBoard from "./components/KanbanBoard";

export default function App() {
  const [ready, setReady] = useState(false);
  const [userColor, setUserColor] = useState<string>("#06D6A0"); // fallback
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data.session?.user ?? null;
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

  if (!ready) return <div style={{ padding: 16 }}>Loading…</div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
        {email ? <span>Signed in as {email}</span> : <span>Not signed in</span>}
        {email ? <SignOutButton /> : <SignInWithGoogleButton />}
      </div>
      <KanbanBoard stickyColor={userColor} />
    </div>
  );
}
