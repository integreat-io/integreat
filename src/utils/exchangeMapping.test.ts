import test from 'ava'
import { Endpoint } from '../service/endpoints/types'

import {
  exchangeFromAction,
  requestFromExchange,
  responseToExchange,
  mappingObjectFromExchange,
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

test('should create incoming exchange from action', (t) => {
  const incoming = true
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
    response: {
      data: { name: 'John F.' }, // TODO: I'm NOT sure of this. Needs rethinking
      params: undefined,
    },
    endpointId: 'superuser',
    ident: { id: 'johnf' },
    incoming: true,
  }

  const ret = exchangeFromAction(action, incoming)

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

test('should create mapping object from exchange and data', (t) => {
  const data = { id: 'johnf', type: 'user', name: 'John F.' }
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: {
      id: 'johnf',
      type: 'user',
      params: { searchDeleted: true },
    },
    response: { data: { users: [data] } },
    endpoint: ({
      options: { uri: 'http://some.api.com/1.0' },
    } as unknown) as Endpoint,
    ident: { id: 'johnf' },
  }
  const expected = {
    action: 'GET',
    params: { id: 'johnf', type: 'user', searchDeleted: true },
    data,
    options: { uri: 'http://some.api.com/1.0' },
    ident: { id: 'johnf' },
  }

  const ret = mappingObjectFromExchange(exchange, data)

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
