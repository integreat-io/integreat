import test from 'ava'

import createRequestMapper from './createRequestMapper'

test('should create mapper with no mapping', (t) => {
  const endpoint = {}
  const request = { data: [{ id: 'ent1', type: 'entry' }] }
  const expected = [{ id: 'ent1', type: 'entry' }]

  const ret = createRequestMapper(endpoint)(request)

  t.deepEqual(ret, expected)
})

test('should create mapper with requestMapping path', (t) => {
  const endpoint = { requestMapping: 'content.items' }
  const request = {
    data: [{ id: 'ent1', type: 'entry' }]
  }
  const expected = { content: { items: [{ id: 'ent1', type: 'entry' }] } }

  const ret = createRequestMapper(endpoint)(request)

  t.deepEqual(ret, expected)
})

test('should create mapper with requestMapping object', (t) => {
  const endpoint = { requestMapping: { 'meta.section': 'params.section' } }
  const request = {
    data: [{ id: 'ent1', type: 'entry' }],
    params: { section: 'news' }
  }
  const expected = { meta: { section: 'news' } }

  const ret = createRequestMapper(endpoint)(request)

  t.deepEqual(ret, expected)
})
