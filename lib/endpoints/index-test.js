import test from 'ava'

import prepareEndpoints from '.'

// Setup

const adapter = { prepareEndpoint: (options, serviceOptions) => ({ ...options, ...serviceOptions }) }

const setupMapping = (def, type) => ({ id: def, type })

// Tests

test('should prepare endpoints with options', (t) => {
  const endpoints = [
    { match: {}, options: { uri: 'http://some.api/1.0' } }
  ]
  const serviceOptions = { version: '2.1' }
  const expectedOptions = { uri: 'http://some.api/1.0', version: '2.1' }

  const ret = prepareEndpoints({ endpoints, options: serviceOptions }, { adapter })

  t.truthy(ret.list)
  t.deepEqual(ret.list[0].options, expectedOptions)
})

test('should not prepare incoming endpoints with adapter', (t) => {
  const endpoints = [
    { match: {}, incoming: true, options: { uri: 'http://some.api/1.0' } }
  ]
  const serviceOptions = { version: '2.1' }
  const expectedOptions = { uri: 'http://some.api/1.0' }

  const ret = prepareEndpoints({ endpoints, options: serviceOptions }, { adapter })

  t.truthy(ret.list)
  t.deepEqual(ret.list[0].options, expectedOptions)
})

test('should prepare filters', (t) => {
  const endpoints = [
    { match: { filters: { 'data.attributes.draft': { const: false } } }, options: {} }
  ]
  const validData = { data: { attributes: { draft: false } } }

  const ret = prepareEndpoints({ endpoints }, { adapter })

  t.true(Array.isArray(ret.list[0].match.filters))
  t.is(ret.list[0].match.filters.length, 1)
  t.true(ret.list[0].match.filters[0](validData))
})

test('should setup mappings from endpoint', (t) => {
  const endpoints = [
    { match: {}, options: {}, mappings: { entry: 'entries-entry' } }
  ]
  const expectedMappings = {
    entry: {
      id: 'entries-entry',
      type: 'entry'
    }
  }

  const ret = prepareEndpoints({ endpoints }, { adapter, setupMapping })

  t.deepEqual(ret.list[0].mappings, expectedMappings)
})

test('should setup mappings from service', (t) => {
  const endpoints = [
    { match: {}, options: {} }
  ]
  const mappings = { user: 'users-user' }
  const expectedMappings = {
    user: {
      id: 'users-user',
      type: 'user'
    }
  }

  const ret = prepareEndpoints({ endpoints, mappings }, { adapter, setupMapping })

  t.deepEqual(ret.list[0].mappings, expectedMappings)
})

test('should combine mappings from endpoint and service', (t) => {
  const endpoints = [
    { match: {}, options: {}, mappings: { entry: 'entries-entry', user: 'accounts-user' } }
  ]
  const mappings = { entry: 'users-user' }
  const expectedMappings = {
    entry: {
      id: 'entries-entry',
      type: 'entry'
    },
    user: {
      id: 'accounts-user',
      type: 'user'
    }
  }

  const ret = prepareEndpoints({ endpoints, mappings }, { adapter, setupMapping })

  t.deepEqual(ret.list[0].mappings, expectedMappings)
})

test('should setup validate function', (t) => {
  const badResponse = { status: 'badrequest', error: 'No token' }
  const transformers = {
    alwaysOk: () => null,
    shouldHaveToken: (action) => (action.payload.token) ? null : badResponse
  }
  const endpoints = [
    { match: {}, validate: ['alwaysOk', 'shouldHaveToken'] }
  ]
  const badAction = { type: 'GET', payload: { type: 'entries' } }
  const okAction = { type: 'GET', payload: { type: 'entries', token: 's0m3th1ng' } }

  const ret = prepareEndpoints({ endpoints }, { adapter, setupMapping, transformers })

  const { validate } = ret.list[0]
  t.is(typeof validate, 'function')
  t.deepEqual(validate(badAction), badResponse)
  t.is(validate(okAction), null)
})

test('should setup validate function when no validation', (t) => {
  const endpoints = [
    { match: {} }
  ]
  const badAction = { type: 'GET', payload: { type: 'entries' } }

  const ret = prepareEndpoints({ endpoints }, { adapter, setupMapping })

  const { validate } = ret.list[0]
  t.is(typeof validate, 'function')
  t.is(validate(badAction), null)
})

test('should sort endoints', (t) => {
  const endpoints = [
    { match: {}, options: { no: 1 } },
    { match: { filters: { 'data.attributes.draft': { const: false } } }, options: { no: 2 } },
    { match: { type: 'user' }, options: { no: 3 } }
  ]

  const ret = prepareEndpoints({ endpoints }, { adapter })

  t.is(ret.list[0].options.no, 3)
  t.is(ret.list[1].options.no, 2)
  t.is(ret.list[2].options.no, 1)
})
