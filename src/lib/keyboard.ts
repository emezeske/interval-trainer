type PedalCallback = (action: "repeat" | "next") => void;

/** Set up keyboard listeners for page turners and arrow key control */
export function setupKeyboardFallback(onAction: PedalCallback): () => void {
  const handler = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
      e.preventDefault();
      onAction("next");
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
      e.preventDefault();
      onAction("repeat");
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}
