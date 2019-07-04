import test from 'ava'
import jsonTransform from '../../tests/helpers/resources/transformers/jsonTransform'

import createResponseMapper from './createResponseMapper'

test('should return null when no mapping', (t) => {
  const endpoint = {}

  const ret = createResponseMapper(endpoint)

  t.is(ret, null)
})

test('should create mapper with path', (t) => {
  const endpoint = { responseMapping: 'content.items' }
  const response = { status: 'ok', data: { content: { items: [{ id: 'ent1', type: 'entry' }] } } }
  const expected = { data: [{ id: 'ent1', type: 'entry' }] }

  const ret = createResponseMapper(endpoint)(response)

  t.deepEqual(ret, expected)
})

test('should create mapper with alternative path', (t) => {
  const endpoint = { responseMapping: {
    'data[]': { path: ['Content.Items', 'content.items'] }
  } }
  const response = { status: 'ok', data: { content: { items: [{ id: 'ent1', type: 'entry' }] } } }
  const expected = { data: [{ id: 'ent1', type: 'entry' }] }

  const ret = createResponseMapper(endpoint)(response)

  t.deepEqual(ret, expected)
})

test('should create mapper with mapping object', (t) => {
  const endpoint = {
    responseMapping: {
      data: 'content.items',
      status: 'content.code',
      'paging.next.offset': 'offset'
    }
  }
  const response = {
    status: 'ok',
    data: {
      content: { items: [{ id: 'ent1', type: 'entry' }], code: 'noaccess' },
      offset: 'page2'
    }
  }
  const expected = {
    status: 'noaccess',
    data: [{ id: 'ent1', type: 'entry' }],
    paging: { next: { offset: 'page2' } }
  }

  const ret = createResponseMapper(endpoint)(response)

  t.deepEqual(ret, expected)
})

test('should create mapper with transform function', (t) => {
  const transformers = { jsonTransform }
  const endpoint = {
    responseMapping: {
      data: {
        path: 'content.items[]',
        transform: 'jsonTransform'
      }
    }
  }
  const response = {
    status: 'ok',
    data: { content: { items: JSON.stringify([{ id: 'ent1', type: 'entry' }]), code: 'ok' } }
  }
  const expected = { data: [{ id: 'ent1', type: 'entry' }] }

  const ret = createResponseMapper(endpoint, { transformers })(response)

  t.deepEqual(ret, expected)
})

test('should create mapper with sub mapping', (t) => {
  const transformers = { jsonTransform }
  const endpoint = {
    responseMapping: {
      data: {
        path: 'content.items[]',
        transform: 'jsonTransform',
        sub: 'inner'
      }
    }
  }
  const response = {
    status: 'ok',
    data: { content: { items: JSON.stringify({ inner: [{ id: 'ent1', type: 'entry' }] }), code: 'ok' } }
  }
  const expected = { data: [{ id: 'ent1', type: 'entry' }] }

  const ret = createResponseMapper(endpoint, { transformers })(response)

  t.deepEqual(ret, expected)
})
