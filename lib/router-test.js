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

test('should get with GET action', async (t) => {
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
  t.pass()
})

test('should get all with GET_ALL action', async (t) => {
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

test('should set with SET_NOW action', async (t) => {
  const action = {
    type: 'SET_NOW',
    payload: {id: 'ent1', type: 'entry', source: 'entries'}
  }
  const source = {
    getEndpointSend: () => 'http://api1.test/database/entry:ent1',
    sendItems: async () => ({status: 200, data: {okay: true, id: 'ent1', rev: '000001'}})
  }
  const sources = new Sources()
  sources.set('entries', source)

  const ret = await router(action, sources)

  t.truthy(ret)
  t.is(ret.status, 200)
})

test('should set with SET action', async (t) => {
  const action = {
    type: 'SET',
    payload: {id: 'ent1', type: 'entry', source: 'entries'}
  }
  const source = {
    getEndpointSend: () => 'http://api1.test/database/entry:ent1',
    sendItems: async () => ({status: 200, data: {okay: true, id: 'ent1', rev: '000001'}})
  }
  const sources = new Sources()
  sources.set('entries', source)

  const ret = await router(action, sources)

  t.truthy(ret)
  t.is(ret.status, 200)
})
