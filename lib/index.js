'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _objectWithoutProperties2 = require('babel-runtime/helpers/objectWithoutProperties');

var _objectWithoutProperties3 = _interopRequireDefault(_objectWithoutProperties2);

var _getOwnPropertyNames = require('babel-runtime/core-js/object/get-own-property-names');

var _getOwnPropertyNames2 = _interopRequireDefault(_getOwnPropertyNames);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _extends2 = require('babel-runtime/helpers/extends');

var _extends3 = _interopRequireDefault(_extends2);

var _parseRef3 = require('./parseRef');

var _parseRef4 = _interopRequireDefault(_parseRef3);

var _util = require('./util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var jsonParser = JSON.parse;

var globalCache = {};

var defaultOptions = {
  cache: false,
  cacheTTL: 300000,
  failOnMissing: true,
  externalOnly: false,
  skipCircular: false,
  loaders: {
    http: function http(url) {
      return fetch(url).then(function (res) {
        return res.json();
      });
    },
    file: function file(url) {
      return (0, _util.getFile)(url).then(function (data) {
        try {
          return jsonParser(data);
        } catch (e) {
          throw e;
        }
      });
    }
  },
  baseURL: undefined,
  vars: {},

  bundle: false
};

function deref(input, _options) {
  _options.loaders = (0, _extends3.default)({}, defaultOptions.loaders, _options.loaders);
  var options = (0, _extends3.default)({}, defaultOptions, _options);

  if (options.localLoader && typeof options.localLoader !== 'function') throw new Error('options.localLoader must be a function');
  if (options.externalLoader && typeof options.externalLoader !== 'function') throw new Error('options.externalLoader must be a function');

  var cache = !options.cache ? {} : (0, _typeof3.default)(options.cache) === 'object' ? (0, _util.parseCache)(options.cache) : globalCache;

  return _promise2.default.resolve().then(function () {
    if (typeof input === 'string') {
      var _parseRef = (0, _parseRef4.default)(input),
          url = _parseRef.url,
          pointer = _parseRef.pointer;

      if (!options.baseURL) {
        options.baseURL = url;
      }
      return getJsonResource(url, pointer, undefined, options.externalOnly).then(function () {
        return input;
      });
    } else if ((typeof input === 'undefined' ? 'undefined' : (0, _typeof3.default)(input)) === 'object') {
      if (!options.baseURL) {
        options.baseURL = (0, _util.isNode)() ? 'file://' + process.cwd() : '';
      }

      var resourceId = input.$id || options.baseURL;
      cache[resourceId] = { raw: input };
      return resourceId;
    } else {
      throw new Error('Invalid param. Must be object, array or string');
    }
  }).then(function (resourceId) {
    return processResource(resourceId, undefined, undefined, options.externalOnly);
  }).then(function (result) {
    return options.bundle ? { cache: cache, result: result } : result;
  });

  function getJsonResource(url) {

    var protocol = url.match(/^(.*?):/);
    protocol = protocol && protocol[1] || 'file';

    var defaultLoader = defaultOptions.loaders[protocol];
    var loader = options.loaders[protocol];

    return _promise2.default.resolve(cache[url]).then(function (cached) {
      if (cached) {
        return cached;
      } else {
        return loader(url, defaultLoader).then(function (json) {
          return cache[url] = { raw: json };
        });
      }
    });
  }

  function processResource(resourceId, pointer) {
    var _refChain = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : [];

    var externalOnly = arguments[3];


    return _promise2.default.resolve(cache[resourceId] || getJsonResource(resourceId)).then(function () {
      return solvePointer(pointer, _refChain, resourceId);
    });

    function processNode(_ref) {
      var rawNode = _ref.rawNode,
          parsedNode = _ref.parsedNode,
          _ref$parentId = _ref.parentId,
          parentId = _ref$parentId === undefined ? resourceId : _ref$parentId,
          cursor = _ref.cursor,
          refChain = _ref.refChain,
          prop = _ref.prop;

      var currentId = parentId;

      var singleProp = !!prop;
      var props = singleProp ? [prop] : (0, _getOwnPropertyNames2.default)(rawNode);

      var propIndex = -1,
          nodeChanged = 0;

      return new _promise2.default(function (accept, reject) {
        nextProp();

        function nextProp() {
          propIndex++;

          if (propIndex >= props.length) {
            if (singleProp) {
              accept(parsedNode[prop]);
            } else {
              accept(nodeChanged ? parsedNode : rawNode);
            }
          } else {
            var _prop = props[propIndex];
            var sourceValue = rawNode[_prop];
            var propCursor = cursor + '/' + _prop;

            if (parsedNode.hasOwnProperty(_prop)) {
              nodeChanged |= parsedNode[_prop] !== sourceValue;
              nextProp();
            } else if ((typeof sourceValue === 'undefined' ? 'undefined' : (0, _typeof3.default)(sourceValue)) !== 'object' || sourceValue === null) {
                parsedNode[_prop] = sourceValue;
                nextProp();
              } else if (!!sourceValue.$ref) {
                  var $ref = sourceValue.$ref,
                      params = (0, _objectWithoutProperties3.default)(sourceValue, ['$ref']);

                  var branchRefChain = [].concat((0, _toConsumableArray3.default)(refChain), [propCursor]);

                  var _parseRef2 = (0, _parseRef4.default)($ref, currentId, branchRefChain, options.vars),
                      url = _parseRef2.url,
                      _pointer = _parseRef2.pointer,
                      isLocalRef = _parseRef2.isLocalRef,
                      isCircular = _parseRef2.isCircular;

                  if (isCircular && options.skipCircular || isLocalRef && externalOnly) {
                    parsedNode[_prop] = sourceValue;
                    nextProp();
                  } else {
                    _promise2.default.resolve(isLocalRef ? solvePointer(_pointer, branchRefChain, currentId) : externalOnly && _pointer ? processResource(url, _pointer, branchRefChain, false) : processResource(url, _pointer, branchRefChain)).then(function (newValue) {
                      nodeChanged = 1;
                      parsedNode[_prop] = newValue;
                      nextProp();
                    }).catch(function (err) {
                      var log = 'Error derefing ' + cursor + '/' + _prop;
                      if (options.failOnMissing) {
                        reject(log);
                      } else {
                        parsedNode[_prop] = sourceValue;
                        nextProp();
                      }
                    });
                  }
                } else {
                  var placeholder = parsedNode[_prop] = Array.isArray(sourceValue) ? [] : {};
                  processNode({
                    rawNode: sourceValue,
                    parsedNode: placeholder,
                    parentId: currentId,
                    cursor: propCursor,
                    refChain: refChain
                  }).then(function (newValue) {
                    nodeChanged |= newValue !== sourceValue;
                    nextProp();
                  }).catch(reject);
                }
          }
        }
      });
    }

    function solvePointer() {
      var pointer = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '#';
      var refChain = arguments[1];
      var parentId = arguments[2];

      pointer = pointer.replace('#', '');
      var cursor = resourceId + '#' + pointer;


      var tokens = (0, _util.slashPointer)(pointer).split('/').slice(1);

      var resource = cache[resourceId];
      var rawNode = resource.raw,
          parsedNode = resource.parsed;

      var prop = tokens[0];

      if (parsedNode && !prop) {
        return parsedNode;
      } else if (!parsedNode) {
        parsedNode = resource.parsed = {};
        if (!prop) {
          return processNode({ rawNode: rawNode, parsedNode: parsedNode, parentId: parentId, cursor: cursor, refChain: refChain });
        }
      }

      return iterate(rawNode, parsedNode, tokens);

      function iterate(rawNode, parsedNode, tokens) {
        while (parsedNode.hasOwnProperty(prop = tokens[0])) {
          rawNode = rawNode && rawNode[prop];
          parsedNode = parsedNode[prop];
          tokens.shift();
          cursor += '/' + prop;
        }

        if (!tokens.length) {
          return parsedNode;
        }

        tokens.shift();

        return processNode({ rawNode: rawNode, parsedNode: parsedNode, parentId: parentId, cursor: cursor, refChain: refChain, prop: prop }).then(function (value) {
          if (!value) {
            throw new Error(cursor + '/' + prop + ' of pointer ' + pointer + ' at ' + refChain[refChain.length - 1] + ' did not return object');
          } else if (!tokens.length) {
            return value;
          } else if ((typeof value === 'undefined' ? 'undefined' : (0, _typeof3.default)(value)) == 'object') {
            return iterate(rawNode[prop], value, tokens);
          }
        });
      }
    }
  }
}

deref.setJsonParser = function (parser) {
  return jsonParser = parser;
};

exports.default = deref;