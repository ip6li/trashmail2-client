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

    const assert = require("assert");
    const TmCrypt = require("./tm_crypto").TmCrypt;
    const logger = require("./logger").logger;
    const RenderMessage = require("./renderMessage").RenderMessage;
    const Mongo = require("./mongo");

    
    class Private {

        static msg_processor (msg) {
            return new Promise(
                resolve => setTimeout(
                    () => {
                        let rawMessage = [];
                        rawMessage.remoteLocale = msg.remoteLocale;
                        rawMessage.password = msg.password;
                        rawMessage.msgid = msg.msgid;
                        rawMessage.uid = msg.mailTo;

                        if (typeof msg.date === "undefined") {
                            const mailDate = new Date(parseInt(msg.timestamp) * 1000);
                            rawMessage.date = mailDate.toLocaleString();
                        } else {
                            rawMessage.date = msg.date;
                        }

                        if (typeof msg.receivedDate === "undefined") {
                            const receivedDate = new Date(parseInt(msg.timestamp) * 1000);
                            rawMessage.receivedDate = receivedDate.toUTCString();
                        } else {
                            rawMessage.receivedDate = msg.receivedDate;
                        }

                        rawMessage.content = msg.data;

                        resolve(rawMessage);
                    },
                    100
                )
            ).catch((err)=>{
                logger.log("error", "msg_processor failed");
                return Promise.reject(err);
            });
        }

    }

    
    class MessageHandler {

        static deleteMessage (uid) {
            let promise = Promise.resolve(uid);

            promise = promise.then((uid) => {
                const encrypted = uid.encrypted;
                const password = uid.password;
                return TmCrypt.decrypt(encrypted, password);
            });

            promise = promise.then((id) => {
                const db = new Mongo();
                return db.delete(id);
            });

            promise = promise.then(() => {
                return JSON.stringify({
                    res: "succeeded",
                    uid: uid.encrypted
                });
            });

            return promise;
        }

        static loadMessages (realTo, remoteLocale) {
            const rcpt = realTo.email + "@" + realTo.domain;

            const db = new Mongo();
            let promise = db.find(rcpt).then((docs) => {
                const password = realTo.password;
                assert.notStrictEqual("undefined", typeof password);
                docs.forEach(function (item) {
                    item.remoteLocale = remoteLocale;
                    item.password = password;
                    item.msgid = item._id.toString();
                });
                return docs;
            }).catch((err) => {
                logger.log("warn", "find fucked up: " + err);
            });

            promise = promise.then((docs) => {
                const actions = docs.map(Private.msg_processor);
                const results = Promise.all(actions);
                return results.then((docs) => {
                    return Promise.resolve(docs);
                }).catch((err) => {
                    logger.log("warn", "msg_processor fucked up: " + err);
                    return Promise.reject(err);
                });
            });

            promise = promise.then((data) => {
                const actions = data.map(RenderMessage.renderMessage);
                const results = Promise.all(actions);
                return results.then((data) => {
                    return Promise.resolve(data);
                }).catch((err) => {
                    logger.log("warn", "renderMessage item fucked up: " + err);
                    return Promise.reject(err);
                });
            }).catch((err) => {
                logger.log("warn", "renderMessage loop fucked up: " + err);
                return Promise.reject(err);
            });

            return promise;
        }

    }

    
    module.exports.MessageHandler = MessageHandler;

}());