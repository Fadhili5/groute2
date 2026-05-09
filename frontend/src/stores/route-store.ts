import { create } from "zustand";
import type { RouteVisualization, AIRecommendation } from "@/types";

interface RouteState {
  activeRoute: RouteVisualization | null;
  aiRecommendation: AIRecommendation | null;
  loading: boolean;
  error: string | null;
  setActiveRoute: (route: RouteVisualization | null) => void;
  setAiRecommendation: (rec: AIRecommendation | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useRouteStore = create<RouteState>((set) => ({
  activeRoute: null,
  aiRecommendation: null,
  loading: false,
  error: null,
  setActiveRoute: (activeRoute) => set({ activeRoute }),
  setAiRecommendation: (aiRecommendation) => set({ aiRecommendation }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
