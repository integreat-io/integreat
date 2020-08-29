import test from 'ava'

import {
  exchangeFromAction,
  responseToExchange,
  mappingObjectFromExchange,
  exchangeFromMappingObject,
  responseFromExchange,
  completeExchange,
} from './exchangeMapping'

// Setup

const exchangeDefaults = {
  id: undefined,
  status: null,
  request: {},
  response: {},
  meta: {},
  auth: undefined,
  options: undefined,
  endpointId: undefined,
  source: undefined,
  target: undefined,
  authorized: false,
}

// Tests

test('should complete exchange', (t) => {
  const exchange = {
    type: 'SET',
  }
  const expected = {
    type: 'SET',
    id: undefined,
    status: null,
    request: {},
    response: {},
    options: undefined,
    endpointId: undefined,
    ident: undefined,
    meta: {},
    auth: undefined,
    source: undefined,
    target: undefined,
    authorized: false,
  }

  const ret = completeExchange(exchange)

  t.deepEqual(ret, expected)
})

test('should not include error when status is ok', (t) => {
  const exchange = {
    type: 'SET',
    status: 'ok',
    response: {
      error: 'Not ok – or is it?',
    },
  }

  const ret = completeExchange(exchange)

  t.is(ret.status, 'ok')
  t.deepEqual(ret.response, {})
})

test('should create exchange from action', (t) => {
  const action = {
    type: 'SET',
    payload: {
      id: 'johnf',
      type: 'user',
      data: { name: 'John F.' },
      endpoint: 'superuser',
      returnNoDefaults: true,
      source: 'api',
      target: 'crm',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    ...exchangeDefaults,
    type: 'SET',
    request: {
      id: 'johnf',
      type: 'user',
      data: { name: 'John F.' },
      params: {},
    },
    response: {
      returnNoDefaults: true,
    },
    endpointId: 'superuser',
    ident: { id: 'johnf' },
    source: 'api',
    target: 'crm',
  }

  const ret = exchangeFromAction(action)

  t.deepEqual(ret, expected)
})

test('should add ok response to exchange', (t) => {
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    request: {
      id: 'johnf',
      type: 'user',
      data: { name: 'John F.' },
    },
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
  }
  const response = {
    status: 'ok',
    data: [{ id: 'ent1', type: 'entry' }],
  }
  const expected = {
    ...exchange,
    status: 'ok',
    response: { data: [{ id: 'ent1', type: 'entry' }] },
  }

  const ret = responseToExchange(exchange, response)

  t.deepEqual(ret, expected)
})

test('should add error response to exchange', (t) => {
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    request: {
      id: 'johnf',
      type: 'user',
      data: { name: 'John F.' },
    },
    response: { data: [] },
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
  }
  const response = {
    status: 'badrequest',
    error: 'Bad request!',
  }
  const expected = {
    ...exchange,
    status: 'badrequest',
    response: { error: 'Bad request!', data: [] },
  }

  const ret = responseToExchange(exchange, response)

  t.deepEqual(ret, expected)
})

test('should return ok response from exchange', (t) => {
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    status: 'ok',
    request: {
      id: 'johnf',
      type: 'user',
      data: { name: 'John F.' },
    },
    response: {
      data: [{ id: 'ent1', type: 'entry' }],
    },
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
  }
  const expected = {
    status: 'ok',
    data: [{ id: 'ent1', type: 'entry' }],
    access: { ident: { id: 'johnf' } },
  }

  const ret = responseFromExchange(exchange)

  t.deepEqual(ret, expected)
})

test('should return error response from exchange', (t) => {
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    status: 'noaccess',
    request: {
      id: 'johnf',
      type: 'user',
      data: { name: 'John F.' },
    },
    response: {
      error: 'No access',
    },
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
  }
  const expected = {
    status: 'noaccess',
    error: 'No access',
    access: { ident: { id: 'johnf' } },
  }

  const ret = responseFromExchange(exchange)

  t.deepEqual(ret, expected)
})

// Tests -- mappingObjectFromExchange

test('should create mapping object from exchange for request', (t) => {
  const isRequest = true
  const data = [{ $type: 'user', id: 'johnf', name: 'John F.' }]
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    status: 'badrequest',
    request: {
      id: 'johnf',
      type: 'user',
      params: { searchDeleted: true },
      data,
    },
    response: { error: 'No user by that name' },
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
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
  }

  const ret = mappingObjectFromExchange(exchange, isRequest)

  t.deepEqual(ret, expected)
})

test('should create mapping object from exchange for response', (t) => {
  const isRequest = false
  const data = { users: [{ id: 'johnf', type: 'user', name: 'John F.' }] }
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    status: null,
    request: {
      id: 'johnf',
      type: 'user',
      params: { searchDeleted: true },
      data: {},
    },
    response: {
      data,
      paging: { next: { offset: 'page2', type: 'entry' } },
    },
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
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
  }

  const ret = mappingObjectFromExchange(exchange, isRequest)

  t.deepEqual(ret, expected)
})

// Tests -- exchangeFromMappingObject

test('should populate exchange from mapping object from response from service', (t) => {
  const isRequest = false
  const data = { users: [{ id: 'johnf', type: 'user', name: 'John F.' }] }
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    status: null,
    request: {
      data: {},
      sendNoDefaults: true,
    },
    response: {
      data: { id: 'johnf' },
    },
    options: { uri: 'http://some.api.com/1.0/users/{{params.id}}' },
    ident: { id: 'johnf' },
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
    ident: { id: 'johnf' },
  }
  const expected = {
    ...exchangeDefaults,
    type: 'GET',
    status: 'ok',
    request: {
      id: 'johnf',
      type: 'user',
      params: { searchDeleted: true },
      data: {},
      sendNoDefaults: true,
    },
    response: {
      data,
      paging: { next: { offset: 'page2', type: 'entry' } },
    },
    options: {
      uri: 'http://some.api.com/1.0/users/johnf',
      queryParams: { order: 'desc' },
    },
    ident: { id: 'johnf' },
  }

  const ret = exchangeFromMappingObject(exchange, mappingObject, isRequest)

  t.deepEqual(ret, expected)
})

test('should populate exchange from mapping object from request to service', (t) => {
  const isRequest = true
  const data = [{ $type: 'user', id: 'johnf', name: 'John F.' }]
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    status: null,
    request: {
      data: [{ id: 'johnf' }],
    },
    response: {},
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
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
    ...exchangeDefaults,
    type: 'SET',
    status: 'badrequest',
    request: {
      id: 'johnf',
      type: 'user',
      params: { searchDeleted: true },
      data,
    },
    response: { error: 'No user by that name' },
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
  }

  const ret = exchangeFromMappingObject(exchange, mappingObject, isRequest)

  t.deepEqual(ret, expected)
})

test('should populate exchange from mapping object from response to service', (t) => {
  const isRequest = false
  const data = [{ $type: 'user', id: 'johnf', name: 'John F.' }]
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    status: null,
    request: {},
    response: {
      data: [{ id: 'johnf' }],
    },
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
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
    ...exchangeDefaults,
    type: 'SET',
    status: 'badrequest',
    request: {
      id: 'johnf',
      type: 'user',
      params: { searchDeleted: true },
    },
    response: {
      data,
      error: 'No user by that name',
    },
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
  }

  const ret = exchangeFromMappingObject(exchange, mappingObject, isRequest)

  t.deepEqual(ret, expected)
})

test('should populate exchange from mapping object from request from service', (t) => {
  const isRequest = true
  const data = { users: [{ id: 'johnf', type: 'user', name: 'John F.' }] }
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    status: null,
    request: {
      data: { id: 'johnf' },
    },
    response: {
      data: null,
    },
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
  }
  const mappingObject = {
    action: 'GET',
    status: 'ok',
    params: { id: 'johnf', type: 'user', searchDeleted: true },
    data,
    paging: { next: { offset: 'page2', type: 'entry' } },
    error: undefined,
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
  }
  const expected = {
    ...exchangeDefaults,
    type: 'GET',
    status: 'ok',
    request: {
      id: 'johnf',
      type: 'user',
      params: { searchDeleted: true },
      data,
    },
    response: {
      data: null,
      paging: { next: { offset: 'page2', type: 'entry' } },
    },
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
  }

  const ret = exchangeFromMappingObject(exchange, mappingObject, isRequest)

  t.deepEqual(ret, expected)
})