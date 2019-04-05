import test from 'ava'

import createAction from './createAction'

test('should exist', (t) => {
  t.is(typeof createAction, 'function')
})

test('should return an action', (t) => {
  const type = 'GET'
  const payload = { id: 'ent1', type: 'entry' }
  const expected = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' }
  }

  const ret = createAction(type, payload)

  t.deepEqual(ret, expected)
})

test('should always set payload object', (t) => {
  const type = 'GET'
  const expected = {
    type: 'GET',
    payload: {}
  }

  const ret = createAction(type)

  t.deepEqual(ret, expected)
})

test('should set meta', (t) => {
  const type = 'GET'
  const payload = { id: 'ent1', type: 'entry' }
  const meta = { schedule: {}, queue: true }
  const expected = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { schedule: {}, queue: true }
  }

  const ret = createAction(type, payload, meta)

  t.deepEqual(ret, expected)
})

test('should return null if no type', (t) => {
  const payload = { id: 'ent1', type: 'entry' }

  const ret = createAction(null, payload)

  t.is(ret, null)
})
