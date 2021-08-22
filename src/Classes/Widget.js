const WidgetConfig = require("./WidgetConfig");
const { ipcRenderer, remote } = window.require("electron");
const path = require("path");

// Require the load patcher, and the base styles
require("../loader");
require("../widgetStyles.scss");

// Set the globals, the same as the main process
global.React = require("react");
global.ReactDOM = require("react-dom");
global.ReactDOMServer = require("react-dom/server");

// Listen for the init event, to create and render our widget instance
ipcRenderer.on("initialize", (_, fp) => {
    // Require the widget from its path
    let widget = require(path.join(fp, "main.js"));
    // If the init function doesn't exist, try getting the default export
    if (typeof(widget.initialize) !== "function") widget = widget.default;
    
    // Try to init
    widget.initialize(fp);
});

// Define the lock and unlock events
window.lockWidget = () => {
    // Remove the unlocked styles
    document.documentElement.classList.remove("unlocked");
    
    // Save the current position to the config
    window.widget.config.set("position", remote.getCurrentWindow().getPosition());
    // Save the current size to the config
    window.widget.config.set("size", remote.getCurrentWindow().getSize());
};

ipcRenderer.on("unlock", () => document.documentElement.classList.add("unlocked"));

// Define and export the Widget base class
global.Widget = module.exports = class Widget {
    // Meta data
    fp;
    
    // Instance data
    config = null;

    /**
     * Initializes the widget instance.
     * @param directoryPath The path to the directory of the widget.
     */
    initialize(directoryPath) {
        // Initialize the file path and config
        this.fp = directoryPath;
        this.config = new WidgetConfig(directoryPath);
        
        // Define the widget instance to the window
        window.widget = this;
        
        // Render to the DOM
        ReactDOM.render(this.render(), document.getElementById("root"));
    }

    /**
     * Renders a react component to the widget's web contents.
     * @returns {React.ReactElement | null} The component to render.
     */
    render() {
        return null;
    }
}