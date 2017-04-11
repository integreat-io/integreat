import test from 'ava'

import actionHandler from './actionHandler'

test('should exist', (t) => {
  t.is(typeof actionHandler, 'function')
})

test('should return null when no action', async (t) => {
  const action = null
  const sources = {get: () => null}

  const ret = await actionHandler(action, sources)

  t.is(ret, null)
})

test('should not throw', (t) => {
  const action = {
    type: 'GET',
    payload: {id: 'ent1', type: 'entry', source: 'entries'}
  }
  const sources = {get: () => { throw new Error('Small catastrophy in the source!') }}

  t.notThrows(async () => {
    await actionHandler(action, sources)
  })
})

test('should get with get action', async (t) => {
  const items = [{id: 'ent1', type: 'entry'}]
  const action = {
    type: 'GET',
    payload: {id: 'ent1', type: 'entry', source: 'entries'}
  }
  const source = {
    getEndpointOne: () => 'http://api.test/database/entry:ent1',
    fetchItems: async () => items
  }
  const sources = {get: (src) => (src === 'entries') ? source : null}

  const ret = await actionHandler(action, sources)

  t.deepEqual(ret, items)
})
