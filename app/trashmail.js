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
    const validation = require("./validation");
    const Base64 = require('js-base64').Base64;
    const uidRegex = "^[a-zA-Z0-9_]{2,128}$";
    const maxNumberOfLanguages = 10;

    const MessageHandler = require ("./messageHandler").MessageHandler;
    
    let validDomains = [];
    let localConfig = {};

    Array.prototype.indexOfnocase = Lib.indexOfnocase;

    validation.setGlobalConfig(config);

    
    class Private {

        static goAway(req, res, ip) {
            logger.log ("debug", "goAway: " + inspect (req, false, 22));
            res.render("blacklisted", {
                title: config.title,
                ip: ip
            }, function (err, html) {
                logger.log("info", "Blacklisted IP: " + ip.toString());
                if (!res.finished) {
                    res.send(html);
                }
            });
        }

        static doDelete(req, res, password) {
            const uidRe = new RegExp(uidRegex);
            const uidEncrypted = req.body.delete.replace(Lib.getDeletePrefix(),'');
            if (uidEncrypted instanceof Error) {
                // handle the error safely
                logger.log("warn", "doDelete: uidEncrypted is invalid");
            } else if (uidEncrypted.match(uidRe)) {
                const uid = [];
                uid.encrypted = uidEncrypted;
                uid.password = password;
                MessageHandler.deleteMessage(uid).then((result)=> {
                    logger.log("debug", "doDelete: delete message uid: " + result);
                    if (!res.finished) {
                        res.write(result);
                        res.end();
                    }
                }).catch((err) => {
                    logger.log ("warn", "doDelete: deleteMessage fucked up: " + err);
                });
            } else {
                logger.log("error", "doDelete: uidEncrypted.match(uidRe) does not match");
                if (!res.finished) {
                    res.send({err: "unknown request"});
                }
            }
        }

        static findLanguage (acceptedLangs) {
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
        }

        static render_index (req, res, data, callback) {
            const acceptedLanguages = req.acceptsLanguages().slice(0,maxNumberOfLanguages);

            const foundLanguage = Private.findLanguage(acceptedLanguages);
            logger.log ("debug", "render_index: " + inspect(foundLanguage, false, 22));

            data.title = config.title;
            data.validDomains = localConfig.domains;
            data.mainjs = Lib.get_minified_sri("mainjs");
            data.base64js = Lib.get_minified_sri("base64js");
            data.jqueryjs = Lib.get_minified_sri("jquery");
            data.jqueryuijs = Lib.get_minified_sri("jqueryui");
            data.qrcode = Lib.get_minified_sri("qrcode");
            data.validator = Lib.get_minified_sri("validator");
            data.styles = Lib.get_minified_sri("styles");
            data.styles_jqueryui = Lib.get_minified_sri("styles_jqueryui");
            data.serverTimeDate = Lib.getServerTimeDate(acceptedLanguages);
            res.render(foundLanguage, data, callback);
            res.end();
        }

        static doGetMail(data, res, password, foundLanguage) {
            const realRcpt = [];
            if (validation.validateName(data.name) && validation.validateDomain(data.domain)) {
                realRcpt.email = data.name;
                realRcpt.domain = data.domain;
                realRcpt.password = password;

                MessageHandler.loadMessages(realRcpt, foundLanguage).then((htmlMails)=>{
                    if (!res.finished) {
                        res.write(Base64.encode(JSON.stringify(htmlMails)));
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
                    res.send(Base64.encode("<span class='error'>" + config.text.invalid_request + "</span>"));
                }
            }
        }

    }

    
    class Trashmail {

        static doRequest (handler, session, req, res, next, password) {
            localConfig = Config.getLocalConfig();
            validation.setLocalConfig(localConfig);

            validDomains = localConfig.domains;
            let ip = req.headers["x-real-ip"];
            if (typeof ip !== "string") {
                ip = req.ip;
            }
            if (validation.checkBlacklistIp(ip)) {
                Private.goAway(req, res, ip);
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
                        Private.goAway(req, res, ip);
                    });
            } else {
                logger.log("debug", "doRequest: RBL already checked");
                handler(req, res, next, password);
            }
        }

        static doGet (req, res, next, password) {
            const acceptedLanguages = req.acceptsLanguages().slice(0,maxNumberOfLanguages);
            const name = req.query.name;
            const domain = req.query.domain;
            if ((typeof name === "string") && (typeof domain === "string")) {
                const realRcpt = [];
                if (validation.validateName(name) && validation.validateDomain(domain) && validation.validateEmail(name + "@" + domain)) {
                    realRcpt.email = name;
                    realRcpt.domain = domain;
                    realRcpt.password = password;
                    MessageHandler.loadMessages(realRcpt, acceptedLanguages, function (htmlMails) {
                        const tmpdata = {};
                        tmpdata.mails = htmlMails;
                        Private.render_index (req, res, tmpdata, function (err, html) {
                            if (!res.finished) {
                                res.write(html);
                                res.end();
                            }
                        });
                    });
                }
            } else {
                const tmpdata = {};
                Private.render_index (req, res, tmpdata, function (err, html) {
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
        }


        static doPost (req, res, next, password) {
            const acceptedLanguages = req.acceptsLanguages().slice(0,maxNumberOfLanguages);
            const data = req.body;

            if (data.do === "getmails") {
                Private.doGetMail(data, res, password, acceptedLanguages);
            } else if (data.do === "delete") {
                Private.doDelete(req, res, password);
            } else if (data.do === "config") {
                if (!res.finished) {
                    res.send(JSON.stringify(config.client));
                }
            } else {
                if (!res.finished) {
                    res.write(JSON.stringify(Lib.getInvalidRequest("Unknown Request")));
                    res.end();
                } else {
                    logger.log("error", "disconnected while doPost");
                }
            }
        }

    }

    
    module.exports.Trashmail = Trashmail;
    
}());
