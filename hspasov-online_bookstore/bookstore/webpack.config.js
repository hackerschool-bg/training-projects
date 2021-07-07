const path = require('path');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');

module.exports = {
  entry: {
    'index': './views/index.jsx',
    'login': './views/login.jsx',
    'register': './views/register.jsx',
    'admin': './views/admin.jsx'
  },
  output: {
    path: path.resolve(__dirname, './public/js'),
    filename: '[name].js',
    publicPath: '/js'
  },
  module: {
    rules: [
      {
        test: /\.js$|\.jsx$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['env', 'react']
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.svg$|\.woff$|\.woff2$|\.[ot]tf$|\.eot$|\.png$/,
        use: 'url-loader'
      }
    ]
  },
  plugins: [
    new ProgressBarPlugin()
  ],
  watch: true,
  watchOptions: {
    ignored: /node_modules/
  }
};
