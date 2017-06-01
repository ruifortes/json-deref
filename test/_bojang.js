require('babel-core/register')
require('json5/lib/require')
var path = require('path')
var JSON5 = require('json5')

var tap = require('tap')
var test = tap.test

var fs = require('fs')

// var deref = require('../lib/index.js')
var deref = require('../src/index.js').default
var slashPointer = require('../src/util.js').slashPointer

deref.setJsonParser(JSON5.parse)
// var JsonRefs = require('json-refs')

function fileUrl(str) {
    var pathName = path.resolve(str).replace(/\\/g, '/');
    if (pathName[0] !== '/') pathName = '/' + pathName
    return encodeURI('file://' + pathName)
}

const basePath = path.resolve(__dirname, './json5/bojand/schemas')
const baseURL = fileUrl(basePath)

var list = fs.readdirSync(basePath)
  .filter(f => f[0] !== '_' && f.indexOf('.expected.') !== -1)
  .map(f => f.replace('.expected.json5', ''))

// var list = [
//   'b',
//   'c',
//   'local_forward-pointers',
//   'local_deep-forward',
//   'external_file',
//   'almost-circular',
//   'external_circular-file',
//   // 'failed-reference',
// ]


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
