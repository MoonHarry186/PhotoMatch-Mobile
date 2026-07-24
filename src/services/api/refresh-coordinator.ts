type RefreshAction = () => Promise<string | null>;

let activeRefresh: Promise<string | null> | null = null;
let action: RefreshAction | null = null;

export function registerRefreshAction(next: RefreshAction | null) {
  action = next;
}

export async function coordinatedRefresh(): Promise<string | null> {
  if (!action) return null;
  if (!activeRefresh) {
    activeRefresh = action().finally(() => {
      activeRefresh = null;
    });
  }
  return activeRefresh;
}
