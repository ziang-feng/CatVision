const path = require("path");
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
  entry: {
    popup: './src/js/popup.js',
    content: './src/js/content.js',
    background: './src/js/background.js',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /(node_modules|bower_components)/,
        loader: "babel-loader",
        options: { presets: ["@babel/env"] }
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader", 'postcss-loader']
      }
    ]
  },
  resolve: { extensions: ["*", ".js", ".jsx"] },
  output: {
    path: path.resolve(__dirname, "./build"),
    filename: "./js/[name].js"
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "popup.html",
      inject: false
    }),
    new CopyPlugin({
      patterns: [
        { from: "manifest.json", to: "./" },
        { from: "./src/img", to: "./img" },
        // { from: "./src/css", to: "./css" },
      ],
    }),
  ],
};