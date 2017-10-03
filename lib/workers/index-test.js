import test from 'ava'

import workers from '.'

test('should return object with workers', (t) => {
  const ret = workers()

  t.truthy(ret)
  t.is(typeof ret.sync, 'function')
  t.is(typeof ret.deleteExpired, 'function')
})
