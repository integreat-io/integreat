import test from 'ava'

import prepareEndpoints from '.'

// Setup

const adapter = { prepareEndpoint: (options, serviceOptions) => ({ ...options, ...serviceOptions }) }

// Tests

test('should prepare endpoints with options', (t) => {
  const endpoints = [
    { match: {}, options: { uri: 'http://some.api/1.0' } }
  ]
  const serviceOptions = { version: '2.1' }
  const expectedOptions = { uri: 'http://some.api/1.0', version: '2.1' }

  const ret = prepareEndpoints(endpoints, adapter, {}, serviceOptions)

  t.truthy(ret.list)
  t.deepEqual(ret.list[0].options, expectedOptions)
})

test('should prepare filters', (t) => {
  const endpoints = [
    { match: { filters: { 'data.attributes.draft': { const: false } } }, options: {} }
  ]
  const validData = { data: { attributes: { draft: false } } }

  const ret = prepareEndpoints(endpoints, adapter, {}, {})

  t.true(Array.isArray(ret.list[0].match.filters))
  t.is(ret.list[0].match.filters.length, 1)
  t.true(ret.list[0].match.filters[0](validData))
})

test('should sort endoints', (t) => {
  const endpoints = [
    { match: {}, options: { no: 1 } },
    { match: { filters: { 'data.attributes.draft': { const: false } } }, options: { no: 2 } },
    { match: { type: 'user' }, options: { no: 3 } }
  ]

  const ret = prepareEndpoints(endpoints, adapter, {}, {})

  t.is(ret.list[0].options.no, 3)
  t.is(ret.list[1].options.no, 2)
  t.is(ret.list[2].options.no, 1)
})
