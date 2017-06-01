import fs from 'fs'

export const isBrowser = new Function("try {return this===window;}catch(e){ return false;}");
export const isNode = new Function("try {return this===global;}catch(e){return false;}");

export function getFile(url, extList = ['json', 'json5']) {
  var filePath = url.replace(/^file:\/\//,'').replace(/\.[^/.]+$/, '')
  filePath = filePath.split("?")[0].split("#")[0]

  // var filePath = url.pathname.replace(/\.[^/.]+$/, '')

  if(filePath.indexOf(':') != -1) {
    filePath = filePath.slice(1)
  }

  return new Promise((resolve, reject) => {
    var i = 0
    function tryPath(path) {
      fs.stat(path, (err, stats) => {
        if (!err) {
          fs.readFile(path, 'utf8', (err, data) => {
            if(err) {
              reject(`Error acessing ${filePath}`)
            } else {
              resolve(data)
            }
          })
        } else if (i < extList.length) {
          tryPath(`${filePath}.${extList[i++]}`)
        } else {
          console.log(`File ${url} not found`)
          reject(`File ${url} not found`)
        }
      })
    }
    tryPath(filePath)
  })
}

export function parseCache(obj) {
  const result = {}
  Object.getOwnPropertyNames(obj).map(key =>{
    result[key] = {
      raw: obj[key],
      parsed: {}
    }
  })
  return result
}

export function slashPointer(pointer) {
  if (pointer && !pointer.startsWith('/')) {
    pointer = '/' + pointer
  }
  return pointer
}
