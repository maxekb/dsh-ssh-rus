// Modified for dsh-ssh-rus by maxekb (2026); based on @linxin666/dsh-ssh 0.4.2 (Apache-2.0). See NOTICE.
/**
 * Browser-half entry for the dsh-ssh plugin — runs inside the dsh web GUI.
 *
 * Registers the dsh-ssh locale dictionaries and mounts the two DOM surfaces:
 * the sidebar entry row (toggles the panel) and the SSH operations panel in
 * the center column. Failure policy: DOM mounting problems are logged, never
 * thrown — the web shell fails the whole boot when a plugin apply throws, and
 * an external plugin must not take the GUI down.
 *
 * Export discipline (packages/client rule): the /client surface carries what
 * cordis loading needs plus types only — all value exports stay internal.
 */
import type { Context as ClientContext } from '@deepseek-ai/cordis'
// Type-only: pulls the locale plugin's Context merge (ctx.locale).
import type {} from '@deepseek-ai/dsh-client-locale/client'
// Type-only: pulls the shared-forms Context merge (ctx.configForms).
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
// Type-only: pulls the ctx.slots merge (the renderer owns the slot registry since 0.1.2).
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
// Type-only: pulls the LocaleNamespaceMap merge table.
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { SshApi } from './api.ts'
import { en, zh, type SshKey } from './locales.ts'
import { ru } from './locales.ru.ts'
import { mountPanel } from './mount.tsx'
import { PanelController } from './panel/controller.ts'
import type { TerminalFontSource } from './panel/helpers.ts'
import { setRuntimeTranslate } from './panel/helpers.ts'
import { bindSettingsReader } from './settings-binding.ts'
import { mountSidebarEntry } from './sidebar-entry.ts'

/** Locale namespace this plugin owns. */
const NS = 'dsh-ssh-rus'

/**
 * Family settings namespace the terminal-font preference is addressed by
 * (issue #577); dsh-web-settings maps it to the owning profile entry id.
 */
const SETTINGS_NS = 'dsh-ssh'

/** The dsh-ssh settings section the browser half reads. */
interface SshClientSettings {
  /** User-configured xterm fontFamily; empty/undefined means the CSS chain. */
  terminalFontFamily?: string
}

/** The one field this plugin's own Config schema declares (its entry identity on the shared settings surface). */
const TERMINAL_FONT_FIELD = 'terminalFontFamily' satisfies keyof SshClientSettings

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-ssh-rus surface copy (zh / en / ru). */
    'dsh-ssh-rus': SshKey
  }
}

/** Required services (fiber inject waiting — the runtime must be up first). */
export const inject = ['slots', 'locale', 'configForms']

/** Type-only surface (export discipline: no value exports beyond the plugin contract). */
export type { PanelControllerSnapshot } from './panel/controller.ts'
export type { SshPanelProps } from './panel/SshPanel.tsx'
export type { HostsTabProps } from './panel/HostsTab.tsx'
export type { HostFormDialogProps } from './panel/HostFormDialog.tsx'
export type { TerminalTabProps } from './panel/TerminalTab.tsx'
export type { TransferTabProps } from './panel/TransferTab.tsx'
export type { TunnelsTabProps } from './panel/TunnelsTab.tsx'
export type { ClusterTabProps } from './panel/ClusterTab.tsx'
export type { SshKey } from './locales.ts'

/**
 * Mount the SSH panel.
 * @param ctx - client root context (locale service).
 */
export function apply(ctx: ClientContext): void {
  // This fork is self-hosted and reports nothing: the upstream anonymous daily
  // install heartbeat (which sent the package name to its author's endpoint) is
  // deliberately not called here.

  ctx.effect(() => {
    try {
      return ctx.locale.register(NS, { zh, en })
    } catch {
      return () => {}
    }
  }, 'dsh-ssh: dictionaries')

  // Russian surface copy. The Host's typed two-dictionary overload declares only
  // the built-in zh/en ids, so the fork registers its language through the
  // single-language form; a deployment without a `ru` language simply keeps the
  // English fallback.
  ctx.effect(() => {
    try {
      return ctx.locale.register(NS, 'ru', ru)
    } catch {
      return () => {}
    }
  }, 'dsh-ssh-rus: russian dictionary')

  // Wire the SDK translate seat into the module-level tt (sidebar row and
  // other plain-DOM callers): reads the active locale at call time, so they
  // follow the Language setting without a reload.
  try { setRuntimeTranslate(ctx.locale.bind(NS)) } catch { /* locale missing: document-language fallback stays */ }

  const controller = new PanelController()
  const api = new SshApi()
  // Live terminal-font preference (issue #577): the field lives in this
  // plugin's own profile entry, whose settings page the Host generates from
  // the plugin Config schema; the panel re-applies a change to open terminals
  // without a reconnect.
  const settings = bindSettingsReader<SshClientSettings>(ctx, SETTINGS_NS, TERMINAL_FONT_FIELD)
  const terminalFont: TerminalFontSource = {
    get: () => {
      const snapshot = settings.getSnapshot()
      return snapshot.status === 'ready' ? snapshot.value?.terminalFontFamily : undefined
    },
    subscribe: (listener) => settings.subscribe(listener),
  }
  ctx.effect(() => () => { settings.dispose() }, 'dsh-ssh: settings binding')
  const disposers: Array<() => void> = []
  try {
    disposers.push(mountSidebarEntry(controller, ctx.locale))
    disposers.push(mountPanel(controller, api, terminalFont, ctx.locale))
  } catch (error) {
    // DOM failures degrade the panel, never the GUI.
    console.warn('[dsh-ssh] mount failed:', error)
  }
  ctx.effect(() => () => {
    for (const dispose of disposers.splice(0)) dispose()
  }, 'dsh-ssh: ui mounts')
}
