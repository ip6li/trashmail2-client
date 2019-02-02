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

/* jshint browser: true */
/* jshint jquery: true */
/* jshint esversion: 6  */
/* global Base64 */
/* global Intl */

(function () {
    "use strict";

    let name = null;
    let domain = null;

    const url = $(location).attr('href');
    const undef = "undefined";

    const fields = {};
    const strings = {};
    
    let config = undef;

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


    function setSubmitState(state) {
        const submit_id = $("#submit");
        submit_id.prop("disabled", !state);
    }


    function validateDomain(domain) {
        if (domain.length > 64) {
            return false;
        }
        const re = new RegExp(config.domainRegex);
        return domain.match(re);
    }


    function validateName(name) {
        if (name.length > 64 || name.length < 3) {
            return false;
        }
        const re = new RegExp(config.nameRegex);
        return name.match(re);
    }




    function setDeleteIcons() {
        const links = $('#mails').find('img').collect('id');
        links.forEach(function (id) {
            const img = $('#' + id);

            img.on('click', {uid: id}, function (event) {
                displayDialog(event.data.uid);
            });
        });
    }


    function hideMail(msg) {
        const divMail = $("#mail_" + msg.uid);
        divMail.hide();
    }


    function requestDelete(what) {
        $.ajax({
            method: "POST",
            url: url,
            data: {do: "delete", delete: what}
        })
            .done(function (json) {
                const msg = JSON.parse(json);
                if (msg.res === 'succeeded') {
                    hideMail(msg);
                }
            });
    }


    function requestQrCode(name, domain) {
        if (config.qrcode) {
            window.createQrCode(name, domain).then(function(qrcode) {
                const img = "<img src='" + qrcode + "' alt='qrCode'/>";
                fields.qrcode.empty().append(img);
            });
        }
    }


    function requestConfig() {
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


    function setMailForState(state) {
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


    function updateDivRcpt(data) {
        const divrcpt = $("#divrcpt");
        divrcpt.empty().append(data);
        setMailForState(true);
    }


    function submitButtonPressed(data) {
        setSubmitState(false);
        data.do = "getmails";
        $.ajax({
            method: "POST",
            url: url,
            data: data
        })
            .done(function (b64mails) {
                fields.divMails.empty();

                if (validateName(data.name) && validateDomain(data.domain)) {
                    updateDivRcpt(data.name + "@" + data.domain);
                }

                const arr_mails = JSON.parse(Base64.decode(b64mails));
                if (arr_mails.length > 0) {
                    arr_mails.forEach(function(item) {
                        fields.divMails.append(item);
                    });
                    setDeleteIcons();
                } else {
                    //noinspection JSUnresolvedVariable
                    fields.divMails.append("<span class='nomails'>" + strings.nomails + "</span>");
                }
                setSubmitState(true);
            });
    }


    function displayDialog(encryptedUid) {
        fields.dialogDelete.dialog({
            dialogClass: "no-close",
            buttons: [
                {
                    id: "delete",
                    text: strings.delete,
                    click: function () {
                        requestDelete(encryptedUid);
                        $(this).dialog("close");
                    }
                },
                {
                    text: strings.abort,
                    click: function () {
                        $(this).dialog("close");
                    }
                }
            ]
        });
    }

    
    const setFields = function () {
        fields.tmform = $("#tmform");
        fields.submitButton = $("#submit");
        fields.impressumButton = $("#b_impressum");
        fields.nameInput = $("#name");
        fields.domainSelect = $("#domain");
        fields.mailAddress = $("#mailaddress");
        fields.impress = $("#impressum");
        fields.dialogDelete = $("#dialogDelete");
        fields.noscript = $("#noscript");
        fields.main = $("#main");
        fields.qrcode = $("#qrcode");
        fields.divMails = $("#mails");
    };


    const loadStrings = function() {
        const jq_strings = $("#strings").children();
        jq_strings.each(function(i, o) {
            const key = $(o).attr('id').replace("str_", "");
            strings[key] = $(o).val();
        });
    };


    if (name) {
        fields.nameInput.val(name);
    }


    if (domain) {
        fields.domainSelect.val(domain);
    }


    function updateMailAddress() {
        const name = fields.nameInput.val();
        const domain = fields.domainSelect.val();

        if (typeof name !== undef && domain !== undef && name !== "" && domain !== "") {
            if (validateName(name) && validateDomain(domain)) {
                const emailAddress = name + "@" + domain;
                fields.mailAddress.empty().append(emailAddress);
                requestQrCode(name, domain);
            }
        } else {
            fields.mailAddress.empty();
            fields.qrcode.empty();
        }
    }


    $(document).ready(function () {
        setFields();
        loadStrings();
        fields.noscript.hide();
        setMailForState(false);
        $.when(requestConfig()).then(function () {
            fields.submitButton.on('click', function () {
                const data = {};
                data.name = fields.nameInput.val();
                data.domain = fields.domainSelect.val();
                submitButtonPressed(data);
            });

            fields.impressumButton.on('click', function () {
                fields.impress.dialog({
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

            fields.tmform.submit(function() {
                return false;
            });

            fields.tmform.keypress(function (event) {
                if (event.keyCode === 10 || event.keyCode === 13) {
                    event.preventDefault();
                    fields.submitButton.click();
                    event.stopPropagation();
                    fields.submitButton.click();
                    updateMailAddress();
                    return event;
                }
            });

            fields.nameInput.keyup(function (event) {
                if (fields.nameInput.val().length<3) {
                    fields.mailAddress.empty();
                    return event;
                }
                if (fields.nameInput.val().match(config.nameRegex)) {
                    updateMailAddress();
                    return event;
                } else {
                    fields.nameInput.val(fields.nameInput.val().replace(/[^a-zA-Z0-9._+-]/g,""));
                    return false;
                }
            });

            fields.domainSelect.change(function () {
                updateMailAddress();
            });

            let urlParams = {};
            window.onpopstate = function (event) {
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
                updateMailAddress();
                return event;
            }();

            if (typeof urlParams.domain !== "undefined" && typeof urlParams.name !== "undefined" &&
                validateName(urlParams.name) && validateDomain(urlParams.domain)) {
                fields.nameInput.val(urlParams.name);
                fields.domainSelect.val(urlParams.domain);
                const rfc822 = fields.nameInput.val() + "@" + fields.domainSelect.val();
                updateDivRcpt(rfc822);
                requestQrCode(urlParams.name, urlParams.domain);
            }

            const name = fields.nameInput.val();
            const domain = fields.domainSelect.val();
            if (typeof name !== undef && typeof domain !== undef && name !== "" && domain !== "") {
                fields.mailAddress.empty().append(fields.nameInput.val() + "@" + fields.domainSelect.val());
            }

            fields.impress.empty().append(config.text.impress);
            fields.dialogDelete.empty().append(strings.ackdel);

            fields.main.show();
            setSubmitState(true);
        });
    });

}());
