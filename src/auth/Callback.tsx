import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Callback() {
  useEffect(() => {
    supabase.auth.getSession().finally(() => {
      window.location.replace("/");
    });
  }, []);
  return (
    <main className="min-h-screen grid place-items-center bg-gradient-to-br from-indigo-900 via-slate-900 to-black">
      <div className="glass-card p-6 border border-white/10 text-slate-200">
        Signing in...
      </div>
    </main>
  );
}
