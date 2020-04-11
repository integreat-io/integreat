import test from 'ava'
import { Endpoint } from '../service/endpoints/types'

import {
  exchangeFromAction,
  requestFromExchange,
  responseToExchange,
  mappingObjectFromExchange,
  exchangeFromMappingObject,
  responseFromExchange,
} from './exchangeMapping'

// Setup

const exchangeDefaults = {
  status: null,
  request: {},
  response: {},
  meta: {},
}

// Tests

test('should create exchange from action', (t) => {
  const action = {
    type: 'SET',
    payload: {
      id: 'johnf',
      type: 'user',
      data: { name: 'John F.' },
      endpoint: 'superuser',
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
    endpointId: 'superuser',
    ident: { id: 'johnf' },
    incoming: false,
  }

  const ret = exchangeFromAction(action)

  t.deepEqual(ret, expected)
})

test('should create incoming exchange from REQUEST action', (t) => {
  const action = {
    type: 'REQUEST',
    payload: {
      id: 'johnf',
      type: 'user',
      data: { name: 'John F.' },
      endpoint: 'superuser',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    ...exchangeDefaults,
    type: 'REQUEST',
    request: {
      id: 'johnf',
      type: 'user',
      data: { name: 'John F.' },
      params: {},
    },
    response: {},
    endpointId: 'superuser',
    ident: { id: 'johnf' },
    incoming: true,
  }

  const ret = exchangeFromAction(action)

  t.deepEqual(ret, expected)
})

test('should create request from exchange', (t) => {
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    request: {
      id: 'johnf',
      type: 'user',
      data: { name: 'John F.' },
    },
    endpoint: ({
      options: { uri: 'http://some.api.com/1.0' },
    } as unknown) as Endpoint,
    ident: { id: 'johnf' },
  }
  const expected = {
    action: 'SET',
    params: { id: 'johnf', type: 'user' },
    data: { name: 'John F.' },
    endpoint: { uri: 'http://some.api.com/1.0' },
    access: { ident: { id: 'johnf' } },
  }

  const ret = requestFromExchange(exchange)

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
    endpoint: ({
      options: { uri: 'http://some.api.com/1.0' },
    } as unknown) as Endpoint,
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
    endpoint: ({
      options: { uri: 'http://some.api.com/1.0' },
    } as unknown) as Endpoint,
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
    endpoint: ({
      options: { uri: 'http://some.api.com/1.0' },
    } as unknown) as Endpoint,
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
    endpoint: ({
      options: { uri: 'http://some.api.com/1.0' },
    } as unknown) as Endpoint,
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

test('should create mapping object from exchange for mapping from service', (t) => {
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
    endpoint: ({
      options: { uri: 'http://some.api.com/1.0' },
    } as unknown) as Endpoint,
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

  const ret = mappingObjectFromExchange(exchange)

  t.deepEqual(ret, expected)
})

test('should create mapping object from exchange for mapping to service', (t) => {
  const data = [{ $type: 'user', id: 'johnf', name: 'John F.' }]
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    status: 'badrequest',
    request: {
      id: 'johnf',
      type: 'user',
      params: { searchDeleted: true },
      service: 'store',
      data,
    },
    response: { error: 'No user by that name' },
    endpoint: ({
      options: { uri: 'http://some.api.com/1.0' },
    } as unknown) as Endpoint,
    ident: { id: 'johnf' },
  }
  const expected = {
    action: 'SET',
    status: 'badrequest',
    params: {
      id: 'johnf',
      type: 'user',
      service: 'store',
      searchDeleted: true,
    },
    data,
    paging: undefined,
    error: 'No user by that name',
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
  }

  const ret = mappingObjectFromExchange(exchange, true)

  t.deepEqual(ret, expected)
})

test('should create mapping object from incoming exchange for mapping from service', (t) => {
  const data = { users: [{ id: 'johnf', type: 'user', name: 'John F.' }] }
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    status: null,
    request: {
      id: 'johnf',
      type: 'user',
      params: { searchDeleted: true },
      data,
    },
    response: {},
    endpoint: ({
      options: { uri: 'http://some.api.com/1.0' },
    } as unknown) as Endpoint,
    ident: { id: 'johnf' },
    incoming: true,
  }
  const expected = {
    action: 'GET',
    status: null,
    params: { id: 'johnf', type: 'user', searchDeleted: true },
    data,
    paging: undefined,
    error: undefined,
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
  }

  const ret = mappingObjectFromExchange(exchange)

  t.deepEqual(ret, expected)
})

test('should create mapping object from incoming exchange for mapping to service', (t) => {
  const data = [{ $type: 'user', id: 'johnf', name: 'John F.' }]
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    status: 'badrequest',
    request: {
      id: 'johnf',
      type: 'user',
      params: { searchDeleted: true },
      data: {},
    },
    response: { data, error: 'No user by that name' },
    endpoint: ({
      options: { uri: 'http://some.api.com/1.0' },
    } as unknown) as Endpoint,
    ident: { id: 'johnf' },
    incoming: true,
  }
  const expected = {
    action: 'SET',
    status: 'badrequest',
    params: { id: 'johnf', type: 'user', searchDeleted: true },
    data,
    paging: undefined,
    error: 'No user by that name',
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
  }

  const ret = mappingObjectFromExchange(exchange, true)

  t.deepEqual(ret, expected)
})

// Tests -- exchangeFromMappingObject

test('should populate exchange from mapping object from service', (t) => {
  const data = { users: [{ id: 'johnf', type: 'user', name: 'John F.' }] }
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    status: null,
    request: {
      data: {},
    },
    response: {
      data: { id: 'johnf' },
    },
    endpoint: ({
      options: { uri: 'http://some.api.com/1.0' },
    } as unknown) as Endpoint,
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
      data: {},
    },
    response: {
      data,
      paging: { next: { offset: 'page2', type: 'entry' } },
    },
    endpoint: ({
      options: { uri: 'http://some.api.com/1.0' },
    } as unknown) as Endpoint,
    ident: { id: 'johnf' },
  }

  const ret = exchangeFromMappingObject(exchange, mappingObject)

  t.deepEqual(ret, expected)
})

test('should populate exchange from mapping object to service', (t) => {
  const data = [{ $type: 'user', id: 'johnf', name: 'John F.' }]
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    status: null,
    request: {
      data: [{ id: 'johnf' }],
    },
    response: {},
    endpoint: ({
      options: { uri: 'http://some.api.com/1.0' },
    } as unknown) as Endpoint,
    ident: { id: 'johnf' },
  }
  const mappingObject = {
    action: 'SET',
    status: 'badrequest',
    params: {
      id: 'johnf',
      type: 'user',
      service: 'store',
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
      service: 'store',
      data,
    },
    response: { error: 'No user by that name' },
    endpoint: ({
      options: { uri: 'http://some.api.com/1.0' },
    } as unknown) as Endpoint,
    ident: { id: 'johnf' },
  }

  const ret = exchangeFromMappingObject(exchange, mappingObject, true)

  t.deepEqual(ret, expected)
})

test('should populate incoming exchange from mapping object from service', (t) => {
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
    endpoint: ({
      options: { uri: 'http://some.api.com/1.0' },
    } as unknown) as Endpoint,
    ident: { id: 'johnf' },
    incoming: true,
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
    endpoint: ({
      options: { uri: 'http://some.api.com/1.0' },
    } as unknown) as Endpoint,
    ident: { id: 'johnf' },
    incoming: true,
  }

  const ret = exchangeFromMappingObject(exchange, mappingObject)

  t.deepEqual(ret, expected)
})

test('should populate incoming exchange from mapping object to service', (t) => {
  const data = [{ $type: 'user', id: 'johnf', name: 'John F.' }]
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    status: null,
    request: {},
    response: {
      data: [{ id: 'johnf' }],
    },
    endpoint: ({
      options: { uri: 'http://some.api.com/1.0' },
    } as unknown) as Endpoint,
    ident: { id: 'johnf' },
    incoming: true,
  }
  const mappingObject = {
    action: 'SET',
    status: 'badrequest',
    params: {
      id: 'johnf',
      type: 'user',
      service: 'store',
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
      service: 'store',
    },
    response: {
      data,
      error: 'No user by that name',
    },
    endpoint: ({
      options: { uri: 'http://some.api.com/1.0' },
    } as unknown) as Endpoint,
    ident: { id: 'johnf' },
    incoming: true,
  }

  const ret = exchangeFromMappingObject(exchange, mappingObject, true)

  t.deepEqual(ret, expected)
})
