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

    const MongoClient = require("mongodb").MongoClient;
    const ObjectID = require('mongodb').ObjectID;
    const assert = require("assert");
    const Config = require("./config").Config;
    const config = Config.getConfig();
    const logger = require("./logger").logger;


    class Mongo {

        static connectdb() {
            return new Promise((resolve, reject) => {
                MongoClient.connect(
                    config.mongo_url,
                    {
                        promiseLibrary: Promise,
                        useNewUrlParser: true
                    },
                    (err, db) => {
                        if (err) {
                            logger.warn("Failed to connect to the database. ${err.stack}");
                            return reject (err);
                        }
                        this.mongo_db = db;
                        return resolve(db);
                    }
                );
            });
        }

        static find(rcpt) {
            if (typeof rcpt !== "string") {
                return Promise.reject("rcpt is not a string");
            }

            return new Promise((resolve, reject) => {
                const db = this.mongo_db.db(config.mongo_db);
                assert.notStrictEqual(null, db);
                const collection = db.collection('posts');
                assert.notStrictEqual(null, collection);

                let sort = -1;
                if (typeof config.sort !== "undefined") {
                    if (config.sort==="ascending") {
                        sort = 1;
                    }
                }
                
                collection
                    .find({"mailTo": rcpt.toLowerCase()})
                    .sort({"timestamp": sort})
                    .toArray(function (err, docs) {
                    if (err) {
                        logger.warn("Query failed. ${err.stack}");
                        return reject (err);
                    }
                    resolve (docs);
                });
            });
        }

        static delete(id) {
            return new Promise((resolve, reject) => {
                const db = this.mongo_db.db(config.mongo_db);
                assert.notStrictEqual(null, db);
                const collection = db.collection('posts');
                assert.notStrictEqual(null, collection);
                const query = {
                    "_id": new ObjectID(id)
                };
                collection.deleteMany(query, function (err, res) {
                    if (err) {
                        logger.warn("Delete failed. ${err.stack}");
                        return reject (err);
                    }
                    return resolve (res);
                });
            });
        }
        
    }

    module.exports = Mongo;
}());
