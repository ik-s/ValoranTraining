import "./styles/tokens.css";
import "./styles/app.css";
import "./styles/training.css";
import { App } from "./app/App";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Application root was not found.");
}

new App(root).mount();
