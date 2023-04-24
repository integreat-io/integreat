import test from 'ava'
import type { Action } from '../types.js'

import { populateActionAfterMutation } from './mutationHelpers.js'

// Tests -- populateActionAfterMutation

test('should return mutated action when all parts are replaced', (t) => {
  const data = { users: [{ id: 'johnf', type: 'user', name: 'John F.' }] }
  const action = {
    type: 'GET',
    payload: {
      data: {},
    },
    response: {
      status: undefined,
      data: { id: 'johnf' },
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0/users/{payload.id}' },
      ident: { id: 'johnf' },
    },
  }
  const mappedAction = {
    type: 'GET',
    payload: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
    },
    response: {
      status: 'ok',
      error: undefined,
      data,
      paging: { next: { offset: 'page2', type: 'entry' } },
      headers: {
        'content-type': 'application/json',
      },
      params: { archived: true },
    },
    meta: {
      options: {
        uri: 'http://some.api.com/1.0/users/johnf',
        queryParams: { order: 'desc' },
      },
      ident: { id: 'johnf' },
    },
  }
  const expected = mappedAction

  const ret = populateActionAfterMutation(action, mappedAction)

  t.deepEqual(ret, expected)
})

test('should keep the untouched parts from the original action', (t) => {
  const action = {
    type: 'SET',
    payload: {
      id: 'johnf',
      data: [{ id: 'johnf' }],
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }
  const mappedAction = {
    response: {
      status: 'badrequest',
      error: 'No user by that name',
      paging: undefined,
    },
  }
  const expected = {
    type: 'SET',
    payload: {
      id: 'johnf',
      data: [{ id: 'johnf' }],
    },
    response: {
      status: 'badrequest',
      error: 'No user by that name',
      paging: undefined,
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }

  const ret = populateActionAfterMutation(action, mappedAction)

  t.deepEqual(ret, expected)
})

test('should set status to original status when not set in mutated action', (t) => {
  const action = {
    type: 'SET',
    payload: {
      id: 'johnf',
      data: [{ id: 'johnf' }],
    },
    response: { status: 'ok' },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }
  const mappedAction = {
    response: {
      data: [{ id: 'ent1', $type: 'entry' }],
    },
  } as Action // To allow the missing `status`
  const expected = {
    type: 'SET',
    payload: {
      id: 'johnf',
      data: [{ id: 'johnf' }],
    },
    response: {
      status: 'ok',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }

  const ret = populateActionAfterMutation(action, mappedAction)

  t.deepEqual(ret, expected)
})

test('should set status to null on response when not set and no original status', (t) => {
  const action = {
    type: 'SET',
    payload: {
      id: 'johnf',
      data: [{ id: 'johnf' }],
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }
  const mappedAction = {
    response: {
      data: [{ id: 'ent1', $type: 'entry' }],
    },
  } as Action // To allow the missing `status`
  const expected = {
    type: 'SET',
    payload: {
      id: 'johnf',
      data: [{ id: 'johnf' }],
    },
    response: {
      status: undefined,
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }

  const ret = populateActionAfterMutation(action, mappedAction)

  t.deepEqual(ret, expected)
})

test('should join array of error strings to one string', (t) => {
  const action = {
    type: 'SET',
    payload: {
      id: 'johnf',
      data: [{ id: 'johnf' }],
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }
  const mappedAction = {
    response: {
      status: 'ok',
      error: [
        'Something failed',
        'Something else failed',
        'A third thing failed',
      ],
    },
  }
  const expected = {
    type: 'SET',
    payload: {
      id: 'johnf',
      data: [{ id: 'johnf' }],
    },
    response: {
      status: 'error',
      error: 'Something failed | Something else failed | A third thing failed',
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }

  const ret = populateActionAfterMutation(
    action,
    mappedAction as unknown as Action
  )

  t.deepEqual(ret, expected)
})

test('should set status to error when error string is present', (t) => {
  const action = {
    type: 'SET',
    payload: {
      id: 'johnf',
      data: [{ id: 'johnf' }],
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }
  const mappedAction = {
    response: {
      status: 'ok',
      error: 'Something failed big time',
    },
  }
  const expected = {
    type: 'SET',
    payload: {
      id: 'johnf',
      data: [{ id: 'johnf' }],
    },
    response: {
      status: 'error',
      error: 'Something failed big time',
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }

  const ret = populateActionAfterMutation(action, mappedAction)

  t.deepEqual(ret, expected)
})

test('should use original error status when error string is present', (t) => {
  const action = {
    type: 'SET',
    payload: {
      id: 'johnf',
      data: [{ id: 'johnf' }],
    },
    response: { status: 'noaccess' },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }
  const mappedAction = {
    response: {
      error: 'Something failed big time',
    },
  } as Action // To allow the missing `status`
  const expected = {
    type: 'SET',
    payload: {
      id: 'johnf',
      data: [{ id: 'johnf' }],
    },
    response: {
      status: 'noaccess',
      error: 'Something failed big time',
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }

  const ret = populateActionAfterMutation(action, mappedAction)

  t.deepEqual(ret, expected)
})

test('should not set response when not present', (t) => {
  const action = {
    type: 'SET',
    payload: {
      data: [{ id: 'johnf' }],
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }
  const mappedAction = {
    type: 'SET_USER',
    payload: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
      data: [{ $type: 'user', id: 'johnf', name: 'John F.' }],
    },
  }
  const expected = {
    type: 'SET_USER',
    payload: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
      data: [{ $type: 'user', id: 'johnf', name: 'John F.' }],
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }

  const ret = populateActionAfterMutation(action, mappedAction)

  t.deepEqual(ret, expected)
})

test('should not set empty response object', (t) => {
  const action = {
    type: 'SET',
    payload: {
      data: [{ id: 'johnf' }],
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }
  const mappedAction = {
    type: 'SET_USER',
    response: {},
  } as Action // To allow the missing `status`
  const expected = {
    type: 'SET_USER',
    payload: {
      data: [{ id: 'johnf' }],
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }

  const ret = populateActionAfterMutation(action, mappedAction)

  t.deepEqual(ret, expected)
})

test('should return action when no mutated action', (t) => {
  const action = {
    type: 'SET',
    payload: {
      data: [{ id: 'johnf' }],
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }
  const mappedAction = undefined
  const expected = action

  const ret = populateActionAfterMutation(action, mappedAction)

  t.deepEqual(ret, expected)
})
