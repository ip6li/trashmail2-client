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
/*global require, module, intl,  __dirname, Intl */

(function () {
    "use strict";

    const md5 = require("md5");
    const crypto = require('crypto');
    const algorithm = 'aes-256-ctr';

    class Private {

        static getEncryptionKey(password) {
            return md5(password);
        }

        static getIvLength() {
            return 16;
        }

        static getAlgorithm() {
            return 'aes-256-cbc';
        }

        static getSeparator() {
            return '_';
        }

    }


    class TmCrypt {

        static encrypt(text, password) {
            let iv = crypto.randomBytes(Private.getIvLength());
            let cipher = crypto.createCipheriv(
                Private.getAlgorithm(),
                Buffer.from(Private.getEncryptionKey(password)),
                iv
            );
            let encrypted = cipher.update(text);

            encrypted = Buffer.concat([encrypted, cipher.final()]);

            return iv.toString('hex') + Private.getSeparator() + encrypted.toString('hex');
        }

        static decrypt(text, password) {
            let textParts = text.split(Private.getSeparator());
            let iv = Buffer.from(textParts.shift(), 'hex');
            let encryptedText = Buffer.from(textParts.join(Private.getSeparator()), 'hex');
            let decipher = crypto.createDecipheriv(
                Private.getAlgorithm(),
                Buffer.from(Private.getEncryptionKey(password)),
                iv
            );
            let decrypted = decipher.update(encryptedText);

            decrypted = Buffer.concat([decrypted, decipher.final()]);

            return decrypted.toString();
        }
    }

    module.exports.TmCrypt = TmCrypt;

}());
