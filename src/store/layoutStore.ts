import { create } from 'zustand'

interface LayoutStore {
  pdfMode: boolean
  setPdfMode: (v: boolean) => void
}

export const useLayoutStore = create<LayoutStore>((set) => ({
  pdfMode: false,
  setPdfMode: (pdfMode) => set({ pdfMode }),
}))
