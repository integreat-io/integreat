import test from 'ava'

import prepareEndpoints from '.'

// Setup

const adapter = {
  prepareEndpoint: (options, serviceOptions) => ({
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

test('should prepare endpoints with options', t => {
  const endpoints = [{ match: {}, options: { uri: 'http://some.api/1.0' } }]
  const serviceOptions = { version: '2.1' }
  const expectedOptions = { uri: 'http://some.api/1.0', version: '2.1' }

  const ret = prepareEndpoints(
    { endpoints, options: serviceOptions },
    { adapter }
  )

  t.truthy(ret.list)
  t.deepEqual(ret.list[0].options, expectedOptions)
})

test('should not prepare incoming endpoints with adapter', t => {
  const endpoints = [
    { match: {}, incoming: true, options: { uri: 'http://some.api/1.0' } }
  ]
  const serviceOptions = { version: '2.1' }
  const expectedOptions = { uri: 'http://some.api/1.0' }

  const ret = prepareEndpoints(
    { endpoints, options: serviceOptions },
    { adapter }
  )

  t.truthy(ret.list)
  t.deepEqual(ret.list[0].options, expectedOptions)
})

test('should prepare filters', t => {
  const endpoints = [
    {
      match: { filters: { 'data.draft': { const: false } } },
      options: {}
    }
  ]
  const validData = { data: { draft: false } }

  const ret = prepareEndpoints({ endpoints }, { adapter })

  t.true(Array.isArray(ret.list[0].match.filters))
  t.is(ret.list[0].match.filters.length, 1)
  t.true(ret.list[0].match.filters[0](validData))
})

test('should setup mappings from endpoint', t => {
  const serviceDef = {
    endpoints: [
      { match: {}, options: {}, mappings: { entry: 'entries-entry' } }
    ]
  }
  const response = { data: { key: 'ent1' } }
  const expected = { id: 'ent1', type: 'entry' }

  const ret = prepareEndpoints(serviceDef, { adapter, mapOptions })

  const mapper = ret.list[0].mappings.entry
  t.is(typeof mapper, 'function')
  t.deepEqual(mapper(response), expected)
})

test('should setup mappings from service', t => {
  const serviceDef = {
    endpoints: [{ match: {}, options: {} }],
    mappings: { entry: 'entries-entry' }
  }
  const response = { data: { key: 'ent1' } }
  const expected = { id: 'ent1', type: 'entry' }

  const ret = prepareEndpoints(serviceDef, { adapter, mapOptions })

  const mapper = ret.list[0].mappings.entry
  t.is(typeof mapper, 'function')
  t.deepEqual(mapper(response), expected)
})

test('should combine mappings from endpoint and service', t => {
  const serviceDef = {
    endpoints: [
      {
        match: {},
        options: {},
        mappings: { entry: 'entries-entry', user: 'accounts-user' }
      }
    ],
    mappings: { user: 'users-user' }
  }
  const entryData = { data: { key: 'ent1' } }
  const accountData = { data: { accountId: 'johnf' } }

  const ret = prepareEndpoints(serviceDef, { adapter, mapOptions })

  const entryMapper = ret.list[0].mappings.entry
  const userMapper = ret.list[0].mappings.user
  t.is(entryMapper(entryData).id, 'ent1')
  t.is(userMapper(accountData).id, 'johnf')
})

test('should setup validate function', t => {
  const badResponse = { status: 'badrequest', error: 'No token' }
  const transformers = {
    alwaysOk: () => null,
    shouldHaveToken: action => (action.payload.token ? null : badResponse)
  }
  const endpoints = [{ match: {}, validate: ['alwaysOk', 'shouldHaveToken'] }]
  const badAction = { type: 'GET', payload: { type: 'entries' } }
  const okAction = {
    type: 'GET',
    payload: { type: 'entries', token: 's0m3th1ng' }
  }

  const ret = prepareEndpoints(
    { endpoints },
    { adapter, mapOptions, transformers }
  )

  const { validate } = ret.list[0]
  t.is(typeof validate, 'function')
  t.deepEqual(validate(badAction), badResponse)
  t.is(validate(okAction), null)
})

test('should setup validate function when no validation', t => {
  const endpoints = [{ match: {} }]
  const badAction = { type: 'GET', payload: { type: 'entries' } }

  const ret = prepareEndpoints({ endpoints }, { adapter, mapOptions })

  const { validate } = ret.list[0]
  t.is(typeof validate, 'function')
  t.is(validate(badAction), null)
})

test('should sort endoints', t => {
  const endpoints = [
    { match: {}, options: { no: 1 } },
    {
      match: { filters: { 'data.draft': { const: false } } },
      options: { no: 2 }
    },
    { match: { type: 'user' }, options: { no: 3 } }
  ]

  const ret = prepareEndpoints({ endpoints }, { adapter })

  t.is(ret.list[0].options.no, 3)
  t.is(ret.list[1].options.no, 2)
  t.is(ret.list[2].options.no, 1)
})
