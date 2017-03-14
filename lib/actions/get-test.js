import test from 'ava'

import get from './get'

test('should exist', (t) => {
  t.is(typeof get, 'function')
})
