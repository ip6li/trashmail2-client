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
/*global require, module,  __dirname, config */

(function () {
    "use strict";

    //const process = require("process");
    const winston = require("winston");
    
    //const transport = new winston.transports.Console();

    const customFormat = winston.format.combine(
        winston.format.colorize(),
        winston.format.printf((entry) => {
            return `[${entry.level}]: ${entry.message}`;
        })
    );
    
    const setLogLevel = function (newLogLevel) {
        transports.console.level = newLogLevel;
    };


    const transports = {
        console: new winston.transports.Console({ level: 'warn' }),
    };

    const logger = winston.createLogger({
        format: customFormat,

        transports: [
            transports.console
        ]
    });
    
    module.exports.logger = logger;
    module.exports.setLogLevel = setLogLevel;
    
}());
