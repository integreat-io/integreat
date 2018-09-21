import test from 'ava'

import mutators from '.'

test('should return object with mutators', (t) => {
  const ret = mutators()

  t.truthy(ret)
  t.truthy(ret.removeTypePrefixOnId)
  t.is(typeof ret.removeTypePrefixOnId.from, 'function')
  t.is(typeof ret.removeTypePrefixOnId.to, 'function')
})
