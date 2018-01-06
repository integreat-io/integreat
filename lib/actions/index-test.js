import test from 'ava'

import actions from '.'

test('should be an object with functions', (t) => {
  t.truthy(actions)
  t.true(Object.keys(actions).length > 0)
  Object.keys(actions).forEach((key) => {
    t.is(typeof actions[key], 'function')
  })
})
