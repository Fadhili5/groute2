"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface LayoutContextValue {
  sidebarWidth: number;
}

export const LayoutContext = createContext<LayoutContextValue>({ sidebarWidth: 240 });

export function useLayout() {
  return useContext(LayoutContext);
}

const STORAGE_KEY = "sidebar-collapsed";

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(240);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "true") setSidebarWidth(56);
  }, []);

  useEffect(() => {
    const handle = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setSidebarWidth(e.newValue === "true" ? 56 : 240);
    };
    window.addEventListener("storage", handle);
    return () => window.removeEventListener("storage", handle);
  }, []);

  return (
    <LayoutContext.Provider value={{ sidebarWidth }}>
      {children}
    </LayoutContext.Provider>
  );
}
