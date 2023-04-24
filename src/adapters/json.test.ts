import test from 'ava'

import json from './json.js'

// Setup

const options = {}

// Tests -- prepareOptions

test('should prepare empty options', (t) => {
  const options = {}
  const expected = { includeHeaders: false }

  const ret = json.prepareOptions(options, 'api')

  t.deepEqual(ret, expected)
})

test('should only keep known options', (t) => {
  const options = { includeHeaders: true, dontKnow: 'whatthisis' }
  const expected = { includeHeaders: true }

  const ret = json.prepareOptions(options, 'api')

  t.deepEqual(ret, expected)
})

// Tests -- normalize

test('should normalize json string data in response', async (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    response: { status: 'ok', data: '[{"id":"ent1","title":"Entry 1"}]' },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    type: 'GET',
    payload: { type: 'entry' },
    response: { status: 'ok', data: [{ id: 'ent1', title: 'Entry 1' }] },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await json.normalize(action, options)

  t.deepEqual(ret, expected)
})

test('should normalize json string data in payload', async (t) => {
  const action = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: '[{"id":"ent1","title":"Entry 1"}]',
      sourceService: 'api',
    },
    meta: { ident: { id: 'anonymous' } },
  }
  const expected = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: [{ id: 'ent1', title: 'Entry 1' }],
      sourceService: 'api',
    },
    meta: { ident: { id: 'anonymous' } },
  }

  const ret = await json.normalize(action, options)

  t.deepEqual(ret, expected)
})

test('should return error when parsing response data fails', async (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    response: { status: 'ok', data: 'Not JSON' },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    type: 'GET',
    payload: { type: 'entry' },
    response: {
      status: 'badresponse',
      error: 'Response data was not valid JSON',
      data: 'Not JSON',
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await json.normalize(action, options)

  t.deepEqual(ret, expected)
})

test('should return error when parsing payload data fails', async (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'entry', data: 'Not JSON' },
    response: { status: 'ok' },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    type: 'GET',
    payload: { type: 'entry', data: 'Not JSON' },
    response: {
      status: 'badrequest',
      error: 'Payload data was not valid JSON',
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await json.normalize(action, options)

  t.deepEqual(ret, expected)
})

// Tests -- serialize

test('should serialize data in response', async (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'entry', sourceService: 'api' },
    response: { status: 'ok', data: [{ id: 'ent1', title: 'Entry 1' }] },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    type: 'GET',
    payload: { type: 'entry', sourceService: 'api' },
    response: { status: 'ok', data: '[{"id":"ent1","title":"Entry 1"}]' },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await json.serialize(action, options)

  t.deepEqual(ret, expected)
})

test('should serialize data in payload', async (t) => {
  const action = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: [{ id: 'ent1', title: 'Entry 1' }],
    },
    meta: { ident: { id: 'anonymous' } },
  }
  const expected = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: '[{"id":"ent1","title":"Entry 1"}]',
    },
    meta: { ident: { id: 'anonymous' } },
  }

  const ret = await json.serialize(action, options)

  t.deepEqual(ret, expected)
})

test('should not serialize null or undefined', async (t) => {
  const action = {
    type: 'GET',
    payload: { type: 'entry', data: null },
    response: { status: 'ok', data: undefined },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    type: 'GET',
    payload: { type: 'entry', data: null },
    response: { status: 'ok', data: undefined },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await json.serialize(action, options)

  t.deepEqual(ret, expected)
})

test('should include JSON headers', async (t) => {
  const options = { includeHeaders: true }
  const action = {
    type: 'GET',
    payload: { type: 'entry', sourceService: 'api' },
    response: { status: 'ok', data: [{ id: 'ent1', title: 'Entry 1' }] },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    type: 'GET',
    payload: { type: 'entry', sourceService: 'api' },
    response: { status: 'ok', data: '[{"id":"ent1","title":"Entry 1"}]' },
    meta: {
      ident: { id: 'johnf' },
      headers: {
        'Content-Type': 'application/json',
      },
    },
  }

  const ret = await json.serialize(action, options)

  t.deepEqual(ret, expected)
})
