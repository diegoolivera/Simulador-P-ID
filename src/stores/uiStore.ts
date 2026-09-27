import { create } from 'zustand';

type View = 'scada' | 'rounds' | 'report';
type Theme = 'light' | 'dark';
type Dialog = 'loto' | 'esd' | null;
type Template = 'basic' | 'medium' | 'complex';
interface Tooltip { tag: string; x: number; y: number; }

type State = {
  view: View;
  selectedTag: string | null;
  dialog: Dialog;
  theme: Theme;
  tooltip: Tooltip | null;
  editMode: boolean;
  template: Template;
  setView: (view: View) => void;
  selectTag: (tag: string | null) => void;
  openDialog: (dialog: Exclude<Dialog, null>) => void;
  closeDialog: () => void;
  setTheme: (theme: Theme) => void;
  showTooltip: (tooltip: Tooltip) => void;
  hideTooltip: () => void;
  setEditMode: (editMode: boolean) => void;
  setTemplate: (template: Template) => void;
};

export const useUiStore = create<State>()((set) => ({
  view: 'scada',
  selectedTag: null,
  dialog: null,
  theme: 'dark',
  tooltip: null,
  editMode: false,
  template: 'complex',
  setView: (view) => set({ view }),
  selectTag: (tag) => set({ selectedTag: tag }),
  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null }),
  setTheme: (theme) => set({ theme }),
  showTooltip: (tooltip) => set({ tooltip }),
  hideTooltip: () => set({ tooltip: null }),
  setEditMode: (editMode) => set({ editMode }),
  setTemplate: (template) => set({ template }),
}));
