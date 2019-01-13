/*
 * Copyright (c) 2016. by Christian Felsing
 * This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU Affero General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *     GNU Affero General Public License for more details.
 *
 *     You should have received a copy of the GNU Affero General Public License
 *     along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

/* jshint node: true */
/*jshint esversion: 6 */
/*global require, module,  __dirname, process */

(function () {
    "use strict";
    
    const logger = require("./logger").logger;
    const fs = require('fs');
    const languages = {};
    
    let selectedConfigPath = "";
    let config = {};


    class Private {

        static fileLocations () {
            const defaults = {};
            defaults.mainjs = {};
            defaults.mainjs.uri = "/javascripts/main.min.js";
            defaults.mainjs.file = __dirname + "/public/javascripts/main.min.js";
            defaults.base64js = {};
            defaults.base64js.uri = "/javascripts/js-base64/base64.min.js";
            defaults.base64js.file = __dirname + "/node_modules/js-base64/base64.min.js";
            defaults.jquery = {};
            defaults.jquery.uri = "/javascripts/jquery/jquery.min.js";
            defaults.jquery.file = __dirname + '/node_modules/jquery/dist/jquery.min.js';
            defaults.jqueryui = {};
            defaults.jqueryui.uri = "/javascripts/jquery-ui/jquery-ui.min.js";
            defaults.jqueryui.file = __dirname + "/node_modules/jquery-ui-dist/jquery-ui.min.js";
            defaults.styles = {};
            defaults.styles.uri = "/stylesheets/style.min.css";
            defaults.styles.file =  __dirname + "/public/stylesheets/style.min.css";
            defaults.styles_jqueryui = {};
            defaults.styles_jqueryui.uri = "/stylesheets/jquery-ui/jquery-ui.min.css";
            defaults.styles_jqueryui.file = __dirname + "/node_modules/jquery-ui-dist/jquery-ui.min.css";

            return defaults;
        }

        static loadConfigFile(configFile) {
            const file = fs.openSync(configFile, "r");
            const configDataString = fs.readFileSync(file);
            return JSON.parse(configDataString.toString());
        }

        static loadLanguageFiles () {
            fs.readdir ("views", function(err, list) {
                list.forEach (function (filename) {
                    let found = filename.toString().match(/index\.(\S+)\.pug/);
                    if (found) {
                        const id = found[1];
                        languages[id] = filename;
                    }
                });
            });
        }

    }


    class Config {

        static getLocalConfig () {
            return Config.configFile(config.configRuntime);
        }

        static getLanguages () {
            return languages;
        }

        // Load Config File
        static configFile (configFileName) {
            const configFiles = [
                "/etc",
                "/etc/trashmail",
                "/usr/local/etc",
                "/usr/local/etc/trashmail",
                process.env.HOME + "/.trashmail",
                process.env.HOME,
                __dirname
            ];

            let fname = "undefined";
            if (typeof selectedConfigPath !== "undefined") {
                for (let i = 0, iLen = configFiles.length; i < iLen; i++) {
                    try {
                        fname = configFiles[i] + "/" + configFileName;
                        const testConfig = Private.loadConfigFile(fname);
                        if (typeof testConfig !== "undefined") {
                            logger.log("info", "Succeeded with config file " + fname);
                            selectedConfigPath = configFiles[i];
                            return testConfig;
                        }
                    }
                    catch (err) {
                        logger.log("info", "Tried config file " + fname);
                    }
                }
            } else {
                fname = selectedConfigPath + "/" + configFileName;
                try {
                    return Private.loadConfigFile(fname);
                } catch (err) {
                    logger.log("error", "cannot parse " + fname);
                }
            }
        }

        static getConfig () {
            config = Config.configFile("trashmail.json");
            config.fileLocations = Private.fileLocations();

            if (typeof config === "undefined") {
                logger.log("error", "No config file found, giving up!");
                process.exit(1);
            } else {
                Private.loadLanguageFiles();
            }

            return config;
        }

        static getCacheDir() {
            const config = Config.getConfig();

            if (typeof config.cachedir !== "undefined") {
                return config.cachedir;
            } else {
                return "cache";
            }
        }

    }


    module.exports.Config = Config;

}());
