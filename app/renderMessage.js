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

    const Lib = require("./lib").Lib;
    const MakeHtml = require("./makeHtml").MakeHtml;
    const logger = require("./logger").logger;
    const simpleParser = require("mailparser").simpleParser;

    const dkimRe = new RegExp("^.*dkim=(pass|fail)\\s+\\((\\d+)-bit\\s+key;\\s+(\\w+)\\)\\s+.*$");


    class Private {

        static updateList (src) {
            const res = [];
            if (typeof src !== "undefined") {
                if (src.value instanceof Array) {
                    src.value.forEach(function (item) {
                        Array.prototype.push.apply(res, Array(item.name + " <" + item.address + ">".trim()));
                    });
                }
            }
            return res;
        }

        static parserExecutor (rawMessage, parsed) {
            let from = "";
            let rcpt = "";

            if (parsed.from.value instanceof Array) {
                parsed.from.value.forEach(function (fromItem) {
                    from += fromItem.name + " <" + fromItem.address + ">";
                });
            }
            from = from.trim();

            let rcptList = [];

            Array.prototype.push.apply(rcptList, Private.updateList(parsed.to));
            Array.prototype.push.apply(rcptList, Private.updateList(parsed.cc));

            if (rawMessage.uid instanceof Array) {
                const strRcpts = Lib.extractNames(rawMessage.uid);
                Array.prototype.push.apply(rcptList, strRcpts);
            }

            const dkim_state = parsed.headers.get("authentication-results");
            if (typeof dkim_state === "string") {
                const dkim_res = dkim_state.match(dkimRe);
                if (dkim_res) {
                    parsed.dkim = [];
                    parsed.dkim.result = dkim_res[1];
                    parsed.dkim.bits = dkim_res[2];
                    parsed.dkim.dnssec = dkim_res[3];
                }
            }

            rcptList.forEach(function (rcptItem) {
                if (rcpt.length > 0) {
                    rcpt += ", ";
                }
                rcpt += rcptItem;
            });

            parsed.receivedDate = rawMessage.receivedDate;
            parsed.remoteLocale = rawMessage.remoteLocale;

            return MakeHtml.make(from, rcpt, rawMessage, parsed);
        }

        static parserExecutorDummy () {
            return {};
        }

    }


    class RenderMessage {

        static renderMessage (rawMessage) {
            return simpleParser(rawMessage.content)
                .then(parsed => {
                    return Private.parserExecutor(rawMessage, parsed);
                })
                .catch((err) => {
                    const errormsg = "renderMessage failed (msgid: " + rawMessage.msgid + "): " + err;
                    logger.log("error", errormsg);
                    Promise.resolve(Private.parserExecutorDummy());
                });
        }

    }

    module.exports.RenderMessage = RenderMessage;

}());
