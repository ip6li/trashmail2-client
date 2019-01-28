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

    const $ = require ("jquery").$;
    global.jQuery = global.$ = $;
    const jqueryui = require ("jquery-ui");
    const QRCode = require('qrcode');

    let name = null;
    let domain = null;

    const url = $(location).attr('href');
    const domainRegex = "^([a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.){1,2}[a-zA-Z]{2,}$";
    const nameRegex = "^[a-zA-Z0-9._+-]{3,64}$";
    const undef = "undefined";

    const submitButton = $("#submit");
    const impressumButton = $("#b_impressum");
    const nameInput = $("#name");
    const domainSelect = $("#domain");
    const mailAddress = $("#mailaddress");
    const impress = $("#impressum");
    const dialogDelete = $("#dialogDelete");
    const noscript = $("#noscript");
    const main = $("#main");

    let config = undef;

    class Client {

        static createQrCode(name, domain) {
            let qrurl = Config.getConfig().baseurl;
            if (validation.validateName(name) && validation.validateDomain(domain)) {
                qrurl += "/?name=" + name + "&domain=" + domain;
            }
            const qrOptions = {
                errorCorrectionLevel: 'H'
            };
            return QRCode.toDataURL(qrurl, qrOptions).then((qrcode)=> {
                return {qrcode: qrcode};
            }).catch((err)=>{
                logger.log("error", "Cannot create QR code: " + err.message);
                return {qrcode: ""};
            });
        }

        static setSubmitState(state) {
            const submit_id = $("#submit");
            submit_id.prop("disabled", !state);
        }


        static validateDomain(domain) {
            if (domain.length > 64) {
                return false;
            }
            const re = new RegExp(domainRegex);
            return domain.match(re);
        }


        static validateName(name) {
            if (name.length > 64 || name.length < 3) {
                return false;
            }
            const re = new RegExp(nameRegex);
            return name.match(re);
        }

        static setDeleteIcons() {
            const links = $('#mails').find('img').collect('id');
            links.forEach(function (id) {
                const img = $('#' + id);

                img.on('click', {uid: id}, function (event) {
                    Client.displayDialog(event.data.uid);
                });
            });
        }


        static hideMail(msg) {
            const divMail = $("#mail_" + msg.uid);
            divMail.hide();
        }


        static requestDelete(what) {
            $.ajax({
                method: "POST",
                url: url,
                data: {do: "delete", delete: what}
            })
                .done(function (json) {
                    const msg = JSON.parse(json);
                    if (msg.res === 'succeeded') {
                        Client.hideMail(msg);
                    }
                });
        }

        static requestQrCode(name, domain) {
            if (config.qrcode) {
                const qrCode = Client.createQrCode(name, domain);
                const img = "<img src='" + qrCode + "' alt='qrCode'/>";
                const qr = $("#qrcode");
                qr.empty().append(img);
            }
        }

        static requestConfig() {
            const dfd = $.Deferred();
            $.ajax({
                method: "POST",
                url: url,
                data: {do: "config"}
            })
                .done(function (json) {
                    config = JSON.parse(json);
                    dfd.resolve();
                });
            return dfd.promise();
        }


        static setMailForState(state) {
            const divrcpt = $("#divrcpt");
            const divrcpt_label = $("#mails_for_label");
            if (state) {
                divrcpt.show();
                divrcpt_label.show();
            } else {
                divrcpt.hide();
                divrcpt_label.hide();
            }
        }


        static updateDivRcpt(data) {
            const divrcpt = $("#divrcpt");
            divrcpt.empty().append(data);
            Client.setMailForState(true);
        }


        static submitButtonPressed(data) {
            Client.setSubmitState(false);
            data.do = "getmails";
            $.ajax({
                method: "POST",
                url: url,
                data: data
            })
                .done(function (mails) {
                    const divMails = $("#mails");
                    divMails.empty();

                    if (Client.validateName(data.name) && Client.validateDomain(data.domain)) {
                        Client.updateDivRcpt(data.name + "@" + data.domain);
                    }

                    if (mails.length > 0) {
                        divMails.append(Base64.decode(mails));
                        Client.setDeleteIcons();
                    } else {
                        //noinspection JSUnresolvedVariable
                        divMails.append("<span class='nomails'>" + config.text.nomails + "</span>");
                    }
                    Client.setSubmitState(true);
                });
        }


        static displayDialog(encryptedUid) {
            $("#dialogDelete").dialog({
                dialogClass: "no-close",
                buttons: [
                    {
                        id: "delete",
                        text: "Löschen",
                        click: function () {
                            Client.requestDelete(encryptedUid);
                            $(this).dialog("close");
                        }
                    },
                    {
                        text: "Abbruch",
                        click: function () {
                            $(this).dialog("close");
                        }
                    }
                ]
            });
        }

        static updateMailAddress() {
            const name = nameInput.val();
            const domain = domainSelect.val();

            if (typeof name !== undef && domain !== undef && name !== "" && domain !== "") {
                if (Client.validateName(name) && Client.validateDomain(domain)) {
                    const emailAddress = name + "@" + domain;
                    mailAddress.empty().append(emailAddress);
                    Client.requestQrCode(name, domain);
                }
            } else {
                mailAddress.empty();
                $("#qrcode").empty();
            }
        }

        static document_ready () {
            Client.setMailForState(false);
            $.when(Client.requestConfig()).then(function () {
                submitButton.on('click', function () {
                    const data = {};
                    data.name = nameInput.val();
                    data.domain = domainSelect.val();
                    Client.submitButtonPressed(data);
                });

                impressumButton.on('click', function () {
                    $("#impressum").dialog({
                        dialogClass: "no-close",
                        buttons: [
                            {
                                text: "OK",
                                click: function () {
                                    $(this).dialog("close");
                                }
                            }
                        ]
                    });
                });

                const tmform = $("#tmform");

                tmform.submit(function() {
                    return false;
                });

                tmform.keypress(function (event) {
                    if (event.keyCode === 10 || event.keyCode === 13) {
                        event.preventDefault();
                        submitButton.click();
                        event.stopPropagation();
                        submitButton.click();
                        Client.updateMailAddress();
                    }
                });

                domainSelect.change(function () {
                    Client.updateMailAddress();
                });

                let urlParams = {};
                window.onpopstate = function () {
                    const pl = /\+/g;  // Regex for replacing addition symbol with a space
                    const search = /([^&=]+)=?([^&]*)/g;
                    const decode = function (s) {
                        return decodeURIComponent(s.replace(pl, " "));
                    };
                    const query = window.location.search.substring(1);

                    let match = [];
                    do {
                        match = search.exec(query);
                        if (match !== null) {
                            urlParams[decode(match[1])] = decode(match[2]);
                        }
                    } while (match !== null);
                    Client.updateMailAddress();
                }();

                if (typeof urlParams.domain !== "undefined" && typeof urlParams.name !== "undefined" &&
                    Client.validateName(urlParams.name) && Client.validateDomain(urlParams.domain)) {
                    nameInput.val(urlParams.name);
                    domainSelect.val(urlParams.domain);
                    const rfc822 = nameInput.val() + "@" + domainSelect.val();
                    Client.updateDivRcpt(rfc822);
                    Client.requestQrCode(urlParams.name, urlParams.domain);
                }

                const name = nameInput.val();
                const domain = domainSelect.val();
                if (typeof name !== undef && typeof domain !== undef && name !== "" && domain !== "") {
                    mailAddress.empty().append(nameInput.val() + "@" + domainSelect.val());
                }

                impress.empty().append(config.text.impress);
                dialogDelete.empty().append(config.text.dialogDelete);

                noscript.hide();
                main.show();
                Client.setSubmitState(true);
            });
        }
    }



    $.fn.collect = function (fn) {
        const values = [];

        if (typeof fn === 'string') {
            const prop = fn;
            fn = function () {
                return this.attr(prop);
            };
        }

        $(this).each(function () {
            const val = fn.call($(this));
            values.push(val);
        });
        return values;
    };

    if (name) {
        nameInput.val(name);
    }

    if (domain) {
        domainSelect.val(domain);
    }

    $(document).ready(function () {
        Client.document_ready();
    });

}());
