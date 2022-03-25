import test from 'ava'
import { Action } from '../types'

import {
  prepareActionForMapping,
  populateActionAfterMapping,
} from './mappingHelpers'

// Tests -- prepareActionForMapping

test('should simply return action as mapping object', (t) => {
  const data = [{ $type: 'user', id: 'johnf', name: 'John F.' }]
  const action = {
    type: 'SET',
    payload: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
      data,
    },
    response: { status: 'badrequest', error: 'No user by that name' },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
      id: '12345',
      cid: '880432',
    },
  }
  const expected = action

  const ret = prepareActionForMapping(action)

  t.deepEqual(ret, expected)
})

// Tests -- populateActionAfterMapping

test('should return mapped action when all parts are replaced', (t) => {
  const data = { users: [{ id: 'johnf', type: 'user', name: 'John F.' }] }
  const action = {
    type: 'GET',
    payload: {
      data: {},
      sendNoDefaults: true,
    },
    response: {
      status: null,
      data: { id: 'johnf' },
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0/users/{{payload.id}}' },
      ident: { id: 'johnf' },
    },
  }
  const mappedAction = {
    type: 'GET',
    payload: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
      sendNoDefaults: true,
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

  const ret = populateActionAfterMapping(action, mappedAction)

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

  const ret = populateActionAfterMapping(action, mappedAction)

  t.deepEqual(ret, expected)
})

test('should set status to null on response when not set', (t) => {
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
      status: null,
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }

  const ret = populateActionAfterMapping(action, mappedAction)

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
      status: 'error',
      error: 'Something failed big time',
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }

  const ret = populateActionAfterMapping(action, mappedAction)

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

  const ret = populateActionAfterMapping(action, mappedAction)

  t.deepEqual(ret, expected)
})

test('should return action when no mapped action', (t) => {
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

  const ret = populateActionAfterMapping(action, mappedAction)

  t.deepEqual(ret, expected)
})
