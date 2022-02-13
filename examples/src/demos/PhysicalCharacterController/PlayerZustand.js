import create from 'zustand'

const useStore = create((set) => ({
  lives: 3,
  loseLife: () => set((state) => ({ lives: state.lives - 1 })),
  addLife: () => set((state) => ({ lives: state.lives + 1 })),
}))

export default () => {
  return [
    {
      lives: useStore((state) => state.lives),
      loseLife: useStore((state) => state.loseLife),
      addLife: useStore((state) => state.addLife),
    },
  ]
}
