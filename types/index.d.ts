/** A look's id, or 'off' for the app's own look. */
export type LookId = string

// The plugin's session state: the look being worn, so the /look list redraws
// its marker when a button switches the look.
declare module 'claude-code' {
  interface PluginState {
    looks: { current: LookId }
  }
}
