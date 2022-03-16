import test from 'ava'

import {
  prepareActionForMapping,
  populateActionAfterMapping,
} from './mappingHelpers'

// Tests -- mappingObjectFromAction

test('should simply return action as mapping object', (t) => {
  const isRequest = true
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

  const ret = prepareActionForMapping(action, isRequest)

  t.deepEqual(ret, expected)
})

// Tests -- actionFromMappingObject

test('should populate action from mapped action from service', (t) => {
  const isRequest = false
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
  const expected = {
    type: 'GET',
    payload: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
      data: {},
      sendNoDefaults: true,
    },
    response: {
      status: 'ok',
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

  const ret = populateActionAfterMapping(action, mappedAction, isRequest)

  t.deepEqual(ret, expected)
})

test('should populate action from mapped action to service', (t) => {
  const isRequest = true
  const data = [{ $type: 'user', id: 'johnf', name: 'John F.' }]
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
    type: 'SET',
    payload: {
      type: 'user',
      searchDeleted: true,
      data,
    },
    response: {
      status: 'badrequest',
      error: 'No user by that name',
      paging: undefined,
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'lucyk' },
    },
  }
  const expected = {
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
      ident: { id: 'lucyk' },
    },
  }

  const ret = populateActionAfterMapping(action, mappedAction, isRequest)

  t.deepEqual(ret, expected)
})

test('should populate action from mapped action to service on success', (t) => {
  const isRequest = true
  const data = [{ $type: 'user', id: 'johnf', name: 'John F.' }]
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
    type: 'SET',
    payload: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
      data,
    },
    response: {
      status: null,
      error: undefined,
      paging: undefined,
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }
  const expected = {
    type: 'SET',
    payload: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
      data,
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }

  const ret = populateActionAfterMapping(action, mappedAction, isRequest)

  t.deepEqual(ret, expected)
})

test('should not use original data when data is mapped to undefined', (t) => {
  const isRequest = false
  const action = {
    type: 'GET',
    payload: {
      data: {},
      sendNoDefaults: true,
    },
    response: {
      status: 'ok',
      data: { id: 'johnf' },
    },
    meta: { ident: { id: 'johnf' } },
  }
  const mappedAction = {
    type: 'GET',
    payload: {
      data: undefined,
    },
    response: {
      status: 'error',
      data: undefined,
    },
    meta: {},
  }
  const expected = {
    type: 'GET',
    payload: {
      data: undefined,
      sendNoDefaults: true,
    },
    response: {
      status: 'error',
      data: undefined,
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = populateActionAfterMapping(action, mappedAction, isRequest)

  t.deepEqual(ret, expected)
})

test('should populate action from mapped action to service - response?', (t) => {
  const isRequest = false
  const data = [{ $type: 'user', id: 'johnf', name: 'John F.' }]
  const action = {
    type: 'SET',
    payload: {
      isArchived: false,
    },
    response: {
      status: null,
      data: [{ id: 'johnf' }],
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }
  const mappedAction = {
    type: 'SET',
    payload: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
    },
    response: {
      status: 'badrequest',
      error: 'No user by that name',
      data,
      paging: undefined,
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }
  const expected = {
    type: 'SET',
    payload: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
      isArchived: false,
    },
    response: {
      status: 'badrequest',
      data,
      error: 'No user by that name',
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }

  const ret = populateActionAfterMapping(action, mappedAction, isRequest)

  t.deepEqual(ret, expected)
})

test('should populate action from mapped action from service - request?', (t) => {
  const isRequest = true
  const data = { users: [{ id: 'johnf', type: 'user', name: 'John F.' }] }
  const action = {
    type: 'GET',
    payload: {
      data: { id: 'johnf' },
    },
    response: {
      status: null,
      data: null,
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }
  const mappedAction = {
    type: 'GET_SOMETHING',
    payload: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
      data,
    },
    response: {
      status: 'ok',
      error: undefined,
      paging: { next: { offset: 'page2', type: 'entry' } },
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }
  const expected = {
    type: 'GET_SOMETHING',
    payload: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
      data,
    },
    response: {
      status: 'ok',
      data: null,
      paging: { next: { offset: 'page2', type: 'entry' } },
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
    },
  }

  const ret = populateActionAfterMapping(action, mappedAction, isRequest)

  t.deepEqual(ret, expected)
})

test('should populate action from mapped action with error message', (t) => {
  const isRequest = false
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
      error: 'Something went wrong',
      data,
      paging: { next: { offset: 'page2', type: 'entry' } },
    },
    meta: {
      options: {
        uri: 'http://some.api.com/1.0/users/johnf',
        queryParams: { order: 'desc' },
      },
      ident: { id: 'johnf' },
    },
  }
  const expected = {
    type: 'GET',
    payload: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
      data: {},
      sendNoDefaults: true,
    },
    response: {
      status: 'error',
      error: 'Something went wrong',
      data,
      paging: { next: { offset: 'page2', type: 'entry' } },
    },
    meta: {
      options: {
        uri: 'http://some.api.com/1.0/users/johnf',
        queryParams: { order: 'desc' },
      },
      ident: { id: 'johnf' },
    },
  }

  const ret = populateActionAfterMapping(action, mappedAction, isRequest)

  t.deepEqual(ret, expected)
})

test('should not override error status from service with ok status from data', (t) => {
  const isRequest = false
  const data = { users: [{ id: 'johnf', type: 'user', name: 'John F.' }] }
  const action = {
    type: 'GET',
    payload: { type: 'user' },
    response: {
      status: 'error',
      error: 'Something went wrong',
      data: { id: 'johnf' },
    },
    meta: {
      ident: { id: 'johnf' },
    },
  }
  const mappedAction = {
    type: 'GET',
    response: {
      status: 'ok',
      data,
    },
  }
  const expected = {
    type: 'GET',
    payload: { type: 'user' },
    response: {
      status: 'error',
      error: 'Something went wrong',
      data,
    },
    meta: {
      ident: { id: 'johnf' },
    },
  }

  const ret = populateActionAfterMapping(action, mappedAction, isRequest)

  t.deepEqual(ret, expected)
})

test('should not override specific error status from service with error status from data', (t) => {
  const isRequest = false
  const data = { users: [{ id: 'johnf', type: 'user', name: 'John F.' }] }
  const action = {
    type: 'GET',
    payload: { type: 'user' },
    response: {
      status: 'noaccess',
      error: 'Not getting in',
      data: { id: 'johnf' },
    },
    meta: {
      ident: { id: 'johnf' },
    },
  }
  const mappedAction = {
    type: 'GET',
    response: {
      status: 'error',
      data,
    },
  }
  const expected = {
    type: 'GET',
    payload: { type: 'user' },
    response: {
      status: 'noaccess',
      error: 'Not getting in',
      data,
    },
    meta: {
      ident: { id: 'johnf' },
    },
  }

  const ret = populateActionAfterMapping(action, mappedAction, isRequest)

  t.deepEqual(ret, expected)
})
