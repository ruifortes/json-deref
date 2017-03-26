'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _getOwnPropertyNames = require('babel-runtime/core-js/object/get-own-property-names');

var _getOwnPropertyNames2 = _interopRequireDefault(_getOwnPropertyNames);

exports.default = parseRef;

var _whatwgUrl = require('whatwg-url');

var _whatwgUrl2 = _interopRequireDefault(_whatwgUrl);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var parseURL = _whatwgUrl2.default.parseURL;
var URL = _whatwgUrl2.default.URL;
var serializeURL = _whatwgUrl2.default.serializeURL;

function replaceVars(text, vars) {
  (0, _getOwnPropertyNames2.default)(vars).forEach(function (key) {
    text = text.replace('{' + key + '}', vars[key]);
  });
  return text;
}

function parseRef($ref, currentId) {
  var refChain = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];
  var vars = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  var _url = new URL(replaceVars($ref, vars), currentId);
  var url = _url.origin + _url.pathname + _url.search;
  var pointer = _url.hash;
  var isLocalRef = currentId === url;

  var isCircular;

  if (refChain.length) {
    var ref_urlRecord = parseURL(_url.href);

    isCircular = refChain.some(function (backRef) {
      var backRef_urlRecord = parseURL(backRef);

      var externallyCircular = ref_urlRecord.path.every(function (token, i) {
        return token === backRef_urlRecord.path[i];
      });

      var ref_frag = ref_urlRecord.fragment || '';
      var backRef_frag = backRef_urlRecord.fragment || '';

      var internallyCircular = backRef_frag.startsWith(ref_frag);

      return externallyCircular && internallyCircular;
    });
  }

  return { url: url, pointer: pointer, isLocalRef: isLocalRef, isCircular: isCircular };
}