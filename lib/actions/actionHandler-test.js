import test from 'ava'

import actionHandler from './actionHandler'

test('should exist', (t) => {
  t.is(typeof actionHandler, 'function')
})

test('should not throw', (t) => {
  const action = null
  const getSource = () => {}

  t.notThrows(() => {
    actionHandler(action, getSource)
  })
})
