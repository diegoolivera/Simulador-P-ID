import { create } from 'zustand';

type View = 'scada' | 'trends' | 'report';
type Theme = 'light' | 'dark';
type Dialog = 'loto' | 'esd' | null;
interface Tooltip { tag: string; x: number; y: number; }

type State = {
  view: View;
  selectedTag: string | null;
  dialog: Dialog;
  theme: Theme;
  tooltip: Tooltip | null;
  setView: (view: View) => void;
  selectTag: (tag: string | null) => void;
  openDialog: (dialog: Exclude<Dialog, null>) => void;
  closeDialog: () => void;
  setTheme: (theme: Theme) => void;
  showTooltip: (tooltip: Tooltip) => void;
  hideTooltip: () => void;
};

export const useUiStore = create<State>()((set) => ({
  view: 'scada',
  selectedTag: null,
  dialog: null,
  theme: 'light',
  tooltip: null,
  setView: (view) => set({ view }),
  selectTag: (tag) => set({ selectedTag: tag }),
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  setTheme: (theme) => set({ theme }),
  showTooltip: (tooltip) => set({ tooltip }),
  hideTooltip: () => set({ tooltip: null }),
}));
