/* jshint node: true */
/* jshint esversion: 6 */
/* jshint bitwise: false */
/* global require, module, intl,  __dirname, Intl */

(function () {
    "use strict";

    class WebsocketAjax {

        static init(config) {
            this.config = config;
        }

        static ajax(msg) {
            const WebSocket = require('ws');

            return Promise.then((msg) => {
                const ws = new WebSocket(this.wsurl, {
                    origin: this.config.baseurl
                });

                ws.on('open', function open() {
                    ws.send(msg);
                });

                ws.on('close', function close() {
                    // do nothing yet
                });

                ws.on('message', function incoming(data) {
                    return Promise.resolve(data);
                });
            });

        }

    }

    module.exports.WebsocketAjax = WebsocketAjax;

}());
