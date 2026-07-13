/**
 * Layout invariants for the application shell.
 *
 * The workspace boundary must be a constrained flex column. Direct view roots
 * use `flex-1 overflow-y-auto`; without a flex parent they grow past the
 * viewport and are clipped by the shell's `overflow-hidden` guard.
 */
export const WORKSPACE_CONTENT_CLASS_NAME =
  "flex min-h-0 flex-1 flex-col overflow-hidden" as const;
