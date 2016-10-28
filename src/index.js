import fs from 'fs'
import path from 'path'

// if (process.env.LIBRARYTARGET !== 'browser') {
//   var fs = require('fs')
//   var path = require('path')
//   var fetch = require('isomorphic-fetch')
// }


// TODO invalidate cache after TTL
var resourceCache = {}

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
}

// if (process.env.LIBRARYTARGET !== 'browser') defaultOptions.basePath = process.cwd()
if(fs) defaultOptions.basePath = process.cwd()

//Utility methods
function isCircular(pointer, refChain){
  return refChain.some(backRef => {
    // return backRef.startsWith(pointer) && backRef !== pointer
    return backRef.startsWith(pointer)
  })
}

function slashPointer(pointer) {
  if (pointer && !pointer.startsWith('/')) {
    pointer = '/' + pointer
  }
  return pointer
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
  const jsonCache = {}

  var defaultLoaders = {
    web: (url, baseUrl) => {
      return fetch(url).then(res => {
        return res.text()
      })
      .then(data => {
        return JSON.parse(data)
      })
    },
    json: key => {
      key = key.substring(5)
      if(options.jsonResources.hasOwnProperty(key)){
        return Promise.resolve(options.jsonResources[key])
      } else {
        throw new Error(`can't find ${key}`)
      }
    }
  }

  if (fs) {
    defaultLoaders.file = (url, baseUrl) => {
      return new Promise((accept, reject) => {
        fs.readFile(path.resolve(baseUrl, url), 'utf8', (err, data) => {
          if (err) throw err
          accept(JSON.parse(data))
        })
      })
    }
  }

  return Promise.resolve()
  .then(() => {
    // If 'json' is a string assume an URI.
    if(typeof json === 'string'){
      return getJsonResource(json)
    } else if(typeof json === 'object'){
      Object.assign(jsonCache, {'json:': {
          raw: json,
          parsed: Array.isArray(json) ? [] : {},
          baseUrl: options.basePath
        }
      })
      return jsonCache['json:']
    } else {
      throw new Error('Invalid param. Must be object, array or string')
    }
  })
  .then(({raw, parsed}) => {
    let jsonResourcesObject = {}
    Object.getOwnPropertyNames(options.jsonResources).forEach(key => {
      jsonResourcesObject['json:' + key] = {raw: options.jsonResources[key], parsed:{}, baseUrl: options.basePath}
    })

    // add json, options.jsonResources eventually the global cache
    Object.assign(
      jsonCache,
      jsonResourcesObject,
      (options.cache ? resourceCache : {})
    )

    return processJson(raw, parsed, 0, pointer, {}, [])
  })


  /**
   * Gets raw and parsed json from cache or external resourceCache
   *
   * @param {string} url - ur
   * @returns  {Object}
   *           Returns an object containing ray, parsed and id
   */
  function getJsonResource(url, baseUrl = options.basePath, params = {}) {
    return new Promise((accept,reject) => {
      // Get apropriate loader based on url.
      let key = url, newBaseUrl = url, defaultLoader
      if(url.startsWith('http://') || url.startsWith('https://')) {
        defaultLoader = defaultLoaders.web
      } else if(url.startsWith('json:')) {
        defaultLoader = defaultLoaders.json
      } else if(fs) {
        key = path.resolve(baseUrl, url)
        newBaseUrl = path.dirname(key)
        defaultLoader = defaultLoaders.file
      }

      // const key = baseUrl + '/' + url

      const keys = Object.getOwnPropertyNames(jsonCache)
      const index = keys.indexOf(key)
      let cached = jsonCache[key]

      if (cached) {
        // accept({...cached, resourceId: index})
        accept(Object.assign({}, cached, {resourceId: index}))
      } else {
        return (options.externalLoader
          ? options.externalLoader(url, baseUrl, params, defaultLoader)
          : defaultLoader(url, baseUrl)
        )
        .then(json => {
          cached = jsonCache[key] = {raw: json , parsed: {}, baseUrl: newBaseUrl}
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
    const key = Object.getOwnPropertyNames(jsonCache)[resourceId]
    const baseUrl = jsonCache[key].baseUrl

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
            else if (typeof sourceValue !== 'object' || sourceValue === null) {
              parsedNode[prop] = sourceValue
              nextProp()
            }
            // prop is a reference
            else if(sourceValue.hasOwnProperty('$ref')) {
              const {$ref, ...params} = sourceValue
              let [url, pointer = ''] = $ref.split('#')
              // const [url, pointer = ''] = splitRef($ref)
              const branchRefChain = [...refChain, propCursor]

              Promise.resolve()
              .then(() => {
                if(url) {
                  return getJsonResource(url, baseUrl, params)
                } else {
                  return {raw: rawJson, parsed: parsedJson, resourceId}
                }
              })
              .then(({raw, parsed, resourceId}) => {
                if(!url && options.externalOnly){
                  return sourceValue
                } else {
                  let ref = `${resourceId}#${slashPointer(pointer)}`
                  if(isCircular(ref, [propCursor]) || singleProp && isCircular(ref, refChain)) {
                    throw new Error(`pointer ${ref} is circular`)
                  }
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
      // cursor is updated in pointer prop iteration and passed to processNode
      let cursor = resourceId + '#'

      console.log(`solveReference ${cursor + pointer} with refChain ${refChain}`)

      if(!pointer) return processNode(rawJson, parsedJson, cursor, refChain)

      return Promise.resolve()
      .then(() => {
        let rawNode = rawJson, parsedNode = parsedJson
        let tokens = slashPointer(pointer).split('/')
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
          return processNode(rawNode, parsedNode, cursor, refChain, prop)
        })
        .then(parsedNode => {
          if(!parsedNode) throw new Error(`${cursor}/${prop} of pointer ${pointer} at ${refChain[refChain.length - 1]} did not return object`)

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

export default deref
