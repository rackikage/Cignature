import { useEffect, useRef } from "react";

// Cursor-tracked motion for the radial HUD. Writes several CSS vars onto the
// stage so the visual layers react without React re-rendering:
//   --hud-rx / --hud-ry : tilt (deg) for the perspective parallax
//   --hud-mx / --hud-my : cursor offset from center (-1..1) for layer parallax
//   --hud-gx / --hud-gy : cursor position (%) for the follow-glow
// rAF-damped toward the target; only loops while settling. Fully disabled under
// prefers-reduced-motion — no listeners attach and the vars stay at rest.
export function useHudPointer(maxTilt = 9) {
  const stageRef = useRef(null);
  const rest = { rx: 0, ry: 0, mx: 0, my: 0, gx: 50, gy: 50 };
  const target = useRef({ ...rest });
  const current = useRef({ ...rest });
  const raf = useRef(0);
  const running = useRef(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const write = () => {
      const c = current.current;
      stage.style.setProperty("--hud-rx", c.rx.toFixed(2) + "deg");
      stage.style.setProperty("--hud-ry", c.ry.toFixed(2) + "deg");
      stage.style.setProperty("--hud-mx", c.mx.toFixed(3));
      stage.style.setProperty("--hud-my", c.my.toFixed(3));
      stage.style.setProperty("--hud-gx", c.gx.toFixed(1) + "%");
      stage.style.setProperty("--hud-gy", c.gy.toFixed(1) + "%");
    };

    const loop = () => {
      const c = current.current;
      const t = target.current;
      let settled = true;
      for (const k of ["rx", "ry", "mx", "my", "gx", "gy"]) {
        c[k] += (t[k] - c[k]) * 0.13;
        if (Math.abs(t[k] - c[k]) > 0.01) settled = false;
      }
      write();
      if (settled) {
        Object.assign(c, t);
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
      const nx = (e.clientX - r.left) / r.width; // 0..1
      const ny = (e.clientY - r.top) / r.height; // 0..1
      const t = target.current;
      t.rx = (nx - 0.5) * 2 * maxTilt;
      t.ry = -(ny - 0.5) * 2 * maxTilt;
      t.mx = (nx - 0.5) * 2;
      t.my = (ny - 0.5) * 2;
      t.gx = nx * 100;
      t.gy = ny * 100;
      kick();
    };

    const onLeave = () => {
      Object.assign(target.current, rest);
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
