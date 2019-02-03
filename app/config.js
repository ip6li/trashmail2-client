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

    const fs = require('fs');
    const assert = require("assert");
    const logger = require("./logger").logger;

    class Private {

        static getConstants(c) {
            if (typeof c.client.domainRegex === "undefined") {
                c.client.domainRegex = "^([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.){1,2}[a-zA-Z]{2,}$";
            }
            if (typeof c.client.nameRegex === "undefined") {
                c.client.nameRegex = "^[a-zA-Z0-9._+-]{3,64}$";
            }
        }

        static fileLocations() {
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
            defaults.qrcode = {};
            defaults.qrcode.uri = "/javascripts/qrcode.min.js";
            defaults.qrcode.file = __dirname + "/public/javascripts/qrcode.min.js";
            defaults.validator = {};
            defaults.validator.uri = "/javascripts/validator.min.js";
            defaults.validator.file = __dirname + "/public/javascripts/validator.min.js";
            defaults.styles = {};
            defaults.styles.uri = "/stylesheets/style.min.css";
            defaults.styles.file = __dirname + "/public/stylesheets/style.min.css";
            defaults.styles_jqueryui = {};
            defaults.styles_jqueryui.uri = "/stylesheets/jquery-ui/jquery-ui.min.css";
            defaults.styles_jqueryui.file = __dirname + "/node_modules/jquery-ui-dist/jquery-ui.min.css";

            if (typeof process.env.DEBUG_CLIENT !== "undefined") {
                defaults.mainjs.uri = "/javascripts/main.js";
                defaults.mainjs.file = __dirname + "/public/javascripts/main.js";
                defaults.base64js.uri = "/javascripts/js-base64/base64.js";
                defaults.base64js.file = __dirname + "/node_modules/js-base64/base64.js";
                defaults.jquery.uri = "/javascripts/jquery/jquery.js";
                defaults.jquery.file = __dirname + '/node_modules/jquery/dist/jquery.js';
                defaults.jqueryui.uri = "/javascripts/jquery-ui/jquery-ui.js";
                defaults.jqueryui.file = __dirname + "/node_modules/jquery-ui-dist/jquery-ui.js";
            }

            return defaults;
        }

        static loadConfigFile(configFile) {
            const file = fs.openSync(configFile, "r");
            const configDataString = fs.readFileSync(file);
            return JSON.parse(configDataString.toString());
        }

        static loadLanguageFiles() {
            const languages = {};

            fs.readdir("views", function (err, list) {
                list.forEach(function (filename) {
                    let found = filename.toString().match(/index\.(\S+)\.pug/);
                    if (found) {
                        const id = found[1];
                        languages[id] = filename;
                    }
                });
            });

            return languages;
        }

    }


    class Config {

        static getLocalConfig() {
            return Config.configFile(this.config.configRuntime);
        }

        static getLanguages() {
            return this.languages;
        }

        // Load Config File
        static configFile(configFileName) {
            const configFiles = [
                "/etc",
                "/etc/trashmail",
                "/usr/local/etc",
                "/usr/local/etc/trashmail",
                process.env.HOME + "/.trashmail",
                process.env.HOME,
                __dirname
            ];

            if (typeof process.env.CONFIGPATH !== "undefined") {
                configFiles.push(process.env.CONFIGPATH);
            }

            if (typeof this.selectedConfigPath === "undefined") {
                for (let i = 0, iLen = configFiles.length; i < iLen; i++) {
                    const fname = configFiles[i] + "/" + configFileName;
                    try {
                        const testConfig = Private.loadConfigFile(fname);
                        if (typeof testConfig !== "undefined") {
                            logger.log("info", "Succeeded with config file " + fname);
                            this.selectedConfigPath = configFiles[i];
                            assert.notStrictEqual("undefined", typeof testConfig);
                            return testConfig;
                        }
                    } catch (err) {
                        logger.log("info", "Tried config file " + fname);
                    }
                }
            } else {
                const fname = this.selectedConfigPath + "/" + configFileName;
                return Private.loadConfigFile(fname);
            }

            throw "No config file found";
        }

        static getConfig() {
            this.config = Config.configFile("trashmail.json");
            assert.notStrictEqual("undefined", typeof this.config);
            this.config.fileLocations = Private.fileLocations();

            if (typeof this.config === "undefined") {
                logger.log("error", "No config file found, giving up!");
                process.exit(1);
            } else {
                this.languages = Private.loadLanguageFiles();
            }

            Private.getConstants(this.config);

            return this.config;
        }

        static getCacheDir() {
            if (typeof this.config.cachedir !== "undefined") {
                return this.config.cachedir;
            } else {
                return "cache";
            }
        }

    }


    module.exports.Config = Config;

}());
