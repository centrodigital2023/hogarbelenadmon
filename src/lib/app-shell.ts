/**
 * index.html paints a static copy of the login screen (or a loader) in #app-shell
 * before any JavaScript arrives, so the first screen shows in well under 2 seconds
 * on phones and search engines see real content. React renders into #root and
 * removes the shell once its own screen is ready.
 */
const SHELL_ID = "app-shell";

export const hasAppShell = () =>
  typeof document !== "undefined" && document.getElementById(SHELL_ID) !== null;

export const removeAppShell = () => {
  document.getElementById(SHELL_ID)?.remove();
};

/** Supabase keeps the session in localStorage as sb-<project>-auth-token. */
export const hasStoredSession = () => {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && /^sb-.+-auth-token$/.test(key)) return true;
    }
  } catch {
    // Storage blocked (private mode): treat as signed out
  }
  return false;
};

export interface ShellLoginValues {
  email: string;
  password: string;
  focus: "email" | "password" | null;
}

/** What the person already typed in the static login form, so nothing is lost when React takes over. */
export const readShellLoginValues = (): ShellLoginValues => {
  if (typeof document === "undefined") return { email: "", password: "", focus: null };
  const email = document.getElementById("shell-email") as HTMLInputElement | null;
  const password = document.getElementById("shell-password") as HTMLInputElement | null;
  const active = document.activeElement;
  return {
    email: email?.value ?? "",
    password: password?.value ?? "",
    focus: active && active === email ? "email" : active && active === password ? "password" : null,
  };
};
