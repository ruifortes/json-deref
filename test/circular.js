require('babel-core/register')
require('json5/lib/require')
var path = require('path')
var JSON5 = require('json5')

var tap = require('tap')
var test = tap.test

var deref = require('../src/index.js').default
var slashPointer = require('../src/util.js').slashPointer

deref.setJsonParser(JSON5.parse)

function fileUrl(str) {
    var pathName = path.resolve(str).replace(/\\/g, '/');
    if (pathName[0] !== '/') pathName = '/' + pathName
    return encodeURI('file://' + pathName)
}

var list = {
  indirect: (t, output) => {
    // t.deepEqual(output, expected)
    t.end()
  },
  // toParent: (t, output) => {
  //   t.end()
  // },
  // toSelf: (t, output) => {
  //   t.end()
  // },
}

const basePath = path.resolve(__dirname, './json5/circular/')
const baseURL = fileUrl(basePath)

const name = 'indirect'
const input = require(`./json5/circular/${name}.json5`)

deref(input, {
  failOnMissing:true,
  skipCircular: true
})
.then(output => {
  debugger
  console.log(output);
})

// test('circular references', t => {
//   Promise.all(
//     Object.getOwnPropertyNames(list).map(name => {
//       debugger
//       return test(name, t => {
//         t.plan(1)
//         const input = require(`./json5/circular/${name}.json5`)
//         // const expected = require(`./json5/temp/${name}.expected.json5`)
//         debugger
//         deref(input, {
//           failOnMissing:true,
//           baseURI: baseURI + name,
//           jsonParser: JSON5.parse,
//         })
//         .then(output => {
//           debugger
//           list[name](t, output)
//           // t.deepEqual(output, expected)
//           // t.end()
//         })
//         .catch(t.threw)
//         // .catch(err => {
//         //   console.log(err);
//         //   return t.threw(err)
//         // })
//       })
//     })
//   ).then(t.end)
//
//
//   // t.test('with failOnMissing', t => {
//   //   Promise.all(
//   //     Object.getOwnPropertyNames(cases).map(name => {
//   //       return t.test(name, t => {
//   //         t.plan(1)
//   //         const input = require(`./json5/temp/error_${name}.json5`)
//   //         deref(input, {
//   //           failOnMissing:true,
//   //           baseURI: baseURI + name,
//   //           jsonParser: JSON5.parse,
//   //         })
//   //         .then(output => t.fail('should not resolve') )
//   //         .catch(err => t.pass('rejected ok') )
//   //
//   //       })
//   //     })
//   //   ).then(t.end)
//   // })
//
//
//   // t.test('without failOnMissing', t => {
//   //   Promise.all(
//   //     Object.getOwnPropertyNames(cases).map(name => {
//   //       return t.test(name, t => {
//   //         t.plan(1)
//   //         const input = require(`./json5/temp/error_${name}.json5`)
//   //         const expected = require(`./json5/temp/error_${name}.expected.json5`)
//   //         debugger
//   //         deref(input, {
//   //           failOnMissing:false,
//   //           baseURI: baseURI + name,
//   //           jsonParser: JSON5.parse,
//   //         })
//   //         .then(output => {
//   //           debugger
//   //           t.deepEqual(output, expected)
//   //         })
//   //         .catch(err => t.fail('should resolve') )
//   //
//   //       })
//   //     })
//   //   ).then(t.end)
//   // })
//
//   t.end()
//
// })
