const webpack = require("webpack");
const path = require('path');

module.exports = {
    entry: './src/main.js',
    output: {
        filename: 'main.min.js',
        path: path.resolve(__dirname, '../public/javascripts')
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            'window.jQuery': 'jquery',
            Base64: "jsbase64"
        })
    ],
    resolve: {
        alias: {
            jquery: "jquery/src/jquery",
            jsbase64: "js-base64/base64.js"
        }
    }
};
