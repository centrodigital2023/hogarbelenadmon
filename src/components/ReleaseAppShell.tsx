import { useLayoutEffect } from "react";
import { removeAppShell } from "@/lib/app-shell";

/**
 * Removes the static first screen from index.html once React has painted a real one.
 * Place it next to the screen inside the same Suspense boundary, so it only commits
 * together with that screen; pass `ready={false}` while the screen is still loading data.
 */
const ReleaseAppShell = ({ ready = true }: { ready?: boolean }) => {
  useLayoutEffect(() => {
    if (ready) removeAppShell();
  }, [ready]);
  return null;
};

export default ReleaseAppShell;
