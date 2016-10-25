var tap = require('tap')
var test = tap.test

var fs = require('fs')

// var deref = require('../lib/index.js').default
var deref = require('../lib/jsonDeref_node.js').default

// var list = fs.readdirSync('./test/json')
//   .filter(f => f[0] !== '_' && f.indexOf('.expected.') === -1)
//   .map(f => f.slice(0, -5))

var list = [
  'b', 'c',
  'local_forward-pointers',
  'local_deep-forward',
  'external_file',
  'almost-circular',
  // 'external_circular-file',
  // 'failed-reference',
]

list.forEach(name => {
  test(name, t => {
    const input = require(`./json/temp/${name}.json`)
    const expected = require(`./json/temp/${name}.expected.json`)

    deref(input, {basePath: './test/json/temp', failOnMissing:true})
    .then(output => {
      t.deepEqual(output, expected)
      t.end()
    })
    .catch(t.threw)
  })
})
