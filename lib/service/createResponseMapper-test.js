import test from 'ava'

import createResponseMapper from './createResponseMapper'

test('should create mapper with no mapping', (t) => {
  const endpoint = {}
  const response = {status: 'ok', data: [{id: 'ent1', type: 'entry'}]}
  const expected = [{id: 'ent1', type: 'entry'}]

  const ret = createResponseMapper(endpoint)(response)

  t.deepEqual(ret, expected)
})

test('should create mapper with responsePath', (t) => {
  const endpoint = {responsePath: 'content.items'}
  const response = {status: 'ok', data: {content: {items: [{id: 'ent1', type: 'entry'}]}}}
  const expected = [{id: 'ent1', type: 'entry'}]

  const ret = createResponseMapper(endpoint)(response)

  t.deepEqual(ret, expected)
})
