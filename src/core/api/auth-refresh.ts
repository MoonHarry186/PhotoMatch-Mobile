export type RefreshAction = () => Promise<string | null>;

let activeRefresh: Promise<string | null> | null = null;
let refreshAction: RefreshAction | null = null;

export function registerRefreshAction(action: RefreshAction | null): void {
  refreshAction = action;
}

export async function refreshAccessToken(): Promise<string | null> {
  if (!refreshAction) return null;
  if (!activeRefresh) {
    activeRefresh = refreshAction().finally(() => {
      activeRefresh = null;
    });
  }
  return activeRefresh;
}

export const coordinatedRefresh = refreshAccessToken;
