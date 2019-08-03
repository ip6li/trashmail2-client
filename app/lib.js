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
/*jshint bitwise: false*/
/*global require, module, intl,  __dirname, Intl */

(function () {
    "use strict";

    const inspect = require("util").inspect;
    const crypto = require('crypto');
    const fs = require("fs");
    const Config = require("./config").Config;
    const config = Config.getConfig();
    const logger = require("./logger").logger;

    const defaults = config.fileLocations;

    const dateTimeOptions = {
        year: "numeric", month: "long", day: "numeric",
        hour: "numeric", minute: "numeric", second: "numeric"
    };

    let files = null;


    class Private {

        static get_sri_js (path, uri) {
            const res = Private.get_sri(path);
            return "<script src=\"" + uri + "\" integrity=\"" + res.hash_algo + "-" + res.hash + "\" crossorigin=\"" + res.crossorigin + "\"></script>";
        }


        static get_sri_css (path, uri) {
            const res = Private.get_sri(path);
            return "<link rel=\"stylesheet\" href=\"" + uri + "\" integrity=\"" + res.hash_algo + "-" + res.hash + "\" crossorigin=\"" + res.crossorigin + "\" >";
        }


        static get_sri (path) {
            const res = {};
            res.hash_algo = "sha384";
            try {
                logger.log("debug", "building hashes for " + path);
                res.hash = Private.sri_digest(res.hash_algo, fs.readFileSync(path));
            } catch (e) {
                logger.log("error", "cannot open file " + path + " for read");
                throw "Fatal";
            }
            res.crossorigin = "anonymous";
            return res;
        }

        // Generate hash
        static sri_digest (algorithm, data, digest="base64") {
            return crypto
                .createHash(algorithm)
                .update(data)
                .digest(digest);
        }

        static getFiles () {
            const includes = Object.keys(config.fileLocations)
            const scripts = {};

            if (files !== null) {
                return files;
            }

            includes.forEach(function (item) {
                scripts[item] = {};
                if (config[item] === undefined) {
                    scripts[item].minified_urlpath = defaults[item].uri;
                } else {
                    scripts[item] = config[item];
                }

                scripts[item].minified_filepath = defaults[item].file;
                if (typeof config[item] !== "undefined" && typeof config[item].minified_absolute_url !== "undefined" && config[item].minified_absolute_url) {
                    scripts[item].minified_absolute_url = config[item].minified_absolute_url;
                } else {
                    scripts[item].minified_absolute_url = scripts[item].minified_urlpath;
                }

                scripts[item].sri = null;

                if (scripts[item].minified_absolute_url.match(/\.js$/)) {
                    scripts[item].type = "js";
                } else if (scripts[item].minified_absolute_url.match(/\.css$/)) {
                    scripts[item].type = "css";
                } else {
                    scripts[item].type = "unknown";
                }
            });

            files = scripts;
            return scripts;
        }

    }


    class Lib {

        static getTmpPath () {
            return __dirname + "/public/tmp";
        }

        static getDeletePrefix () {
            return "delete_";
        }

        static getServerTimeDate (remoteLocale) {
            return Lib.localizeDate(new Date().toString(), remoteLocale);
        }

        static localizeDate (dateString, remoteLocale) {
            const date = new Date (dateString.toString());
            const defaultLocale = [];
            defaultLocale[0] = typeof config.defaultLocale !== "undefined" ? config.defaultLocale : "en-US";
            if (typeof remoteLocale === "undefined") {
                remoteLocale = defaultLocale;
            }

            if (remoteLocale[0] === "*") {
                remoteLocale[0] = "en-US";
            }

            try {
                //noinspection JSUnresolvedFunction
                return new Intl.DateTimeFormat(remoteLocale, dateTimeOptions).format (date) + " (" + date.toString().match(/\(([A-Za-z\s].*)\)/)[1] + ")";
            } catch (err) {
                logger.log ("warn", "localizeDate (Error): " + err + ", in: " + inspect(date));
                //noinspection JSUnresolvedFunction
                return new Intl.DateTimeFormat(defaultLocale, dateTimeOptions).format (date) + " (" + date.toString().match(/\(([A-Za-z\s].*)\)/)[1] + ")";
            }
        }

        static get_minified_sri (what) {
            const scripts = Private.getFiles();
            if (scripts[what].sri === null) {
                if (scripts[what].type === "js") {
                    scripts[what].sri = Private.get_sri_js(scripts[what].minified_filepath, scripts[what].minified_absolute_url);
                } else if (scripts[what].type === "css") {
                    scripts[what].sri = Private.get_sri_css(scripts[what].minified_filepath, scripts[what].minified_absolute_url);
                }
            }
            return scripts[what].sri;
        }

        static extractNames (raw) {
            let names = [];
            if (raw instanceof Array) {
                raw.forEach(function (item) {
                    try {
                        let line = item.address.toString();
                        if (typeof item.name!=="undefined") {
                            line = item.name.toString() + " <" + line + ">";
                        }
                        line = line.trim();
                        names.push(line);
                    } catch (e) {
                        // do nothing
                    }
                });
            }

            return names;
        }

        static getPassword (passwordLength=32) {
            return crypto.randomBytes(passwordLength).toString('hex');
        }

        static indexOfnocase (searchElement, fromIndex) {
            let object = Object(this),
                length = object.length >>> 0,
                val = -1,
                index;

            if (length) {
                if (arguments.length > 1) {
                    fromIndex = fromIndex >> 0;
                } else {
                    fromIndex = 0;
                }

                if (fromIndex < length) {
                    if (fromIndex < 0) {
                        fromIndex = length - Math.abs(fromIndex);
                        if (fromIndex < 0) {
                            fromIndex = 0;
                        }
                    }

                    for (index = fromIndex; index < length; index += 1) {
                        if (index in object && searchElement.toLowerCase() === object[index].toLowerCase()) {
                            val = index;
                            break;
                        }
                    }
                }
            }

            return val;
        }

        static getInvalidRequest(msg) {
            return [ { error: msg} ];
        }

    }


    module.exports.Lib = Lib;

}());
