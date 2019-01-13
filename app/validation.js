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
    'use strict';
    
    const logger = require("./logger").logger;
    const rblLookup = require('dnsbl-lookup');
    const ipRangeCheck = require("ip-range-check");
    const validator = require('validator');
    const secureFilters = require('secure-filters');
    const htmlEscape = secureFilters.html;


    let localConfig = {};
    let globalConfig = {};

    const domainRegex = "^([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.){1,2}[a-zA-Z]{2,}$";
    const nameRegex = "^[a-zA-Z0-9._+-]{3,64}$";

    
    class Validator {
        
    }

    
    const setGlobalConfig = function (config) {
        globalConfig = config;
    };


    const setLocalConfig = function (config) {
        localConfig = config;
    };


    const checkBlacklistIp = function (ip) {
        if (localConfig.blacklisted_net instanceof Array) {
            return ipRangeCheck(ip, localConfig.blacklisted_net);
        }
    };


    const validateDomain = function (domain) {
        if (localConfig.domains instanceof Array) {
            if (domain.length > 64) {
                return false;
            }
            const re = new RegExp(domainRegex);
            if (!domain.match(re)) {
                return false;
            }
            return localConfig.domains.indexOf(domain) !== -1;
        } else {
            logger.log("error", "domains not set in configuration");
            return false;
        }
    };


    const validateName = function (name) {
        if (localConfig.reservedNames instanceof Array) {
            if (name.length > 64) {
                return false;
            }
            const re = new RegExp(nameRegex);
            if (!name.match(re)) {
                return false;
            }
            return localConfig.reservedNames.indexOfnocase(name) === -1;
        } else {
            return true;
        }
    };


    const validateEmail = function (email) {
        return validator.isEmail(email);
    };


    const checkRbl = function (ip) {
        return new Promise((resolve, reject) => {
            if (localConfig.use_rbl) {
                const rblList = localConfig.rbls;
                let dnsbl = "undefined";
                if (rblList instanceof Array) {
                    dnsbl = new rblLookup.dnsbl(ip, rblList);
                } else {
                    dnsbl = new rblLookup.dnsbl(ip);
                }
                dnsbl.on('error', function (error, blocklist) {
                    return reject("found");
                });
                dnsbl.on('data', function (result, blocklist) {
                    logger.log("debug", result.status + ' in ' + blocklist.zone);
                });
                dnsbl.on('done', function () {
                    resolve("ok");
                });
            } else {
                resolve("ok");
            }
        });
    };


    const validateOutput = function (data) {
        const escapedData = htmlEscape(data);
        return escapedData === data;
    };


    module.exports.setGlobalConfig = setGlobalConfig;
    module.exports.setLocalConfig = setLocalConfig;
    module.exports.checkBlacklistIp = checkBlacklistIp;
    module.exports.validateDomain = validateDomain;
    module.exports.validateName = validateName;
    module.exports.validateEmail = validateEmail;
    module.exports.checkRbl = checkRbl;
    module.exports.validateOutput = validateOutput;

}());
