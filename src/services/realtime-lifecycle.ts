let disconnectAction: (() => void) | null = null;

export const realtimeLifecycle = {
  registerDisconnect(action: (() => void) | null) {
    disconnectAction = action;
  },
  disconnect() {
    disconnectAction?.();
    disconnectAction = null;
  },
};
