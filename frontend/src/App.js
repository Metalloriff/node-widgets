import React from "react";
import "./App.scss";
import { Modals } from "./Components/Modals";
import Toasts from "./Components/Toasts";
import ContextMenu from "./Components/ContextMenuHandler";

export default function App() {
	return (
		<div className="App">
			<div className="Main">
				
			</div>

			<footer className="Footer">
				<div><a href="https://fontawesome.com/license">Icon License</a></div>
				<div className="Divider"/>
				<div>Copyright © 2021-{new Date().getFullYear()} Metalloriff</div>
				<div className="Divider"/>
				<div>Site by <a href="https://metalloriff.github.io/#contact">Metalloriff</a></div>
			</footer>

			<Modals/>
			<Toasts/>
			<ContextMenu.Handler/>
		</div>
	);
}