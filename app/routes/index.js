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
/*global require, module,  __dirname, config */

"use strict";

const express = require('express');
const router = express.Router();
const fs = require('fs');
const Trashmail = require ("../trashmail").Trashmail;
const Lib = require ("../lib").Lib;
const Config = require ("../config").Config;


/* GET home page. */
router.get('/', function (req, res, next) {
    const sess = req.session;
    let password = null;

    if (sess.password) {
        password = req.session.password;
    } else {
        password = Lib.getPassword();
        sess.password = password;
    }

    Trashmail.doRequest (Trashmail.doGet, sess, req, res, next, password);
});


/* POST home page. */
router.post('/', function (req, res, next) {
    const sess = req.session;
    let password = null;

    if (sess.password) {
        password = sess.password;
    } else {
        res.send("<span class='error'>" + Config.getConfig().text.invalid_request + "</span>");
    }

    Trashmail.doRequest (Trashmail.doPost, sess, req, res, next, password);
});


if (!fs.existsSync(Lib.getTmpPath())){
    fs.mkdirSync(Lib.getTmpPath());
}

module.exports = router;
