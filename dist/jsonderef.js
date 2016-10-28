var jsonDeref =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

	var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var _fs = __webpack_require__(2);

	var _fs2 = _interopRequireDefault(_fs);

	var _path = __webpack_require__(2);

	var _path2 = _interopRequireDefault(_path);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

	function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

	// if (process.env.LIBRARYTARGET !== 'browser') {
	//   var fs = require('fs')
	//   var path = require('path')
	//   var fetch = require('isomorphic-fetch')
	// }


	// TODO invalidate cache after TTL
	var resourceCache = {};

	var defaultOptions = {
	  cache: true,
	  cacheTTL: 300000, // ms
	  // basePath: process.cwd(),
	  failOnMissing: false,
	  externalOnly: false,
	  requireStartSlash: false,
	  localLoader: undefined,
	  externalLoader: undefined,
	  jsonResources: {}
	};

	// if (process.env.LIBRARYTARGET !== 'browser') defaultOptions.basePath = process.cwd()
	if (_fs2.default) defaultOptions.basePath = process.cwd();

	//Utility methods
	function isCircular(pointer, refChain) {
	  return refChain.some(function (backRef) {
	    // return backRef.startsWith(pointer) && backRef !== pointer
	    return backRef.startsWith(pointer);
	  });
	}

	function slashPointer(pointer) {
	  if (pointer && !pointer.startsWith('/')) {
	    pointer = '/' + pointer;
	  }
	  return pointer;
	}

	/**
	  * Entry point. Scopes resource cache
	  *
	  * @param {(Object|string)} json - Json to processed or a URI to a file.
	  * @param {Object} options - The employees who are responsible for the project.
	  * @param {boolean} [options.failOnMissing = true] - If true unresolved references will throw else just keep $ref unchanged.
	  * @param {boolean} [options.externalOnly = true] - If true only external references will be parsed.
	  * @param {string} [pointer=''] - A json-pointer. If provided only parses refered part of the document
	  */
	function deref(json, options) {
	  var pointer = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : '';

	  // apply options defaults
	  options = Object.assign({}, defaultOptions, options);

	  // validate options
	  if (options.localLoader && typeof options.localLoader !== 'function') throw new Error('options.localLoader must be a function');
	  if (options.externalLoader && typeof options.externalLoader !== 'function') throw new Error('options.externalLoader must be a function');

	  // local instance of resource cache object
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
	        return Promise.resolve(options.jsonResources[key]);
	      } else {
	        throw new Error('can\'t find ' + key);
	      }
	    }
	  };

	  if (_fs2.default) {
	    defaultLoaders.file = function (url, baseUrl) {
	      return new Promise(function (accept, reject) {
	        _fs2.default.readFile(_path2.default.resolve(baseUrl, url), 'utf8', function (err, data) {
	          if (err) throw err;
	          accept(JSON.parse(data));
	        });
	      });
	    };
	  }

	  return Promise.resolve().then(function () {
	    // If 'json' is a string assume an URI.
	    if (typeof json === 'string') {
	      return getJsonResource(json);
	    } else if ((typeof json === 'undefined' ? 'undefined' : _typeof(json)) === 'object') {
	      Object.assign(jsonCache, { 'json:': {
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
	    Object.getOwnPropertyNames(options.jsonResources).forEach(function (key) {
	      jsonResourcesObject['json:' + key] = { raw: options.jsonResources[key], parsed: {}, baseUrl: options.basePath };
	    });

	    // add json, options.jsonResources eventually the global cache
	    Object.assign(jsonCache, jsonResourcesObject, options.cache ? resourceCache : {});

	    return processJson(raw, parsed, 0, pointer, {}, []);
	  });

	  /**
	   * Gets raw and parsed json from cache or external resourceCache
	   *
	   * @param {string} url - ur
	   * @returns  {Object}
	   *           Returns an object containing ray, parsed and id
	   */
	  function getJsonResource(url) {
	    var baseUrl = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : options.basePath;
	    var params = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

	    return new Promise(function (accept, reject) {
	      // Get apropriate loader based on url.
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

	      // const key = baseUrl + '/' + url

	      var keys = Object.getOwnPropertyNames(jsonCache);
	      var index = keys.indexOf(key);
	      var cached = jsonCache[key];

	      if (cached) {
	        // accept({...cached, resourceId: index})
	        accept(Object.assign({}, cached, { resourceId: index }));
	      } else {
	        return (options.externalLoader ? options.externalLoader(url, baseUrl, params, defaultLoader) : defaultLoader(url, baseUrl)).then(function (json) {
	          cached = jsonCache[key] = { raw: json, parsed: {}, baseUrl: newBaseUrl };
	          accept(_extends({}, cached, { resourceId: keys.length }));
	          // accept(Object.assign({}, cached, {resourceId: keys.length}))
	        });
	      }
	    });
	  }

	  /**
	    * This function mainly serves to scope a single json resource
	    *
	    * @param {Object} rawJson - The source json
	    * @param {Object} parsedJson - Object that holds the parsed properties. Any properties in this object are assumed to be completly parsed
	    * @param {integer} resourceId - Resource id. 'getJsonResource' returns resourceId matching resource cache index (using 'getOwnPropertyNames')
	    * @param {string} pointer - Reference chain used to catch circular references
	    * @param {string[]} refChain - Reference chain used to catch circular references
	    */
	  function processJson(rawJson) {
	    var parsedJson = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
	    var resourceId = arguments[2];
	    var pointer = arguments[3];
	    var params = arguments[4];
	    var refChain = arguments[5];

	    var key = Object.getOwnPropertyNames(jsonCache)[resourceId];
	    var baseUrl = jsonCache[key].baseUrl;

	    if (options.localLoader) {
	      return options.localLoader(pointer, params, solveReference.bind(this, refChain));
	    } else {
	      return solveReference(refChain, pointer);
	    }

	    /**
	      * Main recursive traverse function
	      *
	      * @param {Object} rawNode - The source node to processed
	      * @param {Object} parsedNode - Object to contain the processed properties
	      * @param {string} cursor - Path of the current node. Adds to refChain...do I need this?
	      * @param {string[]} [refChain=[]] - Parent pointers used to check circular references
	      * @param {string} [prop] - If provided returns an object just that prop parsed
	      */
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

	              // If prop is already defined in parsedNode assume complete and skip it
	              if (parsedNode.hasOwnProperty(prop)) {
	                nodeChanged |= parsedNode[prop] !== sourceValue;
	                nextProp();
	              }
	              // Is scalar, just set same and continue
	              else if ((typeof sourceValue === 'undefined' ? 'undefined' : _typeof(sourceValue)) !== 'object' || sourceValue === null) {
	                  parsedNode[prop] = sourceValue;
	                  nextProp();
	                }
	                // prop is a reference
	                else if (sourceValue.hasOwnProperty('$ref')) {
	                    (function () {
	                      var $ref = sourceValue.$ref;

	                      var params = _objectWithoutProperties(sourceValue, ['$ref']);

	                      var _$ref$split = $ref.split('#');

	                      var _$ref$split2 = _slicedToArray(_$ref$split, 2);

	                      var url = _$ref$split2[0];
	                      var _$ref$split2$ = _$ref$split2[1];
	                      var pointer = _$ref$split2$ === undefined ? '' : _$ref$split2$;
	                      // const [url, pointer = ''] = splitRef($ref)

	                      var branchRefChain = [].concat(_toConsumableArray(refChain), [propCursor]);

	                      Promise.resolve().then(function () {
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
	                  }
	                  // prop is object
	                  else {
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

	    /**
	      * Resolves a reference and pointer and returns the result.
	      * State is updates in the recursion but result must be explicitly added.
	      * It doesn't use placeholder object/array because result can be a scalar
	      * Also rawNode and parsedNode aren't used since it always use the root node from state
	      *
	      * @param {Object} refObj - The reference object
	      * @param {string[]} refChain - Parent pointers used to check circular references
	      *
	      */
	    function solveReference(refChain, pointer) {
	      // cursor is updated in pointer prop iteration and passed to processNode
	      var cursor = resourceId + '#';

	      console.log('solveReference ' + (cursor + pointer) + ' with refChain ' + refChain);

	      if (!pointer) return processNode(rawJson, parsedJson, cursor, refChain);

	      return Promise.resolve().then(function () {
	        var rawNode = rawJson,
	            parsedNode = parsedJson;
	        var tokens = slashPointer(pointer).split('/');
	        tokens.shift(); // must remove extra prop created by starting slash
	        var prop = tokens[0];

	        // remove tokens to already parsed objects (also build cursor string)
	        while (parsedNode.hasOwnProperty(prop)) {
	          rawNode = rawNode[prop];
	          parsedNode = parsedNode[prop];
	          cursor += '/' + tokens.shift();
	          prop = tokens[0];
	        }

	        // if all path is parsed return value
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
	        });
	      });
	    }
	  }
	}

	exports.default = deref;
	module.exports = exports['default'];
	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ },
/* 1 */
/***/ function(module, exports) {

	// shim for using process in browser
	var process = module.exports = {};

	// cached from whatever global is present so that test runners that stub it
	// don't break things.  But we need to wrap it in a try catch in case it is
	// wrapped in strict mode code which doesn't define any globals.  It's inside a
	// function because try/catches deoptimize in certain engines.

	var cachedSetTimeout;
	var cachedClearTimeout;

	function defaultSetTimout() {
	    throw new Error('setTimeout has not been defined');
	}
	function defaultClearTimeout () {
	    throw new Error('clearTimeout has not been defined');
	}
	(function () {
	    try {
	        if (typeof setTimeout === 'function') {
	            cachedSetTimeout = setTimeout;
	        } else {
	            cachedSetTimeout = defaultSetTimout;
	        }
	    } catch (e) {
	        cachedSetTimeout = defaultSetTimout;
	    }
	    try {
	        if (typeof clearTimeout === 'function') {
	            cachedClearTimeout = clearTimeout;
	        } else {
	            cachedClearTimeout = defaultClearTimeout;
	        }
	    } catch (e) {
	        cachedClearTimeout = defaultClearTimeout;
	    }
	} ())
	function runTimeout(fun) {
	    if (cachedSetTimeout === setTimeout) {
	        //normal enviroments in sane situations
	        return setTimeout(fun, 0);
	    }
	    // if setTimeout wasn't available but was latter defined
	    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
	        cachedSetTimeout = setTimeout;
	        return setTimeout(fun, 0);
	    }
	    try {
	        // when when somebody has screwed with setTimeout but no I.E. maddness
	        return cachedSetTimeout(fun, 0);
	    } catch(e){
	        try {
	            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
	            return cachedSetTimeout.call(null, fun, 0);
	        } catch(e){
	            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
	            return cachedSetTimeout.call(this, fun, 0);
	        }
	    }


	}
	function runClearTimeout(marker) {
	    if (cachedClearTimeout === clearTimeout) {
	        //normal enviroments in sane situations
	        return clearTimeout(marker);
	    }
	    // if clearTimeout wasn't available but was latter defined
	    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
	        cachedClearTimeout = clearTimeout;
	        return clearTimeout(marker);
	    }
	    try {
	        // when when somebody has screwed with setTimeout but no I.E. maddness
	        return cachedClearTimeout(marker);
	    } catch (e){
	        try {
	            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
	            return cachedClearTimeout.call(null, marker);
	        } catch (e){
	            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
	            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
	            return cachedClearTimeout.call(this, marker);
	        }
	    }



	}
	var queue = [];
	var draining = false;
	var currentQueue;
	var queueIndex = -1;

	function cleanUpNextTick() {
	    if (!draining || !currentQueue) {
	        return;
	    }
	    draining = false;
	    if (currentQueue.length) {
	        queue = currentQueue.concat(queue);
	    } else {
	        queueIndex = -1;
	    }
	    if (queue.length) {
	        drainQueue();
	    }
	}

	function drainQueue() {
	    if (draining) {
	        return;
	    }
	    var timeout = runTimeout(cleanUpNextTick);
	    draining = true;

	    var len = queue.length;
	    while(len) {
	        currentQueue = queue;
	        queue = [];
	        while (++queueIndex < len) {
	            if (currentQueue) {
	                currentQueue[queueIndex].run();
	            }
	        }
	        queueIndex = -1;
	        len = queue.length;
	    }
	    currentQueue = null;
	    draining = false;
	    runClearTimeout(timeout);
	}

	process.nextTick = function (fun) {
	    var args = new Array(arguments.length - 1);
	    if (arguments.length > 1) {
	        for (var i = 1; i < arguments.length; i++) {
	            args[i - 1] = arguments[i];
	        }
	    }
	    queue.push(new Item(fun, args));
	    if (queue.length === 1 && !draining) {
	        runTimeout(drainQueue);
	    }
	};

	// v8 likes predictible objects
	function Item(fun, array) {
	    this.fun = fun;
	    this.array = array;
	}
	Item.prototype.run = function () {
	    this.fun.apply(null, this.array);
	};
	process.title = 'browser';
	process.browser = true;
	process.env = {};
	process.argv = [];
	process.version = ''; // empty string to avoid regexp issues
	process.versions = {};

	function noop() {}

	process.on = noop;
	process.addListener = noop;
	process.once = noop;
	process.off = noop;
	process.removeListener = noop;
	process.removeAllListeners = noop;
	process.emit = noop;

	process.binding = function (name) {
	    throw new Error('process.binding is not supported');
	};

	process.cwd = function () { return '/' };
	process.chdir = function (dir) {
	    throw new Error('process.chdir is not supported');
	};
	process.umask = function() { return 0; };


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	exports.object = __webpack_require__(3);
	exports.array = __webpack_require__(4);
	exports.func = __webpack_require__(5);
	exports.functionThatReturns = __webpack_require__(6);
	exports.functionThatReturnsTrue = __webpack_require__(7);
	exports.functionThatReturnsFalse = __webpack_require__(8);
	exports.functionThatReturnsNull = __webpack_require__(9);
	exports.functionThatReturnsThis = __webpack_require__(10);
	exports.functionThatReturnsArgument = __webpack_require__(11);

	if ('production' != process.env.NODE_ENV) {
	  Object.freeze(exports);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	module.exports = {};

	if ('production' != process.env.NODE_ENV) {
	  Object.freeze(module.exports);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	module.exports = [];

	if ('production' != process.env.NODE_ENV) {
	  Object.freeze(module.exports);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	module.exports = function () {};

	if ('production' != process.env.NODE_ENV) {
	  Object.freeze(module.exports);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	module.exports = function (value) {
	  return function () {
	    return value;
	  };
	};

	if ('production' != process.env.NODE_ENV) {
	  Object.freeze(module.exports);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	module.exports = __webpack_require__(6)(true);

	if ('production' != process.env.NODE_ENV) {
	  Object.freeze(module.exports);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	module.exports = __webpack_require__(6)(false);

	if ('production' != process.env.NODE_ENV) {
	  Object.freeze(module.exports);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	module.exports = __webpack_require__(6)(null);

	if ('production' != process.env.NODE_ENV) {
	  Object.freeze(module.exports);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	module.exports = function () {
	  return this;
	};

	if ('production' != process.env.NODE_ENV) {
	  Object.freeze(module.exports);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(process) {'use strict';

	module.exports = function (argument) {
	  return argument;
	};

	if ('production' != process.env.NODE_ENV) {
	  Object.freeze(module.exports);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(1)))

/***/ }
/******/ ]);