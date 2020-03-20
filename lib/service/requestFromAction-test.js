import test from 'ava'

import requestFromAction from './requestFromAction'

test('should prepare request', (t) => {
  const action = {
    type: 'SET',
    payload: {
      id: 'johnf',
      type: 'user',
      data: { name: 'John F.' }
    },
    meta: { ident: { id: 'johnf' }, id: '1234567890' }
  }
  const expected = {
    action: 'SET',
    params: {
      id: 'johnf',
      type: 'user'
    },
    data: { name: 'John F.' },
    endpoint: null,
    access: { ident: { id: 'johnf' } },
    meta: {
      id: '1234567890',
      typePlural: 'users'
    }
  }

  const ret = requestFromAction(action)

  t.deepEqual(ret, expected)
})

test('should set typePlural from plurals dictionary', (t) => {
  const action = { type: 'GET', payload: { id: 'ent1', type: 'entry' } }
  const schemas = { entry: { plural: 'entries' } }

  const ret = requestFromAction(action, { schemas })

  t.is(ret.meta.typePlural, 'entries')
})
