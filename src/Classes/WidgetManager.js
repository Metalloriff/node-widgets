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

        // Set the title to the directory name
        instance.title = directoryPath.split("\\").slice(-1)[0];

        // Load and render the HTML data
        await instance.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(`
            <!DOCTYPE html>
            <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <title>${instance.title}</title>
                </head>
                <body>
                    <div id="root"></div>
                    
                    <svg width="25px" height="25px" viewBox="0 0 448 512" fill="white" xmlns="http://www.w3.org/2000/svg" class="lockButton" onclick="lockWidget()">
                        <path d="M400 224h-24v-72C376 68.2 307.8 0 224 0S72 68.2 72 152v72H48c-26.5 0-48 21.5-48 48v192c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V272c0-26.5-21.5-48-48-48zm-104 0H152v-72c0-39.7 32.3-72 72-72s72 32.3 72 72v72z"/>
                    </svg>
                </body>
            </html>
        `)}`);
        
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
            }})(require("module").createRequire("${widgetModulePath}"))
            
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

            // TODO add always on top option
            // TODO add opacity option
            // TODO add click through option

            { type: "separator" },

            { label: "Unlock Widget", click: () => widget.window.webContents.send("unlock") }
        ];
    }
}