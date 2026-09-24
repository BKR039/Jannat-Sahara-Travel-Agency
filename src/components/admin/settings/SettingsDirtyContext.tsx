import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface SettingsDirtyContextValue {
  isDirty: boolean;
  setIsDirty: (dirty: boolean) => void;
  lastSavedAt: Date | null;
  setLastSavedAt: (date: Date | null) => void;
}

const SettingsDirtyContext = createContext<SettingsDirtyContextValue>({
  isDirty: false,
  setIsDirty: () => {},
  lastSavedAt: null,
  setLastSavedAt: () => {},
});

export function SettingsDirtyProvider({ children }: { children: ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Warn on browser tab close or full page reload when dirty
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  return (
    <SettingsDirtyContext.Provider
      value={{
        isDirty,
        setIsDirty,
        lastSavedAt,
        setLastSavedAt,
      }}
    >
      {children}
    </SettingsDirtyContext.Provider>
  );
}

export function useSettingsDirty() {
  return useContext(SettingsDirtyContext);
}

/**
 * Convenient hook for sections to report their dirty state and latest save timestamp.
 */
export function useTrackDirty(dirty: boolean, lastSaved?: Date | null) {
  const { setIsDirty, setLastSavedAt } = useSettingsDirty();

  useEffect(() => {
    setIsDirty(dirty);
    return () => setIsDirty(false);
  }, [dirty, setIsDirty]);

  useEffect(() => {
    if (lastSaved) {
      setLastSavedAt(lastSaved);
    }
  }, [lastSaved, setLastSavedAt]);
}
