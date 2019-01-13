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

    const fs = require("fs");
    const crypto = require("crypto");

    const Lib = require("./lib").Lib;
    const RenderDKIM = require("./renderDkim").RenderDKIM;
    const TmCrypt = require("./tm_crypto").TmCrypt;
    const Config = require("./config").Config;
    const config = Config.getConfig();
    const tmpPath = Lib.getTmpPath();


    class Private {

        static saveAttachmentToFile(content, originalFileName, uidEncrypted) {
            const shasum = crypto.createHash("sha1");
            shasum.update(originalFileName + uidEncrypted);
            const fileName = shasum.digest("hex").toString() + ".tmp";
            const fsPath = tmpPath + "/" + fileName;

            fs.exists(fsPath, function (exists) {
                if (!exists) {
                    const writableStream = fs.createWriteStream(fsPath);
                    writableStream.write(content);
                }
            });

            return fileName;
        }


        static saveBodyToFile(html, uid) {
            const shasum = crypto.createHash("sha1");
            shasum.update(uid);
            const fileName = shasum.digest("hex").toString() + ".html";
            const fsPath = tmpPath + "/" + fileName;

            fs.exists(fsPath, function (exists) {
                if (!exists) {
                    const writableStream = fs.createWriteStream(fsPath);
                    writableStream.write(html);
                }
            });

            return fileName;
        }


        static getAttachments(mail_object, uidEncrypted) {
            let attachments = [];

            if (mail_object.attachments instanceof Array) {
                mail_object.attachments.forEach(function (att) {
                    let allowed = true;
                    const localConfig = Config.getLocalConfig();
                    if (localConfig.allowedMimes instanceof Array) {
                        allowed = allowed && localConfig.allowedMimes.indexOfnocase(att.contentType) !== -1;
                    } else if (localConfig.forbiddenMimes instanceof Array) {
                        allowed = allowed && localConfig.forbiddenMimes.indexOfnocase(att.contentType) === -1;
                    }

                    if (allowed) {
                        const fileName = Private.saveAttachmentToFile(att.content, att.filename, uidEncrypted);

                        let attachment = {};
                        attachment.contentType = att.contentType;
                        attachment.fileName = att.filename;
                        attachment.length = att.size;
                        attachment.content = fileName;
                        attachments.push(attachment);
                    }
                });
            }
            return attachments;
        }


        static doEscape (unsafe) {
            return unsafe.replace(/[&<"']/g, function (m) {
                switch (m) {
                    case '&':
                        return '&amp;';
                    case '<':
                        return '&lt;';
                    case '>':
                        return '&gt;';
                    case '"':
                        return '&quot;';
                    default:
                        return '&#039;';
                }
            });
        }

    }


    class MakeHtml {

        static make (from, to, rawMessage, mail_object) {
            from = Private.doEscape(from);
            to = Private.doEscape(to);
            const msgid = rawMessage.msgid;
            const password = rawMessage.password;

            const remoteLocale = mail_object.remoteLocale;
            let html = "";

            if (typeof password !== "string") {
                return "";
            }

            const msgidEncrypted = TmCrypt.encrypt(msgid.toString(), password);

            let localizedDate = "";
            if (typeof mail_object.date !== "undefined") {
                localizedDate = Lib.localizeDate(mail_object.date, remoteLocale);
            }

            let localizedDateRecv = "";
            if (typeof mail_object.receivedDate !== "undefined") {
                localizedDateRecv = Lib.localizeDate(mail_object.receivedDate, remoteLocale);
            }

            html += "<div id='mail_" + msgidEncrypted.toString() + "' class='mail'>\n";
            html += "<div id='header' class='header'>\n";
            html += "<div id='from' class='from'><span class='label'>From:</span>" + from + "</div>\n";
            html += "<div id='to' class='to'><span class='label'>To:</span>" + to + "</div>\n";
            html += "<div id='subject' class='subject'><span class='label'>Subject:</span>" + mail_object.subject + "</div>\n";
            html += "<div id='date' class='date'><span class='label'>Date:</span>" + localizedDate + "</div>\n";
            html += "<div id='recdate' class='recdate'><span class='label'>Received date:</span>" + localizedDateRecv + "</div>\n";

            const localConfig = Config.getLocalConfig();
            if (localConfig.showdkim) {
                html += RenderDKIM.renderDkim(mail_object.dkim);
            }

            if (localConfig.attachments) {
                const attachments = Private.getAttachments(mail_object, msgidEncrypted);

                attachments.forEach(function (att) {
                    html += "<div class='attachment'><span class='label'>File:</span><a download='" +
                        att.fileName +
                        "' href='" + "/tmp/" + att.content +
                        "' title='Download attachment'>" +
                        att.fileName + "</a> (" + att.length + " bytes)</div>\n";
                });
            }

            html += "<span id='delete' class='delete'><img src='images/delete.png' alt='Delete message' title='Delete message' id='" + Lib.getDeletePrefix() + msgidEncrypted + "' /></span>";
            html += "</div>\n";

            const noText = config.text.nocontent;
            let body = "<pre>" + noText + "</pre>";

            if (typeof mail_object.html === "string") {
                body = mail_object.html;
            } else if (typeof mail_object.text === "string") {
                body = "<pre>" + mail_object.text + "</pre>";
            }

            const msgId = Lib.getPassword();
            const fileName = Private.saveBodyToFile(body, msgId);

            if (typeof body === "string") {
                html += "<iframe src='/tmp/" + fileName + "' sandbox='allow-scripts'></iframe>\n";
            }

            html += "</div>\n";

            return html;
        }

    }


    module.exports.MakeHtml = MakeHtml;

}());
