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

    class RenderDKIM {

        static renderDkim (dkim) {
            let dkimHtml = "none";
            let dkimClass = "bold orange";

            if (typeof dkim !== "undefined") {
                if (dkim.result === "pass") {
                    if (dkim.dnssec === "secure") {
                        dkimClass = "bold green";
                    } else {
                        dkimClass = "bold orange";
                    }
                } else {
                    dkimClass = "bold red";
                }

                dkimHtml = dkim.result +
                    " (" + dkim.bits + " bit " +
                    dkim.dnssec + ")";
            }

            const dkimHeader = "<div id='dkimstate' class='dkimstate'>" +
                "<span class='label'>DKIM state:</span>" +
                "<span class='" + dkimClass + "'>";
            const dkimTrailer = "</span>" +
                "</div>\n";

            return dkimHeader + dkimHtml + dkimTrailer;
        }

    }

    module.exports.RenderDKIM = RenderDKIM;

}());
