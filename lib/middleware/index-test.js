import test from 'ava'

import middleware from '.'

test('should be an object with middleware', (t) => {
  t.truthy(middleware)
  t.is(typeof middleware.completeIdent, 'function')
})
