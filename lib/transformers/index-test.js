import test from 'ava'

import transformers from '.'

test('should return object with formatters', (t) => {
  const ret = transformers()

  t.truthy(ret)
  t.truthy(ret.removeTypePrefixOnId)
  t.is(typeof ret.removeTypePrefixOnId.from, 'function')
  t.is(typeof ret.removeTypePrefixOnId.to, 'function')
})
