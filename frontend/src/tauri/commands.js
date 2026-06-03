/* Tauri bridge. The frontend never talks to subprocesses directly —
   every operation goes through a Rust command. In browser dev (no Tauri
   shell), the bridge is a no-op so the UI still renders. */

const TAURI = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

async function invoke(cmd, args) {
  if (!TAURI) return null
  const mod = await import('@tauri-apps/api/core')
  return mod.invoke(cmd, args)
}

async function listen(event, handler) {
  if (!TAURI) return () => {}
  const mod = await import('@tauri-apps/api/event')
  return mod.listen(event, handler)
}

export const isTauri = TAURI

export async function probeUrl(url) {
  return invoke('probe_url', { url })
}

export async function startJob(url, branch) {
  return invoke('start_job', { url, branch })
}

export async function cancelJob() {
  return invoke('cancel_job')
}

export async function revealInFinder(path) {
  return invoke('reveal_in_finder', { path })
}

export function onJobEvent(handler) {
  let unlisten = null
  const p = listen('job://event', (e) => handler(e.payload))
  p.then((fn) => { unlisten = fn })
  return () => { if (unlisten) unlisten() }
}
