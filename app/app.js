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
/*global require, module,  __dirname */

(function () {
    "use strict";

    const type_number = "number";

    const util = require("util");
    const assert = require("assert");
    const express = require("express");
    const path = require("path");
    const favicon = require("serve-favicon");
    const logger = require("./logger").logger;
    const setLogLevel = require("./logger").setLogLevel;
    const morgan = require("morgan");
    const cookieParser = require("cookie-parser");
    const session = require("express-session");
    const FileStore = require("session-file-store")(session);
    const bodyParser = require("body-parser");
    const minify = require("express-minify");
    const compression = require("compression");
    const routes = require("./routes");
    const Mongo = require("./mongo");

    const Config = require("./config").Config;
    const config = Config.getConfig();
    const headers = config.headers;

    const app = express();
    
    
    class Private {

        static getCookieConfig() {
            let cookie_secure = true;
            if (app.get("env") === "development") {
                cookie_secure = false;
            }

            try {
                cookie_secure = config.cookie.secure;
            } catch (e) {
                // do nothing
            }

            return cookie_secure;
        }

        static getCacheTime() {
            let cacheTime = 1000 * 86400000; // 1d default
            if (typeof config.cachetime === type_number) {
                cacheTime = 1000 * config.cachetime;
            }

            return cacheTime;
        }

        // development error handler
        // will print stacktrace
        static setupErrorHandler() {

            if (app.get("env") === "development") {
                setLogLevel("debug");

                if (typeof process.env.LOGLEVEL !== "undefined") {
                    setLogLevel(process.env.LOGLEVEL);
                }

                app.use(function (err, req, res, next) {
                    res.status(err.status || 500);
                    res.render("error", {
                        message: err.message,
                        error: err
                    });
                    const logmsg = util.format("Internal server error %s: %s (%o)", err.status, err.message, req._remoteAddress);
                    logger.log("error", logmsg);
                });
            } else {
                setLogLevel("warn");

                if (typeof process.env.LOGLEVEL !== "undefined") {
                    setLogLevel(process.env.LOGLEVEL);
                }

                app.use(function (err, req, res, next) {
                    res.status(err.status || 500);
                    logger.log("error", err.message);
                    res.render("error", {
                        message: "Internal error",
                        error: {}
                    });
                });
            }
        }
        
        static setupMongoDB() {
            Mongo.connectdb().then ((db) => {
                app.mongo_db = db;
                assert.notStrictEqual(null, app.mongo_db);
                return Promise.resolve(db);
            });
        }
        
        static setupCompression () {
            app.use(compression());
            app.use(minify({
                js_match: /.*\.js$/,
                css_match: /stylesheets/,
                json_match: /json/,
                uglifyJS: require("uglify-es"),
                cssmin: undefined,
                cache: Config.getCacheDir()
            }));
        }
        
        static setupRequestHandler() {
            app.use(function (req, res, next) {
                let matchUrl = "/";
                if (req.url.substring(0, matchUrl.length) === matchUrl) {
                    if (headers) {
                        for (const header in headers) {
                            if (headers.hasOwnProperty(header) && headers[header]) {
                                res.setHeader(header, headers[header]);
                            }
                        }
                    }
                }
                return next();
            });
        }

        static setup404Handler() {
            app.get("*", function (req, res) {
                res.status(404);
                res.type("txt").send("Not found!");
                logger.log("error", "404");
            });
        }
    
        static setupSessionHandler() {
            app.use(cookieParser());
            app.use(session({
                    store: new FileStore(),
                    cookie: {
                        secure: Private.getCookieConfig()
                    },
                    secret: config.sessionSecret,
                    saveUninitialized: true,
                    maxAge: 3600000,
                    sameSite: true,
                    resave: true
                })
            );
        }
    
        static setupClientLibs() {
            app.use('/javascripts/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
            app.use('/javascripts/jquery-ui', express.static(__dirname + '/node_modules/jquery-ui-dist/'));
            app.use('/javascripts/js-base64', express.static(__dirname + '/node_modules/js-base64/'));
            app.use('/stylesheets/jquery-ui', express.static(__dirname + '/node_modules/jquery-ui-dist/'));
        }
    
        static setupApp() {
            Private.setupSessionHandler();

            // view engine setup
            app.set("views", path.join(__dirname, "views"));
            app.set("view engine", "pug");

            // uncomment after placing your favicon in /public
            app.use(favicon(path.join(__dirname, "public", "favicon.ico")));
            if (typeof config.trusted_proxies !== config.undef && config.trusted_proxies instanceof Array) {
                app.set("trust proxy", config.trusted_proxies);
            }
            if (typeof config.log_combined !== config.undef && config.log_combined === true) {
                app.use(morgan("combined"));
            }
            app.use(morgan("dev"));
            app.use(bodyParser.json());
            app.use(bodyParser.urlencoded({extended: false}));

            Private.setupRequestHandler();

            app.use(express.static(path.join(__dirname, "public"), {maxAge: Private.getCacheTime()}));

            Private.setupClientLibs();
            Private.setupCompression();

            app.use("/", routes);

            Private.setupErrorHandler();
            Private.setup404Handler();
            Private.setupMongoDB();
        }
        
    }


    Private.setupApp();
    module.exports.trashmailApp = app;

}());
