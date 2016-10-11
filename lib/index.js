'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

exports.default = deref;

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var resourceCache = {};

var defaultOptions = {
  cache: true,
  cacheTTL: 300000,
  basePath: process.cwd(),
  externalOnly: false,
  failOnMissing: false,
  requireStartSlash: false
};

function isCircular(pointer, refChain) {
  return refChain.some(function (backRef) {
    return backRef.startsWith(pointer) && backRef !== pointer;
  });
}

function deref(sourceJson, options) {
  var pointer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

  debugger;

  options = Object.assign({}, defaultOptions, options);

  var jsonCache;

  return ((typeof sourceJson === 'undefined' ? 'undefined' : _typeof(sourceJson)) !== 'object' ? getJsonResource(sourceJson) : Promise.resolve({ raw: sourceJson, parsed: Array.isArray(sourceJson) ? [] : {} })).then(function (_ref) {
    var raw = _ref.raw;
    var parsed = _ref.parsed;

    if (options.cache) {
      jsonCache = Object.assign({ json: { raw: raw, parsed: parsed } }, resourceCache);
    } else {
      jsonCache = { json: { raw: raw, parsed: parsed } };
    }
    return processJson(raw, parsed, 0, pointer, []);
  });

  function getJsonResource(url) {
    return new Promise(function (accept, reject) {
      var keys = Object.getOwnPropertyNames(jsonCache);
      var index = keys.indexOf(url);
      var cached = jsonCache[url];

      if (cached) {
        accept(Object.assign({}, cached, { resourceId: index }));
      } else {
        _fs2.default.readFile(_path2.default.resolve(options.basePath, url), 'utf8', function (err, data) {
          if (err) throw err;
          cached = jsonCache[url] = { raw: JSON.parse(data), parsed: {} };

          accept(Object.assign({}, cached, { resourceId: keys.length }));
        });
      }
    });
  }

  function processJson(rawJson) {
    var parsedJson = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
    var resourceId = arguments[2];
    var pointer = arguments[3];
    var refChain = arguments[4];


    return solveReference(pointer, refChain);

    function processNode(rawNode, parsedNode, cursor, refChain, prop) {
      console.log('processNode ' + cursor + (prop ? '(' + prop + ')' : '') + ' with refChain ' + refChain);
      var singleProp = !!prop;
      var props = singleProp ? [prop] : Object.getOwnPropertyNames(rawNode);

      var propIndex = -1,
          nodeChanged = 0;

      return new Promise(function (accept, reject) {
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
              } else if ((typeof sourceValue === 'undefined' ? 'undefined' : _typeof(sourceValue)) !== 'object') {
                  parsedNode[prop] = sourceValue;
                  nextProp();
                } else if (sourceValue.$ref) {
                    Promise.resolve(sourceValue.$ref.split('#')).then(function (_ref2) {
                      var _ref3 = _slicedToArray(_ref2, 2);

                      var ref = _ref3[0];
                      var _ref3$ = _ref3[1];
                      var pointer = _ref3$ === undefined ? '' : _ref3$;

                      var branchRefChain = [].concat(_toConsumableArray(refChain), [propCursor]);
                      if (ref) {
                        return getJsonResource(ref).then(function (_ref4) {
                          var raw = _ref4.raw;
                          var parsed = _ref4.parsed;
                          var resourceId = _ref4.resourceId;

                          return processJson(raw, parsed, resourceId, pointer, branchRefChain);
                        });
                      } else {
                        if (options.externalOnly) {
                          return sourceValue;
                        } else {
                          return solveReference(pointer, branchRefChain);
                        }
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

    function solveReference(pointer, refChain) {
      if (!options.requireStartSlash && pointer && !pointer.startsWith('/')) {
        pointer = '/' + pointer;
      }

      console.log('solveReference ' + (resourceId + pointer) + ' with refChain ' + refChain);

      var cursor = resourceId + ':';
      var newRefChain = [].concat(_toConsumableArray(refChain), [resourceId + ':' + pointer]);

      if (isCircular(cursor + pointer, refChain)) {
        throw new Error('pointer ' + pointer + ' is circular');
      }

      if (!pointer) return processNode(rawJson, parsedJson, cursor, newRefChain);

      return Promise.resolve().then(function () {
        var rawNode = rawJson,
            parsedNode = parsedJson;
        var tokens = pointer.split('/');
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

        return Promise.resolve().then(function () {
          return processNode(rawNode, parsedNode, cursor, newRefChain, prop);
        }).then(function (parsedNode) {
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