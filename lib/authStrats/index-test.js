import test from 'ava'

import authStrats from '.'

test('should return object with auth strats', (t) => {
  const ret = authStrats()

  t.truthy(ret)
  t.is(typeof ret.options, 'function')
  t.is(typeof ret.token, 'function')
})
