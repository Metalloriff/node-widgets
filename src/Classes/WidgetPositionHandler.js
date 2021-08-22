const {
    SetWindowPos,
    HWND_BOTTOM,
    SWP_NOACTIVATE,
    SWP_NOSIZE,
    SWP_NOMOVE
} = require("win-setwindowpos");

module.exports = new class {
    sendWindowToBack(handle) {
        SetWindowPos(handle, HWND_BOTTOM, 0, 0, 0, 0, SWP_NOACTIVATE | SWP_NOSIZE | SWP_NOMOVE);
    }
};