import test from 'ava'

import actions from './index.js'

test('should be an object with functions', (t) => {
  t.truthy(actions)
  t.true(Object.keys(actions).length > 0)
  Object.keys(actions).forEach((key) => {
    // eslint-disable-next-line security/detect-object-injection
    t.is(typeof actions[key], 'function')
  })
})
