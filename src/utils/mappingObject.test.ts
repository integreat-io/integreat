import test from 'ava'

import {
  mappingObjectFromAction,
  actionFromMappingObject,
} from './mappingObject'

// Tests -- mappingObjectFromAction

test('should create mapping object from action for request', (t) => {
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
  const expected = {
    action: 'SET',
    status: 'badrequest',
    params: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
    },
    data,
    paging: undefined,
    error: 'No user by that name',
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
    meta: {
      id: '12345',
      cid: '880432',
    },
  }

  const ret = mappingObjectFromAction(action, isRequest)

  t.deepEqual(ret, expected)
})

test('should create mapping object from action for response', (t) => {
  const isRequest = false
  const data = { users: [{ id: 'johnf', type: 'user', name: 'John F.' }] }
  const action = {
    type: 'GET',
    payload: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
      data: {},
    },
    response: {
      status: null,
      data,
      paging: { next: { offset: 'page2', type: 'entry' } },
    },
    meta: {
      options: { uri: 'http://some.api.com/1.0' },
      ident: { id: 'johnf' },
      id: '12345',
      cid: '880432',
    },
  }
  const expected = {
    action: 'GET',
    status: null,
    params: { id: 'johnf', type: 'user', searchDeleted: true },
    data,
    paging: { next: { offset: 'page2', type: 'entry' } },
    error: undefined,
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
    meta: {
      id: '12345',
      cid: '880432',
    },
  }

  const ret = mappingObjectFromAction(action, isRequest)

  t.deepEqual(ret, expected)
})

// Tests -- actionFromMappingObject

test('should populate action from mapping object from response from service', (t) => {
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
      options: { uri: 'http://some.api.com/1.0/users/{{params.id}}' },
      ident: { id: 'johnf' },
    },
  }
  const mappingObject = {
    action: 'GET',
    status: 'ok',
    params: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
      sendNoDefaults: true,
    },
    data,
    paging: { next: { offset: 'page2', type: 'entry' } },
    error: undefined,
    options: {
      uri: 'http://some.api.com/1.0/users/johnf',
      queryParams: { order: 'desc' },
    },
    headers: {
      'content-type': 'application/json',
    },
    ident: { id: 'johnf' },
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
    },
    meta: {
      options: {
        uri: 'http://some.api.com/1.0/users/johnf',
        queryParams: { order: 'desc' },
      },
      ident: { id: 'johnf' },
    },
  }

  const ret = actionFromMappingObject(action, mappingObject, isRequest)

  t.deepEqual(ret, expected)
})

test('should populate action from mapping object from request to service', (t) => {
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
  const mappingObject = {
    action: 'SET',
    status: 'badrequest',
    params: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
    },
    data,
    paging: undefined,
    error: 'No user by that name',
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
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
      ident: { id: 'johnf' },
    },
  }

  const ret = actionFromMappingObject(action, mappingObject, isRequest)

  t.deepEqual(ret, expected)
})

test('should populate action from mapping object from request to service on success', (t) => {
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
  const mappingObject = {
    action: 'SET',
    status: null,
    params: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
    },
    data,
    paging: undefined,
    error: undefined,
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
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

  const ret = actionFromMappingObject(action, mappingObject, isRequest)

  t.deepEqual(ret, expected)
})

test('should populate action from mapping object from response to service', (t) => {
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
  const mappingObject = {
    action: 'SET',
    status: 'badrequest',
    params: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
    },
    data,
    paging: undefined,
    error: 'No user by that name',
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
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

  const ret = actionFromMappingObject(action, mappingObject, isRequest)

  t.deepEqual(ret, expected)
})

test('should populate action from mapping object from request from service', (t) => {
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
  const mappingObject = {
    action: 'GET_SOMETHING',
    status: 'ok',
    params: { id: 'johnf', type: 'user', searchDeleted: true },
    data,
    paging: { next: { offset: 'page2', type: 'entry' } },
    error: undefined,
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
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

  const ret = actionFromMappingObject(action, mappingObject, isRequest)

  t.deepEqual(ret, expected)
})

test('should populate action from mapping object with error message', (t) => {
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
      options: { uri: 'http://some.api.com/1.0/users/{{params.id}}' },
      ident: { id: 'johnf' },
    },
  }
  const mappingObject = {
    action: 'GET',
    status: 'ok',
    params: {
      id: 'johnf',
      type: 'user',
      searchDeleted: true,
      sendNoDefaults: true,
    },
    data,
    paging: { next: { offset: 'page2', type: 'entry' } },
    error: 'Something went wrong',
    options: {
      uri: 'http://some.api.com/1.0/users/johnf',
      queryParams: { order: 'desc' },
    },
    ident: { id: 'johnf' },
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

  const ret = actionFromMappingObject(action, mappingObject, isRequest)

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
  const mappingObject = {
    action: 'GET',
    status: 'ok',
    params: {},
    data,
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

  const ret = actionFromMappingObject(action, mappingObject, isRequest)

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
  const mappingObject = {
    action: 'GET',
    status: 'error',
    params: {},
    data,
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

  const ret = actionFromMappingObject(action, mappingObject, isRequest)

  t.deepEqual(ret, expected)
})
