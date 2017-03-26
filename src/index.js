// import whatwgUrl from 'whatwg-url'
// const URL = whatwgUrl.URL
// const parseURL = whatwgUrl.parseURL
// const serializeURL = whatwgUrl.serializeURL

import parseRef from './parseRef'
import {isNode, getFile, parseCache, slashPointer} from './util'

var jsonParser = JSON.parse

// TODO invalidate cache after TTL
var globalCache = {}

var defaultOptions = {
  cache: false,
  cacheTTL: 300000, // ms
  failOnMissing: true,
  externalOnly: false,
  skipCircular: false,
  loaders: {
    http: url => fetch(url).then(res => res.json()),
    file: url => getFile(url).then(data => {
      try {
        return jsonParser(data)
      } catch (e) {
        console.log(`Error parsing schema ${url}`)
        throw e
      }
    }),
  },
  baseURL: undefined,
  vars: {},
  // jsonParser: JSON.parse,
  bundle: false
}


/**
  * Entry point. Scopes resource cache
  *
  * @param {(Object|string)} json - Json to processed or a URI to a file.
  * @param {Object} options - The employees who are responsible for the project.
  * @param {boolean} [options.failOnMissing = true] - If true unresolved references will throw else just keep $ref unchanged.
  * @param {boolean} [options.externalOnly = true] - If true only external references will be parsed.
  */
function deref(input, _options){
  _options.loaders = {...defaultOptions.loaders, ..._options.loaders}
  const options = {...defaultOptions, ..._options}

  // validate options
  if(options.localLoader && typeof options.localLoader !== 'function') throw new Error('options.localLoader must be a function')
  if(options.externalLoader && typeof options.externalLoader !== 'function') throw new Error('options.externalLoader must be a function')

  // local instance of resource cache object
  const cache = !options.cache
    ? {}
    : typeof options.cache === 'object'
      ? parseCache(options.cache)
      : globalCache


  return Promise.resolve()
  .then(() => {
    // If 'input' is a string assume an URI.
    if(typeof input === 'string'){
      const {url, pointer} = parseRef(input)
      if(!options.baseURL) {
        options.baseURL = url
      }
      return getJsonResource(url, pointer, undefined, options.externalOnly).then(() => input)
    } else if(typeof input === 'object'){
      // if json is supplied assume it overwrites cache entry regardless of options.useCache.
      // $id must be present and absolute here
      if(!options.baseURL) {
        options.baseURL = isNode() ? 'file://' + process.cwd() : ''
      }

      const resourceId = input.$id || options.baseURL
      cache[resourceId] = {raw: input}
      return resourceId
    } else {
      throw new Error('Invalid param. Must be object, array or string')
    }
  })
  .then(resourceId => processResource(resourceId, undefined, undefined, options.externalOnly))
  .then(result => options.bundle ? {cache, result} : result)


  /**
  * Gets raw and parsed json from cache
  *
  * @param {object} url - uri-js object
  * @param {object} params - ...rest of the json-reference object
  * @returns  {Object}
  *           Returns an object containing raw, parsed and id
  */
  function getJsonResource(url) {

    var protocol = url.match(/^(.*?):/)
    protocol = (protocol && protocol[1]) || 'file'

    const defaultLoader = defaultOptions.loaders[protocol]
    const loader = options.loaders[protocol]

    return Promise.resolve(cache[url])
    .then(cached => {
      if(cached) {
        return cached
      } else {
        return loader(url, defaultLoader)
          // .then(data => typeof data === 'object' ? data : options.jsonParser(data))
          .then(json => cache[url] = {raw: json})
      }
    })
  }

  /**
    * This function mainly serves to scope a single json resource
    *
    * @param {Object} rawJson - The source json
    * @param {Object} parsedJson - Object that holds the parsed properties. Any properties in this object are assumed to be completly parsed
    * @param {integer} resourceId - Resource id
    * @param {string} pointer - Reference chain used to catch circular references
    * @param {string[]} refChain - Reference chain used to catch circular references
    */
  function processResource(resourceId, pointer, _refChain=[], externalOnly) {

    return Promise.resolve(cache[resourceId] || getJsonResource(resourceId))
      .then(() => solvePointer(pointer, _refChain, resourceId))

    /**
      * Main recursive traverse function
      *
      * @param {Object} rawNode - The source node to processed
      * @param {Object} parsedNode - Object to contain the processed properties
      * @param {string} cursor - Path of the current node. Adds to refChain...do I need this?
      * @param {string[]} [refChain=[]] - Parent pointers used to check circular references
      * @param {string} [prop] - If provided returns an object just that prop parsed
      */
    function processNode({rawNode, parsedNode, parentId = resourceId, cursor, refChain, prop}) {

      console.log(`processNode ${cursor}${prop ? '(' + prop + ')' : ''} with refChain ${refChain}`)
      // const currentId = rawNode.$id
      //   ? parseURL(rawNode.$id, parseURL(parentId).href).href
      //   : parentId
      const currentId = parentId

      const singleProp = !!prop
      const props = singleProp ? [prop] : Object.getOwnPropertyNames(rawNode)

      let propIndex = -1, nodeChanged = 0

      return new Promise((accept, reject) => {
        nextProp()

        function nextProp() {
          propIndex++

          if(propIndex >= props.length) {
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
            else if(!!sourceValue.$ref) {

              const {$ref, ...params} = sourceValue

              // const _url = new URL($ref, currentId)
              // const url = _url.origin + _url.pathname
              // const pointer = _url.hash
              // const isLocalRef = currentId === url
              const branchRefChain = [...refChain, propCursor]

              const {url, pointer, isLocalRef, isCircular} = parseRef($ref, currentId, branchRefChain, options.vars)

              if(isCircular && options.skipCircular || isLocalRef && externalOnly) {
              // if(isLocalRef && externalOnly) {
                parsedNode[prop] = sourceValue
                nextProp()
              } else {
                Promise.resolve(isLocalRef
                  ? solvePointer(pointer, branchRefChain, currentId)
                  : externalOnly && pointer
                   ? processResource(url, pointer, branchRefChain, false)
                   : processResource(url, pointer, branchRefChain)
                )
                .then(newValue => {
                  nodeChanged = 1
                  parsedNode[prop] = newValue
                  nextProp()
                })
                .catch(err => {
                  const log = `Error derefing ${cursor}/${prop}`
                  if (options.failOnMissing) {
                    reject(log)
                  } else {
                    console.log(log)
                    parsedNode[prop] = sourceValue
                    nextProp()
                  }
                })

              }

            } else {
              const placeholder = parsedNode[prop] = Array.isArray(sourceValue) ? [] : {}
              processNode({
                rawNode: sourceValue,
                parsedNode: placeholder,
                parentId: currentId,
                cursor: propCursor,
                refChain
              })
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
      * Resolves a "local" reference and pointer and returns the result.
      * State is updated in the recursion but result must be explicitly added.
      * It doesn't use placeholder object/array because result can be a scalar
      * Also rawNode and parsedNode aren't used since it always use the root node from state
      *
      * @param {Object} refObj - The reference object
      * @param {string[]} refChain - Parent pointers used to check circular references
      *
      */
    function solvePointer(pointer = '#', refChain, parentId) {
      pointer = pointer.replace('#', '')
      let cursor = resourceId + '#' + pointer
      console.log(`solvePointer ${cursor} with refChain ${refChain}`)

      let tokens = slashPointer(pointer).split('/').slice(1)

      const resource = cache[resourceId]
      let {raw: rawNode, parsed: parsedNode} = resource
      let prop = tokens[0]

      // undefined resource.parsed means it's initial call from processResource
      // and not a reference from processNode
      if(parsedNode && !prop) {
        // the following doesn't work if a previous reference to resource was made and
        // it included local pointer because parsedNode would be incomplete
        return parsedNode //its a ref to schema
        // return processNode({rawNode, parsedNode, parentId, cursor, refChain})
      } else if (!parsedNode) {
        //its initial call. Having parsed object marks it as initialized.
        // subsquent calls with empty pointer will just get reference to parsed
        parsedNode = resource.parsed = {}
        if (!prop) {
          return processNode({rawNode, parsedNode, parentId, cursor, refChain})
        }
      }

      // if(!parsedNode) parsedNode = resource.parsed = {}
      // if (!prop) processNode({rawNode, parsedNode, parentId, cursor, refChain})

      return iterate(rawNode, parsedNode, tokens)

      function iterate(rawNode, parsedNode, tokens) {
        // remove tokens to already parsed objects (also build cursor string)
        while (parsedNode.hasOwnProperty(prop = tokens[0])) {
          rawNode = rawNode && rawNode[prop] //rawNode may be undefined when iterating a deep ref
          parsedNode = parsedNode[prop]
          tokens.shift()
          cursor += '/' + prop
        }

        if(!tokens.length){
          return parsedNode
        }

        tokens.shift()

        return processNode({rawNode, parsedNode, parentId, cursor, refChain, prop})
          .then(value => {
            if(!value) {
              throw new Error(`${cursor}/${prop} of pointer ${pointer} at ${refChain[refChain.length - 1]} did not return object`)
            } else if (!tokens.length) {
              return value
            } else if(typeof value == 'object'){
              // return solvePointer('#/' + tokens.join('/'), refChain, parentId)
              return iterate(rawNode[prop], value, tokens)
            }
          })
      }

    }

  }

}

deref.setJsonParser = parser => jsonParser = parser

export default deref
