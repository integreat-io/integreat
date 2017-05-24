import test from 'ava'

import router from './router'

test('should exist', (t) => {
  t.is(typeof router, 'function')
})

test('should return null when no action', async (t) => {
  const action = null
  const sources = {}

  const ret = await router(action, sources)

  t.is(ret, null)
})

test('should return null when unknown action', async (t) => {
  const action = {type: 'UNKNOWN', source: 'entries'}
  const sources = {}

  const ret = await router(action, sources)

  t.is(ret, null)
})

test('should get with GET action', async (t) => {
  const items = [{id: 'ent1', type: 'entry'}]
  const action = {
    type: 'GET',
    source: 'entries',
    payload: {id: 'ent1', type: 'entry'}
  }
  const source = {
    getEndpoint: (key) => (key === 'one') ? 'http://api.test/database/entry:ent1' : null,
    fetchItems: async () => items
  }
  const sources = {entries: source}

  const ret = await router(action, sources)

  t.deepEqual(ret, items)
})

test('should get source from type', async (t) => {
  const items = [{id: 'ent1', type: 'entry'}]
  const action = {
    type: 'GET',
    payload: {id: 'ent1', type: 'entry'}
  }
  const source = {
    getEndpoint: (key) => (key === 'one') ? 'http://api.test/database/entry:ent1' : null,
    fetchItems: async () => items
  }
  const type = {
    id: 'entry',
    source: 'entries'
  }
  const sources = {entries: source}
  const types = {entry: type}

  const ret = await router(action, sources, types)

  t.deepEqual(ret, items)
})

test('should get all with GET_ALL action', async (t) => {
  const items = [{id: 'ent1', type: 'entry'}]
  const action = {
    type: 'GET_ALL',
    source: 'entries',
    payload: {id: 'ent1', type: 'entry'}
  }
  const source = {
    getEndpoint: (key) => (key === 'all') ? 'http://api.test/database' : null,
    fetchItems: async () => items
  }
  const sources = {entries: source}

  const ret = await router(action, sources)

  t.deepEqual(ret, items)
})

test('should set with SET_NOW action', async (t) => {
  const action = {
    type: 'SET_NOW',
    source: 'entries',
    payload: {id: 'ent1', type: 'entry'}
  }
  const source = {
    getEndpoint: (key) => (key === 'send') ? 'http://api1.test/database/entry:ent1' : null,
    sendItems: async () => ({status: 200, data: {okay: true, id: 'ent1', rev: '000001'}})
  }
  const sources = {entries: source}

  const ret = await router(action, sources)

  t.truthy(ret)
  t.is(ret.status, 200)
})

test('should set with SET action', async (t) => {
  const action = {
    type: 'SET',
    source: 'entries',
    payload: {id: 'ent1', type: 'entry'}
  }
  const source = {
    getEndpoint: (key) => (key === 'send') ? 'http://api1.test/database/entry:ent1' : null,
    sendItems: async () => ({status: 200, data: {okay: true, id: 'ent1', rev: '000001'}})
  }
  const sources = {entries: source}

  const ret = await router(action, sources)

  t.truthy(ret)
  t.is(ret.status, 200)
})
