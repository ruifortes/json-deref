// import fs from 'fs'
// import path from 'path'
if (process.env.BABEL_ENV === "node") {
  var fs = require('fs')
  var path = require('path')
  var fetch = require('isomorphic-fetch')
}

// TODO invalidate cache after TTL
var resourceCache = {}

const defaultOptions = {
  cache: true,
  cacheTTL: 300000, // ms
  basePath: process.cwd(),
  failOnMissing: false,
  externalOnly: false,
  requireStartSlash: false,
  localLoader: undefined,
  externalLoader: undefined,
  jsonResources: {}
}

//Utility methods
function isCircular(pointer, refChain){
  return refChain.some(backRef => {
    return backRef.startsWith(pointer) && backRef !== pointer
  })
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
function deref(json, options, pointer = ''){
  // apply options defaults
  options =  Object.assign({}, defaultOptions, options)

  // validate options
  if(options.localLoader && typeof options.localLoader !== 'function') throw new Error('options.localLoader must be a function')
  if(options.externalLoader && typeof options.externalLoader !== 'function') throw new Error('options.externalLoader must be a function')

  // local instance of resource cache object
  var jsonCache

  var defaultLoaders = {
    web: url => {
      return fetch(url).then(res => {
        return res.text()
      })
      .then(data => {
        return JSON.parse(data)
      })
    },
    json: url => {
      return jsonCache[url]
    }
  }

  if (process.env.BABEL_ENV === "node") {
    defaultLoaders.file = function (url) {
      return new Promise((accept, reject) => {
        fs.readFile(path.resolve(options.basePath, url), 'utf8', (err,data) => {
          if (err) throw err
          accept(JSON.parse(data))
        })
      })
    }
  }


  // If 'json' is a string assume an URI.
  return ( typeof json !== 'object'
    ? getJsonResource(json, {})
    : Promise.resolve({raw: json, parsed: Array.isArray(json) ? [] : {}})
  )
  .then(({raw, parsed}) => {

    // add json, options.jsonResources eventually the global cache
    jsonCache = Object.assign(
      {json: {raw, parsed}},
      options.jsonResources,
      (options.cache ? resourceCache : {})
    )

    // // If options.cache = true shallow clone add global resourceCache
    // if(options.cache){
    //   jsonCache = Object.assign(jsonCache, resourceCache)
    // }


    // // If options.cache = true shallow clone resourceCache else create one time empty cache
    // if(options.cache){
    //   jsonCache = Object.assign({json: {raw, parsed}}, resourceCache)
    // } else {
    //   jsonCache = {json: {raw, parsed}}
    // }

    return processJson(raw, parsed, 0, pointer, {}, [])
  })


  /**
   * Gets raw and parsed json from cache or external resourceCache
   *
   * @param {string} url - ur
   * @returns  {Object}
   *           Returns an object containing ray, parsed and id
   */
  function getJsonResource(url, params) {
    return new Promise((accept,reject) => {
      const keys = Object.getOwnPropertyNames(jsonCache)
      const index = keys.indexOf(url)
      let cached = jsonCache[url]

      if (cached) {
        accept({...cached, resourceId: index})
        // accept(Object.assign({}, cached, {resourceId: index}))
      } else {
        // TODO get apropriate loader based on url.
        let defaultLoader

        if(url.startsWith('http://') || url.startsWith('https://')) {
          defaultLoader = defaultLoaders.web
        }
        else if(url.startsWith('json:')) {
          defaultLoader = defaultLoaders.file
        }
        else if(process.env.BABEL_ENV === "node") {
          defaultLoader = defaultLoaders.file
        }

        return (options.externalLoader
          ? options.externalLoader(url, params, defaultLoader)
          : defaultLoader(url)
        )
        .then(json => {
          cached = jsonCache[url] = {raw: json , parsed: {}}
          accept({...cached, resourceId: keys.length})
          // accept(Object.assign({}, cached, {resourceId: keys.length}))
        })

      }
    })
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
  function processJson(rawJson, parsedJson = {}, resourceId, pointer, params, refChain) {

    if(options.localLoader){
      return options.localLoader(pointer, params, solveReference.bind(this, refChain))
    } else {
      return solveReference(refChain, pointer)
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
      console.log(`processNode ${cursor}${prop ? '(' + prop + ')' : ''} with refChain ${refChain}`)
      const singleProp = !!prop
      const props = singleProp ? [prop] : Object.getOwnPropertyNames(rawNode)

      let propIndex = -1, nodeChanged = 0

      return new Promise((accept, reject) => {
        nextProp()

        function nextProp() {
          propIndex++

          if(propIndex === props.length) {
            if (singleProp) {
              accept(parsedNode[prop])
            } else {
              accept(nodeChanged ? parsedNode : rawNode)
            }

          } else {
            const prop = props[propIndex]
            const sourceValue = rawNode[prop]
            const propCursor = `${cursor}/${prop}`

            // If prop is already defined in parsedNode assume complete and skip it
            if(parsedNode.hasOwnProperty(prop)){
              nodeChanged |= parsedNode[prop] !== sourceValue
              nextProp()
            }
            // Is scalar, just set same and continue
            else if (typeof sourceValue !== 'object' ) {
              parsedNode[prop] = sourceValue
              nextProp()
            }
            // prop is a reference
            else if(sourceValue.hasOwnProperty('$ref')) {
              const {$ref, ...params} = sourceValue
              const [url, pointer = ''] = $ref.split('#')
              const branchRefChain = [...refChain, propCursor]

              Promise.resolve()
              .then(() => {
                if(url) {
                  return getJsonResource(url, params)
                } else {
                  return {raw: rawJson, parsed: parsedJson, resourceId}
                }
              })
              .then(({raw, parsed, resourceId}) => {
                if(!url && options.externalOnly){
                  return sourceValue
                } else {
                  // return processJson(raw, parsed, resourceId, pointer, branchRefChain)
                  return processJson(raw, parsed, resourceId, pointer, params, branchRefChain)
                }
              })
              .then(newValue => {
                nodeChanged = 1
                parsedNode[prop] = newValue
                nextProp()
              })
              .catch(err => {
                if (options.failOnMissing) {
                  reject(err)
                } else {
                  parsedNode[prop] = sourceValue
                  nextProp()
                }
              })
            }
            // prop is object
            else {
              const placeholder = parsedNode[prop] = Array.isArray(sourceValue) ? [] : {}
              processNode(sourceValue, placeholder, propCursor, refChain)
              .then(newValue => {
                nodeChanged |= newValue !== sourceValue
                nextProp()
              })
              .catch(reject)
            }

          }

        }

      })
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

      // normalize pointer starting slash
      if(!options.requireStartSlash && pointer && !pointer.startsWith('/')) {
        pointer = '/' + pointer
      }

      console.log(`solveReference ${resourceId + pointer} with refChain ${refChain}`)

      // cursor is updated in pointer prop iteration and passed to processNode
      let cursor = resourceId + ':'
      const newRefChain = [...refChain, `${resourceId}:${pointer}`]

      if(isCircular(cursor + pointer, refChain)) {
        throw new Error(`pointer ${pointer} is circular`)
      }

      if(!pointer) return processNode(rawJson, parsedJson, cursor, newRefChain)

      return Promise.resolve()
      .then(() => {
        let rawNode = rawJson, parsedNode = parsedJson
        let tokens = pointer.split('/')
        tokens.shift() // must remove extra prop created by starting slash
        let prop = tokens[0]

        // remove tokens to already parsed objects (also build cursor string)
        while (parsedNode.hasOwnProperty(prop)) {
          rawNode = rawNode[prop]
          parsedNode = parsedNode[prop]
          cursor += '/' + tokens.shift()
          prop = tokens[0]
        }

        // if all path is parsed return value
        if(!tokens.length){
          return parsedNode
        }

        prop = tokens.shift()

        return Promise.resolve()
        .then(() => {
          return processNode(rawNode, parsedNode, cursor, newRefChain, prop)
        })
        .then(parsedNode => {
          //
          while(parsedNode.hasOwnProperty(tokens[0]) && (parsedNode = parsedNode[tokens[0]])){
            tokens.shift()
          }
          if(!tokens.length){
            return parsedNode
          } else {
            throw new Error(`invalid pointer ${pointer} at ${refChain[refChain.length - 1]}`)
          }
        })

      })

    }

  }

}


// export default deref
if (process.env.BABEL_ENV === "node") {
  exports.default = deref
} else {
  window.jsonDeref = deref
}
