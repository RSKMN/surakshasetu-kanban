// src/components/AuthButtons.tsx
import { supabase } from "../lib/supabaseClient";

export function SignInWithGoogleButton() {
  const signIn = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/callback`,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) console.error("OAuth error", error);
    if (data?.url) window.location.href = data.url;
  };
  return (
    <button className="btn-primary" onClick={signIn}>
      Continue with Google
    </button>
  );
}

export function SignOutButton() {
  return (
    <button className="btn-ghost" onClick={() => supabase.auth.signOut()}>
      Sign out
    </button>
  );
}
