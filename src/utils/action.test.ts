import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createAction,
  setResponseOnAction,
  setMetaOnAction,
  setErrorOnAction,
  setDataOnActionPayload,
  setOriginOnAction,
  setActionIds,
} from './action.js'

// Tests -- createAction

test('should return an action', () => {
  const type = 'GET'
  const payload = { id: 'ent1', type: 'entry' }
  const expected = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: {},
  }

  const ret = createAction(type, payload)

  assert.deepEqual(ret, expected)
})

test('should always set payload object', () => {
  const type = 'GET'
  const expected = {
    type: 'GET',
    payload: {},
    meta: {},
  }

  const ret = createAction(type)

  assert.deepEqual(ret, expected)
})

test('should set meta', () => {
  const type = 'GET'
  const payload = { id: 'ent1', type: 'entry' }
  const meta = { schedule: {}, queue: true }
  const expected = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { schedule: {}, queue: true },
  }

  const ret = createAction(type, payload, meta)

  assert.deepEqual(ret, expected)
})

test('should return null if no type', () => {
  const payload = { id: 'ent1', type: 'entry' }

  const ret = createAction(null as unknown as string, payload)

  assert.equal(ret, null)
})

// Tests -- setDataOnActionPayload

test('should set data on action payload', () => {
  const action = {
    type: 'SET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' }, queue: true },
  }
  const data = [{ id: 'ent1', $type: 'entry' }]
  const expected = {
    type: 'SET',
    payload: { type: 'entry', data: [{ id: 'ent1', $type: 'entry' }] },
    meta: { ident: { id: 'johnf' }, queue: true },
  }

  const ret = setDataOnActionPayload(action, data)

  assert.deepEqual(ret, expected)
})

test('should replace existing data on action payload', () => {
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: [{ id: 'ent1', $type: 'entry' }] },
    meta: { ident: { id: 'johnf' }, queue: true },
  }
  const data = undefined
  const expected = {
    type: 'SET',
    payload: { type: 'entry', data: undefined },
    meta: { ident: { id: 'johnf' }, queue: true },
  }

  const ret = setDataOnActionPayload(action, data)

  assert.deepEqual(ret, expected)
})

// Tests -- setResponseOnAction

test('should set response on action', () => {
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { id: 'johnf' }, queue: true },
  }
  const response = { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] }
  const expected = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    response: { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] },
    meta: { ident: { id: 'johnf' }, queue: true },
  }

  const ret = setResponseOnAction(action, response)

  assert.deepEqual(ret, expected)
})

test('should set response on action when no response is given', () => {
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { id: 'johnf' }, queue: true },
  }
  const response = undefined
  const expected = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    response: {},
    meta: { ident: { id: 'johnf' }, queue: true },
  }

  const ret = setResponseOnAction(action, response)

  assert.deepEqual(ret, expected)
})

// Tests -- setMetaOnAction

test('should set meta on action', () => {
  const action = { type: 'GET', payload: { type: 'entry' } }
  const meta = { ident: { id: 'johnf' }, queue: true }
  const expected = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' }, queue: true },
  }

  const ret = setMetaOnAction(action, meta)

  assert.deepEqual(ret, expected)
})

test('should include cid and gid but not id in meta on action', () => {
  const action = { type: 'GET', payload: { type: 'entry' } }
  const meta = {
    ident: { id: 'johnf' },
    id: '12345',
    cid: '12346',
    gid: '12344',
  }
  const expected = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' }, cid: '12346', gid: '12344' },
  }

  const ret = setMetaOnAction(action, meta)

  assert.deepEqual(ret, expected)
})

test('should not override queue from original action', () => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { queue: true },
  }
  const meta = { ident: { id: 'johnf' }, queue: false }
  const expected = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' }, queue: true },
  }

  const ret = setMetaOnAction(action, meta)

  assert.deepEqual(ret, expected)
})

test('should remove queue prop when not true', () => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }
  const meta = { ident: { id: 'johnf' }, queue: false }
  const expected = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = setMetaOnAction(action, meta)

  assert.deepEqual(ret, expected)
})

test('should remove queuedAt prop', () => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }
  const meta = { ident: { id: 'johnf' }, queue: true, queuedAt: 1698935586299 }
  const expected = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' }, queue: true },
  }

  const ret = setMetaOnAction(action, meta)

  assert.deepEqual(ret, expected)
})

// Tests -- setErrorOnAction

test('should set error response on action object', () => {
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { id: 'johnf' }, queue: true },
  }
  const message = 'Too long'
  const status = 'timeout'
  const expected = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    response: {
      status: 'timeout',
      error: 'Too long',
      origin: 'somewhere',
    },
    meta: { ident: { id: 'johnf' }, queue: true },
  }

  const ret = setErrorOnAction(action, message, 'somewhere', status)

  assert.deepEqual(ret, expected)
})

test('should set error response on action object that already has a response', () => {
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    response: {
      status: 'ok',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    meta: { ident: { id: 'johnf' }, queue: true },
  }
  const message = 'An ugly error'
  const expected = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    response: {
      status: 'error',
      error: 'An ugly error',
      origin: 'somewhere',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    meta: { ident: { id: 'johnf' }, queue: true },
  }

  const ret = setErrorOnAction(action, message, 'somewhere')

  assert.deepEqual(ret, expected)
})

// Tests -- setOriginOnAction

test('should set origin on response', () => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    response: { status: 'error', error: 'We failed' },
    meta: { ident: { id: 'johnf' } },
  }
  const origin = 'somewhere:bad'
  const expected = {
    ...action,
    response: {
      status: 'error',
      error: 'We failed',
      origin: 'somewhere:bad',
    },
  }

  const ret = setOriginOnAction(action, origin)

  assert.deepEqual(ret, expected)
})

test('should prefix origin when one already exists', () => {
  const doPrefix = true
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    response: {
      status: 'error',
      error: 'We failed',
      origin: 'somewhere:else',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const origin = 'and:here'
  const expected = {
    ...action,
    response: {
      status: 'error',
      error: 'We failed',
      origin: 'and:here:somewhere:else',
    },
  }

  const ret = setOriginOnAction(action, origin, doPrefix)

  assert.deepEqual(ret, expected)
})

test('should set origin on response with only error', () => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    response: { error: 'We failed' },
    meta: { ident: { id: 'johnf' } },
  }
  const origin = 'somewhere:bad'
  const expected = {
    ...action,
    response: {
      error: 'We failed',
      origin: 'somewhere:bad',
    },
  }

  const ret = setOriginOnAction(action, origin)

  assert.deepEqual(ret, expected)
})

test('should not set origin on ok response', () => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    response: { status: 'ok' },
    meta: { ident: { id: 'johnf' } },
  }
  const origin = 'somewhere:bad'
  const expected = {
    ...action,
    response: { status: 'ok' },
  }

  const ret = setOriginOnAction(action, origin)

  assert.deepEqual(ret, expected)
})

// Tests -- setActionIds

test('should set id and cid on action', () => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    response: { status: 'ok' },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = setActionIds(action)

  const id = ret.meta?.id
  assert.equal(typeof id, 'string')
  assert.equal(id?.length, 21)
  assert.equal(ret.meta?.cid, id)
  assert.equal(ret.type, 'GET')
  assert.deepEqual(ret.payload, action.payload)
  assert.deepEqual(ret.meta?.ident, { id: 'johnf' })
})

test('should use id as cid', () => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    response: { status: 'ok' },
    meta: { ident: { id: 'johnf' }, id: '12345' },
  }
  const expected = {
    ...action,
    meta: { ident: { id: 'johnf' }, id: '12345', cid: '12345' },
  }

  const ret = setActionIds(action)

  assert.deepEqual(ret, expected)
})

test('should set id when cid is present', () => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    response: { status: 'ok' },
    meta: { ident: { id: 'johnf' }, cid: '12346' },
  }

  const ret = setActionIds(action)

  const id = ret.meta?.id
  assert.equal(typeof id, 'string')
  assert.equal(id?.length, 21)
  assert.equal(ret.meta?.cid, '12346')
  assert.notEqual(ret.meta?.cid, id)
  assert.equal(ret.type, 'GET')
  assert.deepEqual(ret.payload, action.payload)
  assert.deepEqual(ret.meta?.ident, { id: 'johnf' })
})

test('should not overwrite id and cid', () => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    response: { status: 'ok' },
    meta: { ident: { id: 'johnf' }, id: '12345', cid: '123456' },
  }
  const expected = {
    ...action,
    meta: { ident: { id: 'johnf' }, id: '12345', cid: '123456' },
  }

  const ret = setActionIds(action)

  assert.deepEqual(ret, expected)
  assert.equal(ret, action) // Should not touch action at all when id and cid are set
})
