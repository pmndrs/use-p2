import { render } from "react-dom"
import "./styles.css"
import App from "./App"
import Intro from "./Intro"

render(
    <Intro>
        <App />
    </Intro>,
    document.getElementById("root"),
)
