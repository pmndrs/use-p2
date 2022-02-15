import { cloneElement, useState } from 'react'

export default function Intro({ children }) {
  const [clicked, setClicked] = useState(false)
  return (
    <>
      {cloneElement(children, { ready: clicked })}
      <div className={`fullscreen bg ready"} ${clicked && 'clicked'}`}>
        <div className="stack">
          <button onClick={() => setClicked(true)}>{'click to continue'}</button>
        </div>
      </div>
    </>
  )
}
