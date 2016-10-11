var tap = require('tap')
var test = tap.test

var deref = require('../lib/index.js').default

var cases = {
  'circular-direct' : {}
}

test('circular references', t => {

  t.test('with failOnMissing', t => {
    Promise.all(
      Object.getOwnPropertyNames(cases).map(name => {
        return t.test(name, t => {
          t.plan(1)
          const input = require(`./json/temp/error_${name}.json`)

          deref(input, {basePath:'./test/json/temp', failOnMissing: true})
            .then(output => t.fail('should not resolve') )
            .catch(err => t.pass('rejected ok') )

        })
      })
    ).then(t.end)
  })


  t.test('without failOnMissing', t => {
    Promise.all(
      Object.getOwnPropertyNames(cases).map(name => {
        return t.test(name, t => {
          t.plan(1)
          const input = require(`./json/temp/error_${name}.json`)
          const expected = require(`./json/temp/error_${name}.expected.json`)

          deref(input, {basePath:'./test/json/temp', failOnMissing: false})
            .then(output => t.deepEqual(output, expected) )
            .catch(err => t.fail('should resolve') )

        })
      })
    ).then(t.end)
  })

  t.end()

})
