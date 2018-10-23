import test from 'ava'

import resources from './resources'

test('should return resource object', (t) => {
  const ret = resources()

  t.truthy(ret)
  t.truthy(ret.adapters)
  t.truthy(ret.authenticators)
  t.truthy(ret.transformers)
  t.not(typeof ret.adapters, 'function')
  t.not(typeof ret.authenticators, 'function')
  t.not(typeof ret.transformers, 'function')
})
