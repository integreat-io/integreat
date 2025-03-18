import test from 'node:test'
import assert from 'node:assert/strict'

import { prepareOptions, mergeOptions } from './options.js'

// Tests -- prepareOptions

test('should move top-level options into transporter options', () => {
  const options = { uri: 'https://api.test/v1' }
  const expected = { transporter: { uri: 'https://api.test/v1' } }

  const ret = prepareOptions(options)

  assert.deepEqual(ret, expected)
})

test('should move top-level incoming options into transporter incoming options', () => {
  const options = {
    uri: 'https://api.test/v1',
    port: 3000,
    incoming: { port: 3001 },
  }
  const expected = {
    transporter: {
      uri: 'https://api.test/v1',
      port: 3000,
      incoming: { port: 3001 },
    },
  }

  const ret = prepareOptions(options)

  assert.deepEqual(ret, expected)
})

test('should merge top-level incoming options into transporter incoming options', () => {
  const options = {
    uri: 'https://api.test/v1',
    port: 3000,
    incoming: { port: 3002, host: '0.0.0.0' },
    transporter: { incoming: { port: 3001 } },
  }
  const expected = {
    transporter: {
      uri: 'https://api.test/v1',
      port: 3000,
      incoming: { port: 3001, host: '0.0.0.0' },
    },
  }

  const ret = prepareOptions(options)

  assert.deepEqual(ret, expected)
})

test('should merge top-level options and transporter options', () => {
  const options = {
    uri: 'https://api.test/v1',
    transporter: { method: 'POST' },
  }
  const expected = {
    transporter: { uri: 'https://api.test/v1', method: 'POST' },
  }

  const ret = prepareOptions(options)

  assert.deepEqual(ret, expected)
})

test('should keep most specific options on conflict', () => {
  const options = {
    uri: 'https://api.test/v1',
    method: 'GET',
    headers: { 'content-type': 'plain/text' },
    queryParams: { archive: false },
    incoming: { port: 3002, host: '0.0.0.0' },
    transporter: {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      queryParams: { archive: true },
      incoming: { port: 3001 },
    },
  }
  const expected = {
    transporter: {
      uri: 'https://api.test/v1',
      method: 'POST',
      queryParams: { archive: true },
      headers: { 'content-type': 'application/json' },
      incoming: { port: 3001, host: '0.0.0.0' },
    },
  }

  const ret = prepareOptions(options)

  assert.deepEqual(ret, expected)
})

test('should also merge top-level options with adapter options', () => {
  const options = {
    uri: 'https://api.test/v1',
    adapters: {
      xml: {
        namespaces: { '': 'http://our.com/namespace' },
      },
    },
  }
  const expected = {
    transporter: { uri: 'https://api.test/v1' },
    adapters: {
      xml: {
        namespaces: { '': 'http://our.com/namespace' },
        uri: 'https://api.test/v1',
      },
    },
  }

  const ret = prepareOptions(options)

  assert.deepEqual(ret, expected)
})

// Tests -- mergeOptions

test('should merge transporter options on two option objects', () => {
  const options1 = {
    transporter: {
      method: 'POST',
      uri: 'https://api.test/v1',
      incoming: { port: 3000 },
    },
  }
  const options2 = {
    transporter: {
      method: 'PUT',
      incoming: { port: 3001, host: '0.0.0.0' },
    },
  }
  const expected = {
    transporter: {
      method: 'PUT',
      uri: 'https://api.test/v1',
      incoming: { port: 3001, host: '0.0.0.0' },
    },
  }

  const ret = mergeOptions(options1, options2)

  assert.deepEqual(ret, expected)
})

test('should merge adapter options on two options objects', () => {
  const options1 = {
    transporter: {
      method: 'POST',
      uri: 'https://api.test/v1',
    },
    adapters: {
      xml: {
        uri: 'https://api.test/v1',
        namespaces: {
          '': 'http://their.com/namespace',
          s: 'http://soap.something',
        },
      },
      uri: { uri: 'https://api.test/v1' },
    },
  }
  const options2 = {
    transporter: {
      method: 'PUT',
      incoming: { port: 3001, host: '0.0.0.0' },
    },
    adapters: {
      xml: { namespaces: { '': 'http://our.com/namespace' } },
    },
  }
  const expected = {
    transporter: {
      method: 'PUT',
      uri: 'https://api.test/v1',
      incoming: { port: 3001, host: '0.0.0.0' },
    },
    adapters: {
      xml: {
        uri: 'https://api.test/v1',
        namespaces: { '': 'http://our.com/namespace' },
      },
      uri: { uri: 'https://api.test/v1' },
    },
  }

  const ret = mergeOptions(options1, options2)

  assert.deepEqual(ret, expected)
})

test('should deep clone objects', () => {
  const options1 = {
    transporter: {
      method: 'POST',
      uri: 'https://api.test/v1',
      incoming: { port: 3000, auth: { username: 'johnf' } },
    },
    adapters: {
      xml: { namespaces: { '': 'http://our.com/namespace' } },
    },
  }
  const options2 = {
    transporter: {
      method: 'PUT',
      queryParams: { archived: true },
    },
    adapters: {
      xml: { uri: 'https://api.test/v1' },
    },
  }
  const expected = {
    transporter: {
      method: 'PUT',
      uri: 'https://api.test/v1',
      queryParams: { archived: true },
      incoming: { port: 3000, auth: { username: 'johnf' } },
    },
    adapters: {
      xml: {
        uri: 'https://api.test/v1',
        namespaces: { '': 'http://our.com/namespace' },
      },
    },
  }

  const ret = mergeOptions(options1, options2)

  const queryParams = ret.transporter.queryParams as Record<string, unknown>
  const namespaces = ret.adapters?.xml.namespaces as Record<string, unknown>
  const auth = (ret.transporter.incoming as Record<string, unknown>)
    .auth as Record<string, unknown>

  assert.deepEqual(ret, expected)
  queryParams.archived = false
  namespaces.s = 'http://soap.something'
  auth.username = 'kathyt'
  assert.equal(options2.transporter.queryParams.archived, true) // Should not have changed
  assert.equal(
    !!(options1.adapters.xml.namespaces as Record<string, unknown>).s,
    false,
  ) // Should not have been set
  assert.equal(options1.transporter.incoming.auth.username, 'johnf') // Should not have changed
})
