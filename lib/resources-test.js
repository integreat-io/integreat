import test from 'ava'

import resources from './resources'

test('should exist', (t) => {
  t.is(typeof resources, 'function')
})

test('should return resource object', (t) => {
  const ret = resources()

  t.truthy(ret)
  t.truthy(ret.adapters)
  t.truthy(ret.authstrats)
  t.truthy(ret.formatters)
  t.truthy(ret.workers)
  t.not(typeof ret.adapters, 'function')
  t.not(typeof ret.authstrats, 'function')
  t.not(typeof ret.formatters, 'function')
  t.not(typeof ret.workers, 'function')
})
