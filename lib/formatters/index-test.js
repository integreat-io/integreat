import test from 'ava'

import formatters from '.'

test('should return object with formatters', (t) => {
  const ret = formatters()

  t.truthy(ret)
  t.is(typeof ret.date, 'function')
  t.is(typeof ret.float, 'function')
  t.is(typeof ret.integer, 'function')
  t.truthy(ret.not)
  t.is(typeof ret.not.from, 'function')
  t.is(typeof ret.not.to, 'function')
})
