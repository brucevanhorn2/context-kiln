const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = {
  mode: 'development',
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  devServer: {
    port: 3000,
    hot: true,
    historyApiFallback: true,
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/index.html',
    }),
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),
    new MonacoWebpackPlugin({
      // Include only the languages we need (reduces bundle size)
      languages: [
        'javascript',
        'typescript',
        'python',
        'java',
        'cpp',
        'csharp',
        'go',
        'rust',
        'ruby',
        'php',
        'html',
        'css',
        'scss',
        'json',
        'xml',
        'yaml',
        'markdown',
        'sql',
        'shell',
      ],
      // Include only the features we need (reduces bundle size)
      features: [
        'bracketMatching',
        'clipboard',
        'codeAction',
        'codelens',
        'colorPicker',
        'comment',
        'contextmenu',
        'coreCommands',
        'cursorUndo',
        'find',
        'folding',
        'fontZoom',
        'format',
        'gotoError',
        'gotoLine',
        'gotoSymbol',
        'hover',
        'inPlaceReplace',
        'indentation',
        'linesOperations',
        'links',
        'multicursor',
        'parameterHints',
        'quickCommand',
        'quickOutline',
        'referenceSearch',
        'rename',
        'smartSelect',
        'snippets',
        'suggest',
        'toggleHighContrast',
        'toggleTabFocusMode',
        'transpose',
        'wordHighlighter',
        'wordOperations',
        'wordPartOperations',
      ],
    }),
  ],
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        monaco: {
          test: /[\\/]node_modules[\\/]monaco-editor[\\/]/,
          name: 'monaco',
          priority: 10,
        },
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 5,
        },
      },
    },
  },
};
