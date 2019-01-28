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

    const QRCode = require('qrcode');


    function createQrCode(name, domain, qrurl = ".") {
        qrurl += "/?name=" + name + "&domain=" + domain;
        const qrOptions = {
            errorCorrectionLevel: 'H'
        };
        return QRCode.toDataURL(qrurl, qrOptions).then((qrcode) => {
            return qrcode;
        }).catch(() => {
            return "";
        });
    }


    window.createQrCode = createQrCode;

}());
