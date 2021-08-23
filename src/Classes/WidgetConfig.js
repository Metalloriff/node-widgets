const fs = require("fs");
const path = require("path");
const _ = require("lodash");

module.exports = class WidgetConfig {
    fp;
    data = {};

    constructor(directoryPath) {
        // Set the file path to the directory path
        this.fp = path.join(directoryPath, "config.json");

        // Initialize the data based on hard disk data
        this.data = fs.existsSync(this.fp)
            ? require(this.fp) ?? { }
            : { };
    }

    /**
     * Gets a config variable by key, optionally with a fallback variable if it doesn't exist.
     * @param key The path to the config entry. Examples: "someItem" | "someObject.someArray.2" | "someObject.someItem"
     * @param fallback The object reference that will be returned if the given key does not exist.
     * @returns {any | fallback}
     */
    get(key, fallback = null) {
        return _.get(this.data, key) ?? fallback;
    }

    /**
     * Sets a config variable by key.
     * @param key The path to the config entry. Examples: "someItem" | "someObject.someArray.2" | "someObject.someItem"
     * @param value The new value object.
     */
    set(key, value) {
        // Set the reference
        _.set(this.data, key, value);

        // Save to the disk
        this.save();
    }

    /**
     * Saves the current config data to the hard disk.
     */
    save() {
        fs.writeFileSync(this.fp, JSON.stringify(this.data), { encoding: "utf8" });
    }
}