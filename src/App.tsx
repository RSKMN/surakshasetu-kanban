import { useEffect, useMemo, useState } from "react";
import { supabase } from "./lib/supabaseClient";
import KanbanBoard from "./components/KanbanBoard";
import Callback from "./auth/Callback";

type User = {
  id: string;
  email?: string;
  user_metadata?: Record<string, any>;
};

const getBaseUrl = () => {
  let url =
    import.meta.env.VITE_SITE_URL ||
    import.meta.env.VITE_VERCEL_URL ||
    "http://localhost:5173";
  if (!url.startsWith("http")) url = `https://${url}`;
  return url.replace(/\/+$/, "");
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<"landing" | "board" | "callback">(() =>
    window.location.pathname.startsWith("/auth/callback")
      ? "callback"
      : "landing"
  );
  const [stickyColor, setStickyColor] = useState<string>("#FDE68A");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = (session?.user as User) ?? null;
      setUser(u);
      if (u) {
        setPage("board");
        await ensureProfileLoaded(u.id);
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, ses) => {
      const u = (ses?.user as User) ?? null;
      setUser(u);
      if (u) {
        setPage("board");
        await ensureProfileLoaded(u.id);
      } else setPage("landing");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function ensureProfileLoaded(uid: string) {
    const { data } = await supabase
      .from("profiles")
      .select("sticky_color")
      .eq("id", uid)
      .maybeSingle();
    if (data?.sticky_color) setStickyColor(data.sticky_color);
  }

  async function updateColor(c: string) {
    if (!user) return;
    setStickyColor(c);
    await supabase
      .from("profiles")
      .upsert({ id: user.id, sticky_color: c })
      .eq("id", user.id);
  }

  async function signInWithGoogle() {
    const redirectTo = `${getBaseUrl()}/auth/callback`;
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
  }
  async function signOut() {
    await supabase.auth.signOut();
    setPage("landing");
  }

  const displayName = useMemo(() => {
    const meta = user?.user_metadata || {};
    return meta.full_name || meta.name || meta.user_name || user?.email || "Member";
  }, [user]);

  if (page === "callback") return <Callback />;

  if (!user) {
    return (
      <main className="min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-900 via-slate-900 to-black" />
        <div className="animated-blur" />
        <header className="max-w-7xl mx-auto px-6 pt-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 grid place-items-center text-indigo-300 font-bold">
              SS
            </div>
            <h1 className="text-xl md:text-2xl font-semibold text-white">
              SurakshaSetu • Stakelock
            </h1>
          </div>
          <button onClick={signInWithGoogle} className="btn-primary">
            Sign in with Google
          </button>
        </header>

        <section className="max-w-7xl mx-auto px-6 py-16 md:py-24">
          <div className="grid md:grid-cols-12 gap-10 items-center">
            <div className="md:col-span-7">
              <p className="text-sm tracking-widest uppercase text-indigo-300/80">
                Welcome, Collaborator
              </p>
              <h2 className="mt-3 text-4xl md:text-6xl font-extrabold leading-tight text-white">
                Thank you for teaming up on{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-300">
                  SurakshaSetu
                </span>{" "}
                Mobile App
              </h2>
              <p className="mt-5 text-slate-300/90 md:text-lg">
                Plan, prioritize, and deliver with a delightful Kanban experience.
              </p>
              <div className="mt-8 flex gap-4">
                <button onClick={signInWithGoogle} className="btn-glass">
                  Start Collaborating
                </button>
                <a
                  href="#features"
                  className="btn-ghost"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Explore Features
                </a>
              </div>
              <div className="mt-10 grid sm:grid-cols-3 gap-4">
                {[
                  { label: "Tasks Organized", value: "Kanban Flow" },
                  { label: "Real‑time Sync", value: "Supabase" },
                  { label: "UX Aesthetic", value: "Glassmorphism" },
                ].map((k) => (
                  <div key={k.label} className="glass-card p-4 text-slate-200 border border-white/10">
                    <p className="text-sm text-slate-300/80">{k.label}</p>
                    <p className="text-lg font-semibold">{k.value}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="md:col-span-5">
              <div className="glass-card p-4 md:p-6 border border-white/10">
                <div className="w-full h-80 bg-gradient-to-br from-cyan-400/20 to-indigo-300/20 rounded-xl" />
                <p className="text-slate-300/90 text-sm mt-3">
                  Modern hero patterns with glass effects.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-900 via-slate-900 to-black" />
      <div className="animated-blur" />
      <header className="max-w-7xl mx-auto px-6 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/10 grid place-items-center text-indigo-300 font-bold">
            SS
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-semibold text-white">SurakshaSetu Board</h1>
            <p className="text-xs text-slate-300/80">Welcome, {displayName}.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={stickyColor}
            onChange={(e) => updateColor(e.target.value)}
            title="Sticky color"
            className="h-9 w-9 rounded-md bg-transparent border border-white/20"
          />
          <button onClick={signOut} className="btn-ghost">Sign out</button>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-6 py-8">
        <KanbanBoard stickyColor={stickyColor} />
      </section>
    </main>
  );
}
