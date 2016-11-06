'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var _objectWithoutProperties2 = require('babel-runtime/helpers/objectWithoutProperties');

var _objectWithoutProperties3 = _interopRequireDefault(_objectWithoutProperties2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _getOwnPropertyNames = require('babel-runtime/core-js/object/get-own-property-names');

var _getOwnPropertyNames2 = _interopRequireDefault(_getOwnPropertyNames);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _assign = require('babel-runtime/core-js/object/assign');

var _assign2 = _interopRequireDefault(_assign);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var resourceCache = {};

var defaultOptions = {
  cache: true,
  cacheTTL: 300000,
  failOnMissing: false,
  externalOnly: false,
  requireStartSlash: false,
  localLoader: undefined,
  externalLoader: undefined,
  jsonResources: {}
};

if (_fs2.default) defaultOptions.basePath = process.cwd();

function isCircular(pointer, refChain) {
  return refChain.some(function (backRef) {
    return backRef.startsWith(pointer);
  });
}

function slashPointer(pointer) {
  if (pointer && !pointer.startsWith('/')) {
    pointer = '/' + pointer;
  }
  return pointer;
}

function deref(json, options) {
  var pointer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

  options = (0, _assign2.default)({}, defaultOptions, options);

  if (options.localLoader && typeof options.localLoader !== 'function') throw new Error('options.localLoader must be a function');
  if (options.externalLoader && typeof options.externalLoader !== 'function') throw new Error('options.externalLoader must be a function');

  var jsonCache = {};

  var defaultLoaders = {
    web: function web(url, baseUrl) {
      return fetch(url).then(function (res) {
        return res.text();
      }).then(function (data) {
        return JSON.parse(data);
      });
    },
    json: function json(key) {
      key = key.substring(5);
      if (options.jsonResources.hasOwnProperty(key)) {
        return _promise2.default.resolve(options.jsonResources[key]);
      } else {
        throw new Error('can\'t find ' + key);
      }
    }
  };

  if (_fs2.default) {
    defaultLoaders.file = function (url, baseUrl) {
      return new _promise2.default(function (accept, reject) {
        _fs2.default.readFile(_path2.default.resolve(baseUrl, url), 'utf8', function (err, data) {
          if (err) throw err;
          accept(JSON.parse(data));
        });
      });
    };
  }

  return _promise2.default.resolve().then(function () {
    if (typeof json === 'string') {
      return getJsonResource(json);
    } else if ((typeof json === 'undefined' ? 'undefined' : (0, _typeof3.default)(json)) === 'object') {
      (0, _assign2.default)(jsonCache, { 'json:': {
          raw: json,
          parsed: Array.isArray(json) ? [] : {},
          baseUrl: options.basePath
        }
      });
      return jsonCache['json:'];
    } else {
      throw new Error('Invalid param. Must be object, array or string');
    }
  }).then(function (_ref) {
    var raw = _ref.raw;
    var parsed = _ref.parsed;

    var jsonResourcesObject = {};
    (0, _getOwnPropertyNames2.default)(options.jsonResources).forEach(function (key) {
      jsonResourcesObject['json:' + key] = { raw: options.jsonResources[key], parsed: {}, baseUrl: options.basePath };
    });

    (0, _assign2.default)(jsonCache, jsonResourcesObject, options.cache ? resourceCache : {});

    return processJson(raw, parsed, 0, pointer, {}, []);
  });

  function getJsonResource(url) {
    var baseUrl = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : options.basePath;
    var params = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

    return new _promise2.default(function (accept, reject) {
      var key = url,
          newBaseUrl = url,
          defaultLoader = void 0;
      if (url.startsWith('http://') || url.startsWith('https://')) {
        defaultLoader = defaultLoaders.web;
      } else if (url.startsWith('json:')) {
        defaultLoader = defaultLoaders.json;
      } else if (_fs2.default) {
        key = _path2.default.resolve(baseUrl, url);
        newBaseUrl = _path2.default.dirname(key);
        defaultLoader = defaultLoaders.file;
      }

      var keys = (0, _getOwnPropertyNames2.default)(jsonCache);
      var index = keys.indexOf(key);
      var cached = jsonCache[key];

      if (cached) {
        accept((0, _assign2.default)({}, cached, { resourceId: index }));
      } else {
        return (options.externalLoader ? options.externalLoader(url, baseUrl, params, defaultLoader) : defaultLoader(url, baseUrl)).then(function (json) {
          cached = jsonCache[key] = { raw: json, parsed: {}, baseUrl: newBaseUrl };
          accept((0, _extends3.default)({}, cached, { resourceId: keys.length }));
        });
      }
    });
  }

  function processJson(rawJson) {
    var parsedJson = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var resourceId = arguments[2];
    var pointer = arguments[3];
    var params = arguments[4];
    var refChain = arguments[5];

    var key = (0, _getOwnPropertyNames2.default)(jsonCache)[resourceId];
    var baseUrl = jsonCache[key].baseUrl;

    if (options.localLoader) {
      return options.localLoader(pointer, params, solveReference.bind(this, refChain));
    } else {
      return solveReference(refChain, pointer);
    }

    function processNode(rawNode, parsedNode, cursor, refChain, prop) {
      var singleProp = !!prop;
      var props = singleProp ? [prop] : (0, _getOwnPropertyNames2.default)(rawNode);

      var propIndex = -1,
          nodeChanged = 0;

      return new _promise2.default(function (accept, reject) {
        nextProp();

        function nextProp() {
          propIndex++;

          if (propIndex === props.length) {
            if (singleProp) {
              accept(parsedNode[prop]);
            } else {
              accept(nodeChanged ? parsedNode : rawNode);
            }
          } else {
            (function () {
              var prop = props[propIndex];
              var sourceValue = rawNode[prop];
              var propCursor = cursor + '/' + prop;

              if (parsedNode.hasOwnProperty(prop)) {
                nodeChanged |= parsedNode[prop] !== sourceValue;
                nextProp();
              } else if ((typeof sourceValue === 'undefined' ? 'undefined' : (0, _typeof3.default)(sourceValue)) !== 'object' || sourceValue === null) {
                  parsedNode[prop] = sourceValue;
                  nextProp();
                } else if (sourceValue.hasOwnProperty('$ref')) {
                    (function () {
                      var $ref = sourceValue.$ref;
                      var params = (0, _objectWithoutProperties3.default)(sourceValue, ['$ref']);

                      var _$ref$split = $ref.split('#');

                      var _$ref$split2 = (0, _slicedToArray3.default)(_$ref$split, 2);

                      var url = _$ref$split2[0];
                      var _$ref$split2$ = _$ref$split2[1];
                      var pointer = _$ref$split2$ === undefined ? '' : _$ref$split2$;

                      var branchRefChain = [].concat((0, _toConsumableArray3.default)(refChain), [propCursor]);

                      _promise2.default.resolve().then(function () {
                        if (url) {
                          return getJsonResource(url, baseUrl, params);
                        } else {
                          return { raw: rawJson, parsed: parsedJson, resourceId: resourceId };
                        }
                      }).then(function (_ref2) {
                        var raw = _ref2.raw;
                        var parsed = _ref2.parsed;
                        var resourceId = _ref2.resourceId;

                        if (!url && options.externalOnly) {
                          return sourceValue;
                        } else {
                          var ref = resourceId + '#' + slashPointer(pointer);
                          if (isCircular(ref, [propCursor]) || singleProp && isCircular(ref, refChain)) {
                            throw new Error('pointer ' + ref + ' is circular');
                          }
                          return processJson(raw, parsed, resourceId, pointer, params, branchRefChain);
                        }
                      }).then(function (newValue) {
                        nodeChanged = 1;
                        parsedNode[prop] = newValue;
                        nextProp();
                      }).catch(function (err) {
                        if (options.failOnMissing) {
                          reject(err);
                        } else {
                          parsedNode[prop] = sourceValue;
                          nextProp();
                        }
                      });
                    })();
                  } else {
                      var placeholder = parsedNode[prop] = Array.isArray(sourceValue) ? [] : {};
                      processNode(sourceValue, placeholder, propCursor, refChain).then(function (newValue) {
                        nodeChanged |= newValue !== sourceValue;
                        nextProp();
                      }).catch(reject);
                    }
            })();
          }
        }
      });
    }

    function solveReference(refChain, pointer) {
      var cursor = resourceId + '#';

      if (!pointer) return processNode(rawJson, parsedJson, cursor, refChain);

      return _promise2.default.resolve().then(function () {
        var rawNode = rawJson,
            parsedNode = parsedJson;
        var tokens = slashPointer(pointer).split('/');
        tokens.shift();
        var prop = tokens[0];

        while (parsedNode.hasOwnProperty(prop)) {
          rawNode = rawNode[prop];
          parsedNode = parsedNode[prop];
          cursor += '/' + tokens.shift();
          prop = tokens[0];
        }

        if (!tokens.length) {
          return parsedNode;
        }

        prop = tokens.shift();

        return _promise2.default.resolve().then(function () {
          return processNode(rawNode, parsedNode, cursor, refChain, prop);
        }).then(function (parsedNode) {
          if (!parsedNode) throw new Error(cursor + '/' + prop + ' of pointer ' + pointer + ' at ' + refChain[refChain.length - 1] + ' did not return object');

          while (parsedNode.hasOwnProperty(tokens[0]) && (parsedNode = parsedNode[tokens[0]])) {
            tokens.shift();
          }
          if (!tokens.length) {
            return parsedNode;
          } else {
            throw new Error('invalid pointer ' + pointer + ' at ' + refChain[refChain.length - 1]);
          }
        });
      });
    }
  }
}

exports.default = deref;
module.exports = exports['default'];