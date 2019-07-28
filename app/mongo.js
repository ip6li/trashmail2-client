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
    const assert = require("assert");
    const Config = require("./config").Config;
    const config = Config.getConfig();
    const logger = require("./logger").logger;
    const circuitBreaker = require('opossum');


    class Private {

        constructor() {

        }


        connect() {
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


        find(rcpt) {
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

        delete(id) {
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

    class Mongo {

        constructor() {
            this.options = {
                timeout: 3000, // If our function takes longer than 3 seconds, trigger a failure
                errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
                resetTimeout: 30000 // After 30 seconds, try again.
            };

            this.db = new Private();
            const breaker = circuitBreaker(this.db.connect, this.options);

            return breaker.fire()
                .then(console.log)
                .catch(console.error);
        }

        find(rcpt) {
            const breaker = circuitBreaker(this.db.find, this.options);
            return breaker.fire(rcpt)
                .then(console.log)
                .catch(console.error);
        }

        delete(id) {
            const breaker = circuitBreaker(this.db.delete, this.options);
            return breaker.fire(id)
                .then(console.log)
                .catch(console.error);
        }
    }

    module.exports = Mongo;
}());
