import test from 'ava'

import createResponseMapper from './createResponseMapper'

test('should create mapper with no mapping', (t) => {
  const endpoint = {}
  const response = { status: 'ok', data: [{ id: 'ent1', type: 'entry' }] }
  const expected = { data: [{ id: 'ent1', type: 'entry' }] }

  const ret = createResponseMapper(endpoint)(response)

  t.deepEqual(ret, expected)
})

test('should create mapper with path', (t) => {
  const endpoint = { responseMapping: 'content.items' }
  const response = { status: 'ok', data: { content: { items: [{ id: 'ent1', type: 'entry' }] } } }
  const expected = { data: [{ id: 'ent1', type: 'entry' }] }

  const ret = createResponseMapper(endpoint)(response)

  t.deepEqual(ret, expected)
})

test('should create mapper with mapping object', (t) => {
  const endpoint = {
    responseMapping: {
      data: 'content.items',
      status: 'content.code'
    }
  }
  const response = {
    status: 'ok',
    data: { content: { items: [{ id: 'ent1', type: 'entry' }], code: 'ok' } }
  }
  const expected = { data: [{ id: 'ent1', type: 'entry' }], status: 'ok' }

  const ret = createResponseMapper(endpoint)(response)

  t.deepEqual(ret, expected)
})
