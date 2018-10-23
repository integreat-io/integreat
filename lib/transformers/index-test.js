import test from 'ava'

import transformers from '.'

test('should return object with transformers', (t) => {
  const ret = transformers()

  t.truthy(ret)
  t.truthy(ret.not)
  t.is(typeof ret.not.from, 'function')
  t.is(typeof ret.not.to, 'function')
  t.is(typeof ret.hash, 'function')
  t.truthy(ret.removeTypePrefixOnId)
  t.is(typeof ret.removeTypePrefixOnId.from, 'function')
  t.is(typeof ret.removeTypePrefixOnId.to, 'function')
})
