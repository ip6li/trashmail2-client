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
    const circuitBreaker = require('opossum');

    const mongoClientOptions = {useNewUrlParser: true};
    const cb_options = {
        timeout: 3000, // If our function takes longer than 3 seconds, trigger a failure
        errorThresholdPercentage: 50, // When 50% of requests fail, trip the circuit
        resetTimeout: 30000 // After 30 seconds, try again.
    };

    class Private {

        static close(db) {
            db.close(false).then(()=> {
                logger.debug("db closed");
            });
        }

        static find(rcpt) {
            return new Promise((resolve, reject) => {
                MongoClient.connect(
                    config.mongo_url,
                    mongoClientOptions,
                    function (err, mongo_db) {
                        assert.strictEqual(null, err);

                        const db = mongo_db.db(config.mongo_db);
                        const collection = db.collection('posts');
                        let sort = -1;
                        if (typeof config.sort !== "undefined") {
                            if (config.sort === "ascending") {
                                sort = 1;
                            }
                        }
                        return collection
                            .find({"mailTo": rcpt.toLowerCase()})
                            .sort({"timestamp": sort})
                            .toArray(function (err, docs) {
                                if (err) {
                                    logger.warn("Query failed. ${err.stack}");
                                    Private.close(mongo_db);
                                    return reject(err);
                                }
                                Private.close(mongo_db);
                                return resolve(docs);
                            });
                    });
            });
        }

        static delete(id) {
            return new Promise((resolve, reject) => {
                MongoClient.connect(
                    config.mongo_url,
                    mongoClientOptions,
                    function (err, mongo_db) {
                        assert.strictEqual(null, err);
                        const db = mongo_db.db(config.mongo_db);
                        assert.notStrictEqual(null, db);
                        const collection = db.collection('posts');
                        assert.notStrictEqual(null, collection);
                        const query = {
                            "_id": new ObjectID(id)
                        };
                        collection.deleteMany(query, function (err, res) {
                            Private.close(mongo_db);
                            if (err) {
                                logger.warn("Delete failed. ${err.stack}");
                                return reject(err);
                            }
                            return resolve(res);
                        });
                    });
            });
        }

    }

    class Mongo {

        static find(rcpt) {
            const breaker = circuitBreaker(Private.find, cb_options);
            return breaker.fire(rcpt);
        }

        static delete(id) {
            const breaker = circuitBreaker(Private.delete, cb_options);
            return breaker.fire(id);
        }

    }

    module.exports = Mongo;
}());
