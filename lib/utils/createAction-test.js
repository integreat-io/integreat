import test from 'ava'

import createAction from './createAction'

test('should exist', (t) => {
  t.is(typeof createAction, 'function')
})

test('should return an action', (t) => {
  const type = 'GET_ONE'
  const payload = {id: 'ent1', type: 'entry'}
  const expected = {
    type: 'GET_ONE',
    payload: {id: 'ent1', type: 'entry'}
  }

  const ret = createAction(type, payload)

  t.deepEqual(ret, expected)
})

test('should add action properties', (t) => {
  const type = 'GET_ONE'
  const payload = {id: 'ent1', type: 'entry'}
  const props = {queue: true}
  const expected = {
    type: 'GET_ONE',
    payload: {id: 'ent1', type: 'entry'},
    queue: true
  }

  const ret = createAction(type, payload, props)

  t.deepEqual(ret, expected)
})

test('should return null if no type', (t) => {
  const payload = {id: 'ent1', type: 'entry'}

  const ret = createAction(null, payload)

  t.is(ret, null)
})
