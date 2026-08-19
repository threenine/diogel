/**
 * Minimal ambient declaration for Firefox's `sidebarAction` surface.
 *
 * `@types/chrome` does not declare it because it is Firefox-only. Porwr uses it through the
 * panel-surface port and never directly from a component, so this declaration only covers the
 * members the port calls.
 *
 * See MDN `sidebarAction`. `open()` may only be called from inside a user-action handler.
 */
declare namespace chrome {
  namespace sidebarAction {
    function open(): Promise<void>;
    function toggle(): Promise<void>;
    function close(): Promise<void>;
    function isOpen(details: { windowId?: number }): Promise<boolean>;
  }
}
