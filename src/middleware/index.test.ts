import test from 'ava'

import middleware from './index.js'

test('should be an object with middleware', (t) => {
  t.truthy(middleware)
  t.is(typeof middleware.completeIdent, 'function')
})
