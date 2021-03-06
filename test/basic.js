require('babel-core/register')
require('json5/lib/require')
var path = require('path')
var JSON5 = require('json5')

var tap = require('tap')
var test = tap.test

var fs = require('fs')

var deref = require('../src/index.js').default
var slashPointer = require('../src/util.js').slashPointer

deref.setJsonParser(JSON5.parse)
// var JsonRefs = require('json-refs')

function fileUrl(str) {
    var pathName = path.resolve(str).replace(/\\/g, '/')
    if (pathName[0] !== '/') pathName = '/' + pathName
    return encodeURI('file://' + pathName)
}

var list = [
  'b',
  'c',
  'local_forward-pointers',
  'local_deep-forward',
  'external_file',
  'almost-circular',
  'external_circular-file',
  // 'failed-reference',
]

const basePath = path.resolve(__dirname, './json5/temp/')
const baseURL = fileUrl(basePath)

list.forEach(name => {
  test(name, t => {
    const expected = require(`${basePath}/${name}.expected.json5`)
    deref(`${baseURL}/${name}.json5`)
    .then(output => {
      debugger
      t.deepEqual(output, expected)
      t.end()
    })
    .catch(t.threw)
  })
})
