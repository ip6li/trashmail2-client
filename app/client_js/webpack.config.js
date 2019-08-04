/* jshint esversion: 6  */
/* global require, module, __dirname */

const webpack = require("webpack");
const path = require('path');

module.exports = {
    entry: './src/main.js',
    mode: 'production',
    output: {
        filename: 'main.min.js',
        path: path.resolve(__dirname, '../public/javascripts')
    },
    plugins: [
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
            'window.jQuery': 'jquery',
        })
    ],
    resolve: {
        alias: {
            jquery: "jquery/src/jquery"
        }
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: 'css-loader'
            },
            {
                test: /\.(jpe?g|png|gif)$/i,
                use: {
                    loader: "file-loader",
                    options: {
                        outputPath: (url, resourcePath, context) => {
                            const relativePath = path.relative(context, resourcePath);
                            return `{relativePath}/../../../public/tmp/${url}`;
                        }
                    },
                }
            },
        ]
    }
};
