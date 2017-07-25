import test from 'ava'

import auth from '.'

test('should return object with auth strats', (t) => {
  const ret = auth()

  t.truthy(ret)
  t.is(typeof ret.options, 'function')
  t.is(typeof ret.token, 'function')
})
