"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isNode = exports.isBrowser = undefined;

var _getOwnPropertyNames = require("babel-runtime/core-js/object/get-own-property-names");

var _getOwnPropertyNames2 = _interopRequireDefault(_getOwnPropertyNames);

var _promise = require("babel-runtime/core-js/promise");

var _promise2 = _interopRequireDefault(_promise);

exports.getFile = getFile;
exports.parseCache = parseCache;
exports.slashPointer = slashPointer;

var _fs = require("fs");

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var isBrowser = exports.isBrowser = new Function("try {return this===window;}catch(e){ return false;}");
var isNode = exports.isNode = new Function("try {return this===global;}catch(e){return false;}");

function getFile(url) {
  var extList = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : ['json', 'json5'];

  var filePath = url.replace(/^file:\/\//, '').replace(/\.[^/.]+$/, '');
  filePath = filePath.split("?")[0].split("#")[0];

  if (filePath.indexOf(':') != -1) {
    filePath = filePath.slice(1);
  }

  return new _promise2.default(function (resolve, reject) {
    var i = 0;
    function tryPath(path) {
      _fs2.default.stat(path, function (err, stats) {
        if (!err) {
          _fs2.default.readFile(path, 'utf8', function (err, data) {
            if (err) {
              reject("Error acessing " + filePath);
            } else {
              resolve(data);
            }
          });
        } else if (i < extList.length) {
          tryPath(filePath + "." + extList[i++]);
        } else {
          reject("File " + filePath + " not found");
        }
      });
    }
    tryPath(filePath);
  });
}

function parseCache(obj) {
  var result = {};
  (0, _getOwnPropertyNames2.default)(obj).map(function (key) {
    result[key] = {
      raw: obj[key]
    };
  });
  return result;
}

function slashPointer(pointer) {
  if (pointer && !pointer.startsWith('/')) {
    pointer = '/' + pointer;
  }
  return pointer;
}