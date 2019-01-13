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

/*
old lib: https://www.npmjs.com/package/mailparser
new lib: https://gitlab.com/nodemailer/mailparser2
 */

(function () {
    "use strict";

    const logger = require ("./logger").logger;
    const inspect = require('util').inspect;
    const Lib = require("./lib").Lib;
    const Config = require("./config").Config;
    const config = Config.getConfig();
    const Qrcode = require("./qrcode").Qrcode;
    const validation = require("./validation");
    const Base64 = require('js-base64').Base64;
    const uidRegex = "^[a-zA-Z0-9_]{2,128}$";
    const maxNumberOfLanguages = 10;

    const messageHandler = require ("./messageHandler");
    const deleteMessage = messageHandler.deleteMessage;
    const loadMessages = messageHandler.loadMessages;

    const title = config.title;

    let validDomains = [];
    let localConfig = {};

    Array.prototype.indexOfnocase = Lib.indexOfnocase;

    validation.setGlobalConfig(config);


    function goAway(req, res, ip) {
        logger.log ("debug", "goAway: " + inspect (req, false, 22));
        res.render("blacklisted", {
            title: title,
            ip: ip
        }, function (err, html) {
            logger.log("info", "Blacklisted IP: " + ip.toString());
            if (!res.finished) {
                res.send(html);
            }
        });
    }


    function doDelete(req, res, password) {
        const uidRe = new RegExp(uidRegex);
        const uidEncrypted = req.body.delete.replace(Lib.getDeletePrefix(),'');
        if (uidEncrypted instanceof Error) {
            // handle the error safely
            logger.log("warn", "uidEncrypted is invalid");
        } else if (uidEncrypted.match(uidRe)) {
            const uid = [];
            uid.encrypted = uidEncrypted;
            uid.password = password;
            deleteMessage(uid).then((result)=> {
                logger.log("debug", "delete message uid: ", uid.encrypted);
                if (!res.finished) {
                    res.write(result);
                    res.end();
                }
            }).catch((err) => {
                logger.log ("warn", "deleteMessage fucked up: " + err);
            });
        } else {
            logger.log("error", "uidEncrypted.match(uidRe) does not match");
            if (!res.finished) {
                res.send({err: "unknown request"});
            }
        }
    }


    function doQrCode(data, res) {
        let qr = "undefined";

        Qrcode.requestQrCode(data.name, data.domain).then((qrcode) => {
            qr = JSON.stringify(qrcode);
            
            if ((typeof qr !== "undefined") && validation.validateName(data.name) && validation.validateDomain(data.domain)) {
                if (!res.finished) {
                    res.send(qr);
                } else if (data.do === "config") {
                    if (!res.finished) {
                        res.send(JSON.stringify(config.client));
                    }
                }
            } else {
                logger.log("error", "doQrCode: Bad parameters");
                if (!res.finished) {
                    res.send({err: "unknown request"});
                }
            }
        });
    }


    function doGetMail(data, res, password, foundLanguage) {
        const realRcpt = [];
        if (validation.validateName(data.name) && validation.validateDomain(data.domain)) {
            realRcpt.email = data.name;
            realRcpt.domain = data.domain;
            realRcpt.password = password;

            loadMessages(realRcpt, foundLanguage).then((htmlMails)=>{
                if (!res.finished) {
                    res.write(Base64.encode(htmlMails));
                    res.end();
                }
            }).then(()=> {
                return Promise.resolve();
            }).catch((err)=> {
                logger.log("error", "Cannot load messages: " + err.message);
                res.send(JSON.stringify(
                    []
                ));
            });
        } else {
            if (!res.finished) {
                res.send("<span class='error'>" + config.text.invalid_request + "</span>");
            }
        }
    }


    const doRequest = function (handler, session, req, res, next, password) {
        localConfig = Config.getLocalConfig();
        validation.setLocalConfig(localConfig);

        validDomains = localConfig.domains;
        let ip = req.headers["x-real-ip"];
        if (typeof ip !== "string") {
            ip = req.ip;
        }
        if (validation.checkBlacklistIp(ip)) {
            goAway(req, res, ip);
        }

        if (!session.rblOk) {
            Promise.all([
                validation.checkRbl(ip)
            ])
                .then((data) => {
                    logger.log ("debug", "doRequest resolve: " + inspect(data, false, 22));
                    session.rblOk = true;
                    handler(req, res, next, password);
                })
                .catch((err) => {
                    logger.log ("debug", "doRequest error: " + inspect(err, false, 22));
                    goAway(req, res, ip);
                    if (!res.isfinished) {
                        res.send("Go away");
                    }
                });
        } else {
            logger.log("debug", "already checked");
            handler(req, res, next, password);
        }
    };

    
    const findLanguage = function (acceptedLangs) {
        let foundLanguage = null;
        acceptedLangs.some (function (l) {
            if (l in Config.getLanguages()) {
                foundLanguage = Config.getLanguages()[l];
                logger.log ("debug", "render_index: found " + foundLanguage);
                return foundLanguage;
            }
        });
        
        if (foundLanguage === null) {
            foundLanguage = config.defaultLanguage ? config.defaultLanguage : "index.de.pug";
        }
        return foundLanguage;
    };


    const render_index = function (req, res, data, callback) {
        const acceptedLanguages = req.acceptsLanguages().slice(0,maxNumberOfLanguages);

        const foundLanguage = findLanguage(acceptedLanguages);
        logger.log ("debug", "render_index: " + inspect(foundLanguage, false, 22));
        
        data.title = title;
        data.validDomains = localConfig.domains;
        data.mainjs = Lib.get_minified_sri("mainjs");
        data.base64js = Lib.get_minified_sri("base64js");
        data.jqueryjs = Lib.get_minified_sri("jquery");
        data.jqueryuijs = Lib.get_minified_sri("jqueryui");
        data.styles = Lib.get_minified_sri("styles");
        data.styles_jqueryui = Lib.get_minified_sri("styles_jqueryui");
        data.serverTimeDate = Lib.getServerTimeDate(acceptedLanguages);
        res.render(foundLanguage, data, callback);
        res.end();
    };


    const doGet = function (req, res, next, password) {
        const acceptedLanguages = req.acceptsLanguages().slice(0,maxNumberOfLanguages);
        const name = req.query.name;
        const domain = req.query.domain;
        if ((typeof name === "string") && (typeof domain === "string")) {
            const realRcpt = [];
            if (validation.validateName(name) && validation.validateDomain(domain) && validation.validateEmail(name + "@" + domain)) {
                realRcpt.email = name;
                realRcpt.domain = domain;
                realRcpt.password = password;
                loadMessages(realRcpt, acceptedLanguages, function (htmlMails) {
                    const tmpdata = {};
                    tmpdata.mails = htmlMails;
                    render_index (req, res, tmpdata, function (err, html) {
                        if (!res.finished) {
                            res.write(html);
                            res.end();
                        }
                    });
                });
            }
        } else {
            const tmpdata = {};
            render_index (req, res, tmpdata, function (err, html) {
                if (err === null && !res.finished) {
                    res.write(html);
                    res.end();
                } else if (err !== null) {
                    logger.log("error", "render: " + err);
                } else {
                    logger.log("error", "html is invalid " + encodeURIComponent(html));
                }
            });
        }
    };


    const doPost = function (req, res, next, password) {
        const acceptedLanguages = req.acceptsLanguages().slice(0,maxNumberOfLanguages);
        const data = req.body;

        if (data.do === "getmails") {
            doGetMail(data, res, password, acceptedLanguages);
        } else if (data.do === "delete") {
            doDelete(req, res, password);
        } else if (data.do === "qrcode") {
            doQrCode(data, res);
        } else if (data.do === "config") {
            if (!res.finished) {
                res.send(JSON.stringify(config.client));
            }
        } else {
            if (!res.finished) {
                res.write(JSON.stringify({err: "unknown request"}));
                res.end();
            } else {
                logger.log("error", "disconnected while doPost");
            }
        }
    };


    module.exports.doRequest = doRequest;
    module.exports.doPost = doPost;
    module.exports.doGet = doGet;

}());
