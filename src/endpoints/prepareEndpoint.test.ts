import test from 'ava'
import { Dictionary, TypedData, Data } from '../types'
import { isAction } from '../utils/is'

import prepareEndpoint from './prepareEndpoint'

// Setup

const adapter = {
  prepareEndpoint: (
    options?: Dictionary<unknown>,
    serviceOptions?: Dictionary<unknown>
  ) => ({
    ...options,
    ...serviceOptions
  })
}

const mapOptions = {
  pipelines: {
    'entries-entry': [
      {
        $iterate: true,
        id: 'key',
        type: [
          { $transform: 'fixed', value: 'entry', $direction: 'fwd' },
          { $transform: 'fixed', value: undefined, $direction: 'rev' }
        ]
      }
    ],
    'accounts-user': [
      {
        $iterate: true,
        id: 'accountId',
        type: [
          { $transform: 'fixed', value: 'user', $direction: 'fwd' },
          { $transform: 'fixed', value: undefined, $direction: 'rev' }
        ]
      }
    ]
  },
  functions: {}
}

// Tests

test('should prepare endpoint with options', t => {
  const endpoint = { match: {}, options: { uri: 'http://some.api/1.0' } }
  const serviceOptions = { version: '2.1' }
  const expectedOptions = { uri: 'http://some.api/1.0', version: '2.1' }

  const ret = prepareEndpoint(adapter, {}, serviceOptions, {}, {})(endpoint)

  t.truthy(ret)
  t.deepEqual(ret.options, expectedOptions)
})

test('should not prepare incoming endpoints with adapter', t => {
  const endpoint = {
    match: {},
    incoming: true,
    options: { uri: 'http://some.api/1.0' }
  }
  const serviceOptions = { version: '2.1' }
  const expectedOptions = { uri: 'http://some.api/1.0' }

  const ret = prepareEndpoint(adapter, {}, serviceOptions, {}, {})(endpoint)

  t.truthy(ret)
  t.deepEqual(ret.options, expectedOptions)
})

test('should prepare filters', t => {
  const endpoint = {
    match: { filters: { 'data.draft': { const: false } } },
    options: {}
  }
  const validData = { data: { draft: false } }

  const ret = prepareEndpoint(adapter, {}, {}, {}, {})(endpoint)

  t.true(Array.isArray(ret.match.filters))
  t.is((ret.match.filters as Function[]).length, 1)
  t.true((ret.match.filters as Function[])[0](validData))
})

test('should setup mappings from endpoint', t => {
  const endpoint = {
    match: {},
    options: {},
    mappings: { entry: 'entries-entry' }
  }
  const response = { data: { key: 'ent1' } }
  const expected = { id: 'ent1', type: 'entry' }

  const ret = prepareEndpoint(adapter, {}, {}, {}, mapOptions)(endpoint)

  const mapper = ret.mappings.entry
  t.is(typeof mapper, 'function')
  t.deepEqual(mapper(response), expected)
})

test('should setup mappings from service', t => {
  const endpoint = { match: {}, options: {} }
  const mappings = { entry: 'entries-entry' }
  const response = { data: { key: 'ent1' } }
  const expected = { id: 'ent1', type: 'entry' }

  const ret = prepareEndpoint(adapter, {}, {}, mappings, mapOptions)(endpoint)

  const mapper = ret.mappings.entry
  t.is(typeof mapper, 'function')
  t.deepEqual(mapper(response), expected)
})

test('should combine mappings from endpoint and service', t => {
  const endpoint = {
    match: {},
    options: {},
    mappings: { entry: 'entries-entry', user: 'accounts-user' }
  }
  const mappings = { user: 'users-user' }
  const entryData = { data: { key: 'ent1' } }
  const accountData = { data: { accountId: 'johnf' } }

  const ret = prepareEndpoint(adapter, {}, {}, mappings, mapOptions)(endpoint)

  const entryMapper = ret.mappings.entry
  const entry = entryMapper(entryData)
  t.is((entry as TypedData).id, 'ent1')
  const userMapper = ret.mappings.user
  const account = userMapper(accountData)
  t.is((account as TypedData).id, 'johnf')
})

test('should setup validate function', t => {
  const badResponse = { status: 'badrequest', error: 'No token' }
  const transformers = {
    alwaysOk: () => () => null,
    shouldHaveToken: () => (action: Data) =>
      isAction(action) && action.payload.token ? null : badResponse
  }
  const endpoint = { match: {}, validate: ['alwaysOk', 'shouldHaveToken'] }
  const badAction = { type: 'GET', payload: { type: 'entries' } }
  const okAction = {
    type: 'GET',
    payload: { type: 'entries', token: 's0m3th1ng' }
  }

  const ret = prepareEndpoint(adapter, transformers, {}, {}, mapOptions)(
    endpoint
  )

  const { validate } = ret
  t.is(typeof validate, 'function')
  t.deepEqual(validate(badAction), badResponse)
  t.is(validate(okAction), null)
})

test('should setup validate function when no validation', t => {
  const endpoint = { match: {} }
  const badAction = { type: 'GET', payload: { type: 'entries' } }

  const ret = prepareEndpoint(adapter, {}, {}, {}, mapOptions)(endpoint)

  const { validate } = ret
  t.is(typeof validate, 'function')
  t.is(validate(badAction), null)
})
