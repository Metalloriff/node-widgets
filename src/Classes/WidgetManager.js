const { BrowserWindow, Menu } = require("electron");

const fs = require("fs");
const path = require("path");
const sucrase = require("sucrase");
const _ = require("lodash");
const WidgetPositionHandler = require("./WidgetPositionHandler");

module.exports = new class WidgetManager {
    // The default Electron browser window props
    defaultWindowProps = {
        frame: false,
        transparent: true,
        maximizable: false,
        minimizable: false,
        skipTaskbar: true,
        resizable: true,
        type: "desktop",
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        }
    };
    
    widgetInstances = {};

    /**
     * Initializes the widget browser window instance.
     * @param directoryPath The path to the widget's directory.
     * @param manifest The manifest.json contents for the widget.
     * @param config The widget config contents.
     * @returns {Promise<void>}
     */
    async initialize(directoryPath, manifest = {}, config = {}) {
        // Initialize the window instance
        const instance = new BrowserWindow(
            _.extend(
                { },
                this.defaultWindowProps,
                manifest.widgetProps,
                config.get("widgetProps", { })
            )
        );

        // Load and render the HTML data
        await instance.loadFile(path.join(__dirname, "..", "BaseWidget.html"));

        // Set the title to the directory name
        instance.title = directoryPath.split("\\").slice(-1)[0];
        
        // Set the position to the config position, if present
        const windowPosition = config.get("position", null);
        windowPosition && instance.setPosition(...windowPosition);
        
        // Set the size to the config size, if present
        const windowSize = config.get("size", null);
        windowSize && instance.setSize(...windowSize);
        
        // Get the Widget.js module path, and convert it to not retard slashes
        const widgetModulePath = path.join(__dirname, "Widget.js").replaceAll("\\", "/");
        
        // A little spaghetti to patch the require function and inject the Widget.js module into the browser window
        await instance.webContents.executeJavaScript(`
            ((require) => {${
                fs.readFileSync(widgetModulePath, "utf8")
            }})(require("module").createRequire("${widgetModulePath}"));
            
            document.title = "${instance.title}";
            
            //# sourceURL=nodeWidgets://${widgetModulePath}/`
        );
        
        // Finally, initialize the widget in the renderer, and store the instance
        instance.webContents.send("initialize", directoryPath);
        
        this.widgetInstances[instance.title] = {
            window: instance
        };
        
        // Send the widget to the desktop if it's not always on top
        !instance.isAlwaysOnTop() && WidgetPositionHandler.sendWindowToBack(instance.getNativeWindowHandle());
        
        // This doesn't actually do anything
        // Fuck you
        // ["minimize", "blur", "hide"].forEach(ev => instance.on(ev, () => instance.show()));
    }

    /**
     * Builds a context menu for a widget.
     * @param widget The widget to build from.
     * @returns {Electron.Menu} The Electron context menu item.
     */
    buildWidgetSubMenu(widget) {
        return [
            { label: "Open Settings", click: () => console.log("not yet added") },
            { label: "Open Dev Tools", click: () => widget.window.webContents.openDevTools() },

            // TODO add always on top option
            // TODO add opacity option
            // TODO add click through option

            { type: "separator" },

            { label: "Unlock Widget", click: () => widget.window.webContents.send("unlock") }
        ];
    }
}