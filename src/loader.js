const sucrase = require("sucrase");
const fs = require("fs");
const sass = require("sass");
const electron = require("electron");

// The patched import callback
const patchedImport = (module, fp) => {
    // Get the module's source as string
    const content = fs.readFileSync(fp, "utf8");
    // If the import is a lib import, return it as normal
    if (/node_modules/.test(fp)) return module._compile(content, fp);
    
    // Transform the TS/JSX/TSX and get its source code
    const { code } = sucrase.transform(content, { transforms: ["typescript", "imports", "jsx"] });
    
    // Compile the transformed code
    module._compile(code, fp);
};

// Patch the importers
require.extensions[".js"] = patchedImport;
require.extensions[".jsx"] = patchedImport;
require.extensions[".ts"] = patchedImport;
require.extensions[".tsx"] = patchedImport;

// The patched style sheet import callback
const patchedStyleSheetImports = (module, fp) => {
    // Use the sass module to compile the style sheet to plain CSS source code
    const code = sass.renderSync({ file: fp }).css.toString();

    // Load the styles to the widget's web contents
    electron.remote.getCurrentWindow().webContents.insertCSS(code);
};

// Patch the importers
require.extensions[".css"] = patchedStyleSheetImports;
require.extensions[".scss"] = patchedStyleSheetImports;
require.extensions[".sass"] = patchedStyleSheetImports;