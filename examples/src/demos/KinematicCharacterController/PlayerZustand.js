import create from 'zustand'

const useStore = create(set => ({
    lives: 3,
    loseLife: () => set(state => ({lives: state.lives - 1})),
    addLife: () => set(state => ({lives: state.lives + 1})),
    belowSplash: [0,0],
    setBelowSplash: (position) => set(() => ({belowSplash: position})),
    leftSplash: [0,0],
    setLeftSplash: (position) => set(() => ({leftSplash: position})),
    rightSplash: [0,0],
    setRightSplash: (position) => set(() => ({rightSplash: position})),
}))

export default () => {

    return [
        {
            lives: useStore(state => state.lives),
            loseLife: useStore(state => state.loseLife),
            addLife: useStore(state => state.addLife),
            belowSplash: useStore(state => state.belowSplash),
            setBelowSplash: useStore(state => state.setBelowSplash),
            leftSplash: useStore(state => state.leftSplash),
            setLeftSplash: useStore(state => state.setLeftSplash),
            rightSplash: useStore(state => state.rightSplash),
            setRightSplash: useStore(state => state.setRightSplash),
        }
    ]

}
