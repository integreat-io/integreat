import test from 'ava'

import transforms from '.'

test('should return object with transforms', (t) => {
  const ret = transforms()

  t.truthy(ret)
  t.is(typeof ret.date, 'function')
  t.is(typeof ret.float, 'function')
  t.is(typeof ret.integer, 'function')
  t.truthy(ret.not)
  t.is(typeof ret.not.from, 'function')
})
