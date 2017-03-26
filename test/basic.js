require('babel-core/register')
require('json5/lib/require')
var path = require('path')
var JSON5 = require('json5')

var tap = require('tap')
var test = tap.test

var fs = require('fs')

// var deref = require('../lib/index.js')
var deref = require('../src/index.js').default
deref.setJsonParser(JSON5.parse)
// var JsonRefs = require('json-refs')

// var list = fs.readdirSync('./test/json')
//   .filter(f => f[0] !== '_' && f.indexOf('.expected.') === -1)
//   .map(f => f.slice(0, -5))

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

const baseURI = 'file:///' + path.resolve(__dirname, './json5/temp/')
// const baseURI = 'file:///D:/WEBDEV/MODULES/json-deref/test/json5/temp/'
// const baseURI = 'file:///media/rsf/Acer/Users/User/Documents/WEBDEV/MODULES/json-deref/test/json5/temp/'
// const baseURI = 'file:/D:/WEBDEV/MODULES/json-deref/test/json/temp/external_circular-file.json'

list.forEach(name => {
  test(name, t => {
    const input = require(`./json5/temp/${name}.json5`)
    const expected = require(`./json5/temp/${name}.expected.json5`)
    deref(input, {
      failOnMissing:true,
      baseURI: baseURI + '/' + name,
    })
    .then(output => {
      debugger
      t.deepEqual(output, expected)
      t.end()
    })
    .catch(t.threw)
    // .catch(err => {
    //   console.log(err);
    //   return t.threw(err)
    // })
  })
})
