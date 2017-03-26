var webpack = require('webpack')
var path = require('path')

console.log('NODE_ENV = ' + process.env.NODE_ENV)

var isProd = process.env.NODE_ENV === 'production'

var filename = isProd ? 'jsonderef.min.js' : 'jsonderef.js'

module.exports = config = {
  // name: 'web',
  entry: './src/index',
  target: 'web',
  output: {
    library: 'jsonDeref',
    // path: './dist',
    path: path.resolve(__dirname, 'dist'),
    filename: filename
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {test: /\.json$/, loader: 'json-loader'}
    ]
  },
  plugins: [
    new webpack.DefinePlugin({
      LIBRARYTARGET: JSON.stringify('web')
    })
  ]
}

if(isProd){
  config.plugins.push(
    new webpack.optimize.UglifyJsPlugin({
      compress: { warnings: false },
      // beautify: true
    })
  )
}
