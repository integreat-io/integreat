import test from 'ava'

import formatters from '.'

test('should return object with formatters', (t) => {
  const ret = formatters()

  t.truthy(ret)
  t.truthy(ret.not)
  t.is(typeof ret.not.from, 'function')
  t.is(typeof ret.not.to, 'function')
  t.is(typeof ret.hash, 'function')
})
