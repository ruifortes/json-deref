'use strict';

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

var fs = require('fs');
var path = require('path');
var fetch = require('isomorphic-fetch');

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

defaultOptions.basePath = process.cwd();

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

  options = Object.assign({}, defaultOptions, options);

  if (options.localLoader && typeof options.localLoader !== 'function') throw new Error('options.localLoader must be a function');
  if (options.externalLoader && typeof options.externalLoader !== 'function') throw new Error('options.externalLoader must be a function');

  var jsonCache = {};

  var defaultLoaders = {
    web: function web(url) {
      return fetch(url).then(function (res) {
        return res.text();
      }).then(function (data) {
        return JSON.parse(data);
      });
    },
    json: function json(key) {
      key = key.substring(5);
      if (options.jsonResources.hasOwnProperty(key)) {
        return Promise.resolve(options.jsonResources[key]);
      } else {
        throw new Error('can\'t find ' + key);
      }
    }
  };

  defaultLoaders.file = function (url) {
    return new Promise(function (accept, reject) {
      fs.readFile(path.resolve(options.basePath, url), 'utf8', function (err, data) {
        if (err) throw err;
        accept(JSON.parse(data));
      });
    });
  };

  return Promise.resolve().then(function () {
    if (typeof json === 'string') {
      return getJsonResource(json, {});
    } else if ((typeof json === 'undefined' ? 'undefined' : _typeof(json)) === 'object') {
      Object.assign(jsonCache, { json: { raw: json, parsed: Array.isArray(json) ? [] : {} } });
      return jsonCache.json;
    } else {
      throw new Error('Invalid param. Must be object, array or string');
    }
  }).then(function (_ref) {
    var raw = _ref.raw;
    var parsed = _ref.parsed;

    var jsonResourcesObject = {};
    Object.getOwnPropertyNames(options.jsonResources).forEach(function (key) {
      jsonResourcesObject['json:' + key] = { raw: options.jsonResources[key], parsed: {} };
    });

    Object.assign(jsonCache, jsonResourcesObject, options.cache ? resourceCache : {});

    return processJson(raw, parsed, 0, pointer, {}, []);
  });

  function getJsonResource(url, params) {
    return new Promise(function (accept, reject) {

      var keys = Object.getOwnPropertyNames(jsonCache);
      var index = keys.indexOf(url);
      var cached = jsonCache[url];

      if (cached) {
        accept(_extends({}, cached, { resourceId: index }));
      } else {
        var defaultLoader = void 0;

        if (url.startsWith('http://') || url.startsWith('https://')) {
          defaultLoader = defaultLoaders.web;
        } else if (url.startsWith('json:')) {
          defaultLoader = defaultLoaders.json;
        } else {
          defaultLoader = defaultLoaders.file;
        }

        return (options.externalLoader ? options.externalLoader(url, params, defaultLoader) : defaultLoader(url)).then(function (json) {
          cached = jsonCache[url] = { raw: json, parsed: {} };
          accept(_extends({}, cached, { resourceId: keys.length }));
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


    if (options.localLoader) {
      return options.localLoader(pointer, params, solveReference.bind(this, refChain));
    } else {
      return solveReference(refChain, pointer);
    }

    function processNode(rawNode, parsedNode, cursor, refChain, prop) {
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
                } else if (sourceValue.hasOwnProperty('$ref')) {
                    (function () {
                      var $ref = sourceValue.$ref;

                      var params = _objectWithoutProperties(sourceValue, ['$ref']);

                      var _$ref$split = $ref.split('#');

                      var _$ref$split2 = _slicedToArray(_$ref$split, 2);

                      var url = _$ref$split2[0];
                      var _$ref$split2$ = _$ref$split2[1];
                      var pointer = _$ref$split2$ === undefined ? '' : _$ref$split2$;

                      var branchRefChain = [].concat(_toConsumableArray(refChain), [propCursor]);

                      Promise.resolve().then(function () {
                        if (url) {
                          return getJsonResource(url, params);
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

      return Promise.resolve().then(function () {
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

        return Promise.resolve().then(function () {
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
        }).catch(function (err) {
          return Promise.reject(err);
        });
      });
    }
  }
}

exports.default = deref;
