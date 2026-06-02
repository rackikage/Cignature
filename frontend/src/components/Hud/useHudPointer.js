import { useEffect, useRef } from "react";

// Cursor-tracked tilt for the radial HUD. Writes `--hud-rx` / `--hud-ry`
// (degrees) onto the stage element; the tilt layer consumes them via CSS, so
// React never re-renders on pointer movement. rAF-damped toward the target and
// only spins the loop while it's settling. Fully disabled under
// prefers-reduced-motion — no listeners attach, the vars stay at 0deg.
export function useHudPointer(maxTilt = 6) {
  const stageRef = useRef(null);
  const target = useRef({ rx: 0, ry: 0 });
  const current = useRef({ rx: 0, ry: 0 });
  const raf = useRef(0);
  const running = useRef(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const write = () => {
      stage.style.setProperty("--hud-rx", current.current.rx.toFixed(2) + "deg");
      stage.style.setProperty("--hud-ry", current.current.ry.toFixed(2) + "deg");
    };

    const loop = () => {
      const c = current.current;
      const t = target.current;
      c.rx += (t.rx - c.rx) * 0.12;
      c.ry += (t.ry - c.ry) * 0.12;
      write();
      if (Math.abs(t.rx - c.rx) < 0.02 && Math.abs(t.ry - c.ry) < 0.02) {
        c.rx = t.rx;
        c.ry = t.ry;
        write();
        running.current = false;
        return;
      }
      raf.current = requestAnimationFrame(loop);
    };

    const kick = () => {
      if (!running.current) {
        running.current = true;
        raf.current = requestAnimationFrame(loop);
      }
    };

    const onMove = (e) => {
      const r = stage.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5; // -0.5..0.5
      const py = (e.clientY - r.top) / r.height - 0.5;
      target.current.rx = px * 2 * maxTilt;
      target.current.ry = -py * 2 * maxTilt;
      kick();
    };

    const onLeave = () => {
      target.current.rx = 0;
      target.current.ry = 0;
      kick();
    };

    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);
    return () => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf.current);
      running.current = false;
    };
  }, [maxTilt]);

  return stageRef;
}
