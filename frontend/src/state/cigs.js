import { useSyncExternalStore } from 'react'
import { probeUrl, startJob, cancelJob, revealInFinder, onJobEvent } from '@/tauri/commands'

/* Single store. Vanilla pub/sub + useSyncExternalStore — no extra deps.
   Doctrine: one active job at a time, queue empty since v1 has no batch. */

const INITIAL = {
  url: '',
  urlStatus: 'idle',          // 'idle' | 'probing' | 'ok' | 'unavailable'
  source: null,               // { title, platform, durationSec }
  selectedBranch: 'audio',    // one of 'audio' | 'transcript' | 'vocals' | 'twin'
  jobState: 'idle',           // 'idle' | 'running' | 'done' | 'cancelled'
  jobProgress: 0,             // 0..1
  jobId: null,
  jobOutputPath: null,
  cancelConfirm: false,
}

let state = INITIAL
const listeners = new Set()

function set(updater) {
  state = typeof updater === 'function' ? updater(state) : { ...state, ...updater }
  listeners.forEach((fn) => fn())
}

function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function getState() { return state }

export function useCigs(selector = (s) => s) {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(state),
  )
}

/* ------------------------------- actions ------------------------------- */

let probeSeq = 0

export function setUrl(url) {
  set({
    url,
    urlStatus: url.trim().length === 0 ? 'idle' : 'probing',
    source: null,
  })
  if (url.trim().length === 0) return
  probeUrlDebounced(url)
}

let probeTimer = null
function probeUrlDebounced(url) {
  if (probeTimer) clearTimeout(probeTimer)
  probeTimer = setTimeout(() => runProbe(url), 450)
}

async function runProbe(url) {
  const seq = ++probeSeq
  const result = await probeUrl(url).catch(() => null)
  if (seq !== probeSeq) return // a newer probe replaced this one
  if (!result) {
    // browser dev mode (no Tauri) — leave urlStatus as 'idle' with no source
    set({ urlStatus: 'idle', source: null })
    return
  }
  if (result.status === 'ok') {
    set({
      urlStatus: 'ok',
      source: {
        title: result.title,
        platform: result.platform,
        durationSec: result.durationSec,
      },
    })
  } else {
    set({ urlStatus: 'unavailable', source: null })
  }
}

export function selectBranch(id) {
  set({ selectedBranch: id })
}

export async function startSelectedJob() {
  const { url, selectedBranch, urlStatus, jobState } = state
  if (jobState !== 'idle') return
  if (!url.trim() || urlStatus !== 'ok') return
  set({ jobState: 'running', jobProgress: 0, jobOutputPath: null })
  const result = await startJob(url.trim(), selectedBranch).catch(() => null)
  if (result?.id) set({ jobId: result.id })
}

export function requestCancel() {
  if (state.jobState !== 'running') return
  set({ cancelConfirm: true })
}

export function dismissCancel() {
  set({ cancelConfirm: false })
}

export async function confirmCancel() {
  set({ cancelConfirm: false })
  await cancelJob().catch(() => {})
}

export async function reveal(path) {
  return revealInFinder(path)
}

/* --------------------------- engine event tap -------------------------- */

let unlistenJob = null

export function startEngineSubscription() {
  if (unlistenJob) return
  unlistenJob = onJobEvent((ev) => {
    if (!ev || typeof ev !== 'object') return
    switch (ev.kind) {
      case 'started':
        set({ jobId: ev.id, jobState: 'running', jobProgress: 0 })
        break
      case 'probed':
        // engine just confirmed source mid-job — keep frontend source in sync
        set({ source: { title: ev.source.title, platform: ev.source.platform, durationSec: ev.source.durationSec } })
        break
      case 'progress':
        set({ jobProgress: Math.max(state.jobProgress, ev.progress) })
        break
      case 'done':
        set({ jobState: 'done', jobProgress: 1, jobOutputPath: ev.outputPath })
        // auto-reveal in Finder per doctrine
        revealInFinder(ev.outputPath).catch(() => {})
        // brief check, then back to idle
        setTimeout(() => {
          set({ jobState: 'idle', jobProgress: 0, jobId: null })
        }, 700)
        break
      case 'cancelled':
        set({ jobState: 'idle', jobProgress: 0, jobId: null })
        break
      case 'url-unavailable':
        // engine-side failure surfaces as URL unavailable per doctrine
        set({
          jobState: 'idle',
          jobProgress: 0,
          jobId: null,
          urlStatus: 'unavailable',
          source: null,
        })
        break
      default:
        break
    }
  })
}

export function stopEngineSubscription() {
  if (unlistenJob) { unlistenJob(); unlistenJob = null }
}
