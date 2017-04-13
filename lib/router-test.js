import test from 'ava'
import Sources from './sources'

import router from './router'

test('should exist', (t) => {
  t.is(typeof router, 'function')
})

test('should return null when no action', async (t) => {
  const action = null
  const sources = {get: () => null}

  const ret = await router(action, sources)

  t.is(ret, null)
})

test('should return null when unknown action', async (t) => {
  const action = {type: 'UNKNOWN'}
  const sources = {get: () => null}

  const ret = await router(action, sources)

  t.is(ret, null)
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
  const sources = new Sources()
  sources.set('entries', source)

  const ret = await router(action, sources)

  t.deepEqual(ret, items)
})

test('should get add source to payload', async (t) => {
  const items = [{id: 'ent1', type: 'entry'}]
  const action = {
    type: 'GET',
    payload: {id: 'ent1', type: 'entry'}
  }
  const source = {
    getEndpointOne: () => 'http://api.test/database/entry:ent1',
    fetchItems: async () => items
  }
  const sources = new Sources()
  sources.set('entries', source)
  sources.types.set('entry', 'entries')

  const ret = await router(action, sources)

  t.deepEqual(ret, items)
})

test('should not throw', async (t) => {
  const action = {
    type: 'GET',
    payload: {id: 'ent1', type: 'entry', source: 'entries'}
  }
  const source = {
    getEndpointOne: () => 'http://api.test/database/entry:ent1',
    fetchItems: async () => { throw new Error('Small catastrophy in the source!') }
  }
  const sources = new Sources()
  sources.set('entries', source)

  try {
    await router(action, sources)
  } catch (err) {
    t.fail()
  }
})

test('should get all with get all action', async (t) => {
  const items = [{id: 'ent1', type: 'entry'}]
  const action = {
    type: 'GET_ALL',
    payload: {id: 'ent1', type: 'entry', source: 'entries'}
  }
  const source = {
    getEndpointAll: () => 'http://api.test/database',
    fetchItems: async () => items
  }
  const sources = new Sources()
  sources.set('entries', source)

  const ret = await router(action, sources)

  t.deepEqual(ret, items)
})
