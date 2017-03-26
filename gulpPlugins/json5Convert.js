
var through = require('through2')
var beautify = require('gulp-beautify')
var ext_replace = require('gulp-ext-replace')
var PluginError = require('gulp-util').PluginError

var JSON5 = require('json5')

var stringify_object = require("stringify-object")

module.exports.toJson = function () {
  return convertTo('json')
}

module.exports.toJson5 = function () {
  return convertTo('json5')
}

function convertTo(toType) {
  return through.obj({ objectMode: true, allowHalfOpen: false }, function(file, encoding, callback) {
    if (file.isNull()) return callback(null, file)
    if (file.isStream()) return this.emit('error', new PluginError('toJSON5', 'Streams not supported!'))

    try {
      var parser = toType === 'json' ? JSON : (toType === 'json5' && JSON5)
      if(!parser) return this.emit('error', new PluginError('convertTo', 'invalid parser'))

      var obj = JSON5.parse(file.contents)

      var json5_string = toType === 'json5'
        ? stringify_object(obj, {singleQuotes: true})
        : JSON.stringify(obj)
      var file_content = Buffer.from(json5_string)
      // file = file.clone()
      file.contents = new Buffer(file_content)

      callback(null, file)
    } catch (e) {
      return this.emit('error', new PluginError('convertTo',
        'Error in file ' + file.path + '\n' + e.toString()
      ))
    }

  })
}
