const { app, dialog, Menu, Tray } = require("electron");
const fs = require("fs");
const path = require("path");
const chokidar = require("chokidar");

const WidgetManager = require("./Classes/WidgetManager");
const WidgetConfig = require("./Classes/WidgetConfig");

module.exports = {
    widgets: { },
    loadStyles: async function (widgetName, styleSource) {
        // Create a timeout and then wait for the widget to load
        // This is bad, do not do this
        const timeout = Date.now() + 10000;
        while (!module.exports.widgets[widgetName]) {
            if (Date.now() >= timeout) throw new Error(`Failed to import styles for "${widgetName}"! Widget not found/loaded!`);
            
            await new Promise(r => setTimeout(r, 250));
        }
        
        // Get the widget from the active widgets list
        const widget = module.exports.widgets[widgetName];
        
        // Inject the stylesheet source into the electron window
        // If an error is caught, display it to the user
        widget.instance.webContents.insertCSS(styleSource).catch(err =>
            dialog.showErrorBox(`Failed to load styles for "${widgetName}"!`, err.stack));
    }
};

let tray;
/**
 * Handle initializing the tray.
 */
function initTray() {
    // Create the tray if it doesn't exist
    if (!tray) tray = new Tray(path.join(__dirname, "trayIcon.png"));
    
    // Build the context menu for the tray
    const menu = Menu.buildFromTemplate([
        // Handle opening the main settings modal
        { label: "Open Settings", click: () => console.log("not yet added") },
        
        { // Create the widgets sub-menu
            type: "submenu",
            label: "Widgets",
            submenu: Menu.buildFromTemplate(
                // Map the widget instances to menus
                Object.entries(WidgetManager.widgetInstances).map(([widgetName, widget]) => ({
                    type: "submenu",
                    label: widgetName,
                    // Build the widget sub-menu
                    submenu: WidgetManager.buildWidgetSubMenu(widget)
                }))
            )
        },
        
        { type: "separator" },
        
        // Close the app
        { label: "Exit", click: () => app.exit(1) }
    ]);
    
    // Set the tooltip and context menu
    tray.setToolTip(`Node Widgets - Version ${app.getVersion()}`);
    tray.setContextMenu(menu);
}

/**
 * Handle loading and initializing all widgets.
 */
async function initWidgets() {
    function handleError(widgetName, err) {
        // If an error is caught, throw it to the main console
        console.error(`There was an error initializing ${widgetName}!`, err);

        // And display the error to the user
        dialog.showErrorBox(`There was an error loading widget "${widgetName}"!`, err.stack);
    }
    
    // Get the paths to our app data directories
    const paths = {
        data: path.join(process.env.APPDATA, "Node Widgets"),
        widgets: path.join(process.env.APPDATA, "Node Widgets", "Widgets")
    };
    
    // Iterate through our path values, if the directory doesn't exist, create it
    // This is to prevent any missing file path errors
    Object.values(paths).forEach(fp => !fs.existsSync(fp) && fs.mkdirSync(fp));
    
    // Read all of the files in our widgets path
    const widgets = fs.readdirSync(paths.widgets);
    // Iterate through the widget filenames
    for (const widgetName of widgets) {
        // Convert the widget filename into its full file path
        const widgetPath = path.join(paths.widgets, widgetName);
        
        // If the widget is not a directory or, ignore it
        if (!fs.lstatSync(widgetPath).isDirectory()) continue;
        
        // Create the initializer
        async function initWidget() {
            // Get the manifest and config properties
            const manifest = require(path.join(widgetPath, "manifest.json"));
            const config = new WidgetConfig(widgetPath);

            // Initialize the widget in the manager and handle any errors
            await WidgetManager.initialize(widgetPath, manifest, config).catch(handleError.bind(null, widgetName));
            initTray();
        }
        
        // Create file watcher de-bounce event
        async function reInitWidget() {
            // Close the widget if it already exists
            WidgetManager.widgetInstances[widgetName]?.window?.close();
            
            // Re-initialize the widget
            await initWidget();
        }
        
        // Try-catch to prevent a block in the widget loading sequence
        try {
            // Initialize the widget for the first time
            await initWidget();
            
            // Create the initial boolean and a de-bouncer
            let initial = true;
            let deBouncer;
            
            // Watch for any file changes in the directory
            chokidar.watch(widgetPath).on("all", (type, fp) => {
                // De-bounce to prevent rapid reloading
                clearTimeout(deBouncer);
                deBouncer = setTimeout(() => {
                    // If this is the first time, ignore it
                    if (initial) return initial = false;
                    
                    // Re-initialize the widget, catching any errors
                    reInitWidget().catch(handleError.bind(null, widgetName));
                }, 500);
            });
        }
        catch (err) {
            handleError(widgetName, err);
        }
    }
}

async function init() {
    global.React = require("react");
    global.ReactDOM = require("react-dom");
    global.ReactDOMServer = require("react-dom/server");
    
    // Initialize each individual component
    await initWidgets();
    initTray();
}

// Disable hardware acceleration because hardware acceleration is a useless sack of garbage that just slows apps down and causes them to crash randomly for no reason
app.disableHardwareAcceleration();
// And then initialize when ready :)
app.whenReady().then(init);