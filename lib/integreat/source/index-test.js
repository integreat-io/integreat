import test from 'ava'
import sinon from 'sinon'
import json from '../../adapters/json'
import datatype from '../datatype'

import source from '.'

// Helpers

const adapter = {}

const datatypes = {
  entry: datatype({
    id: 'entry',
    attributes: {
      title: {}
    }
  }),
  account: datatype({
    id: 'account',
    attributes: {
      name: {}
    }
  })
}

// Tests

test('should exist', (t) => {
  t.is(typeof source, 'function')
})

test('should return source object with id and adapter', (t) => {
  const adapters = {json: adapter}

  const src = source({id: 'entries', adapter: 'json'}, {adapters})

  t.is(src.id, 'entries')
  t.is(src.adapter, adapter)
})

test('should throw when no id', (t) => {
  const adapters = {json: adapter}

  t.throws(() => {
    source({adapter: 'json'}, {adapters})
  })
})

test('should throw when no adapter', (t) => {
  t.throws(() => {
    source({id: 'entries'})
  })
})

test('should set handleMeta', (t) => {
  const handleMeta = 'store'

  const src = source({id: 'entries', adapter, handleMeta})

  t.is(src.handleMeta, 'store')
})

// Tests -- endpoints

test('should have getEndpoint', (t) => {
  const src = source({id: 'entries', adapter})

  t.is(typeof src.getEndpoint, 'function')
})

test('getEndpoint should expand and return endpoint', (t) => {
  const endpoints = {all: {uri: 'http://api.test/entries{?first,max}'}}
  const src = source({id: 'entries', adapter, endpoints})

  const {uri} = src.getEndpoint('all', {first: 11, max: 20})

  t.is(uri, 'http://api.test/entries?first=11&max=20')
})

test('getEndpoint should support parameter value mapping', (t) => {
  const endpoints = {all: {uri: 'http://api.test/{type|map(entry=entries)}'}}
  const src = source({id: 'entries', adapter, endpoints})
  const params = {type: 'entry'}

  const {uri} = src.getEndpoint('all', params)

  t.is(uri, 'http://api.test/entries')
})

test('getEndpoint should return null for unknown endpoint', (t) => {
  const src = source({id: 'entries', adapter})

  const endpoint = src.getEndpoint('unknown', {first: 11, max: 20})

  t.is(endpoint, null)
})

test('getEndpoint should return endpoint with baseUri', (t) => {
  const baseUri = 'http://some.api/'
  const endpoints = {one: {uri: '{type}:{id}'}}
  const src = source({id: 'entries', adapter, endpoints, baseUri})

  const {uri} = src.getEndpoint('one', {id: 'ent1', type: 'entry'})

  t.is(uri, 'http://some.api/entry:ent1')
})

test('getEndpoint handle the endpoint short form', (t) => {
  const endpoints = {all: 'http://api.test/entries'}
  const src = source({id: 'entries', adapter, endpoints})

  const {uri} = src.getEndpoint('all')

  t.is(uri, 'http://api.test/entries')
})

test('getEndpoint should compile path', (t) => {
  const endpoints = {all: {
    uri: 'http://api.test/entries',
    path: 'items[]'
  }}
  const src = source({id: 'entries', adapter, endpoints})
  const expected = [{prop: 'items', type: 'all', spread: true}]

  const {path} = src.getEndpoint('all')

  t.deepEqual(path, expected)
})

// Tests -- retrieveRaw

test('retrieveRaw should exist', (t) => {
  const src = source({id: 'entries', adapter})

  t.is(typeof src.retrieveRaw, 'function')
})

test('retrieveRaw should retrieve from endpoint through the adapter', async (t) => {
  const uri = 'http://some.api/1.0/'
  const expected = {}
  const retrieve = sinon.stub().resolves(expected)
  const adapter = {retrieve}
  const src = source({id: 'entries', adapter})

  const ret = await src.retrieveRaw({uri})

  t.true(retrieve.calledOnce)
  const request = retrieve.args[0][0]
  t.is(request.uri, uri)
  t.is(ret, expected)
})

test('retrieveRaw should use auth', async (t) => {
  const uri = 'http://some.api/1.0/'
  const oauth = {}
  const auths = {oauth}
  const retrieve = sinon.stub().resolves({})
  const adapter = {retrieve}
  const src = source({id: 'entries', adapter, auth: 'oauth'}, {auths})

  await src.retrieveRaw({uri})

  const request = retrieve.args[0][0]
  t.is(request.uri, uri)
  t.is(request.auth, oauth)
})

test('retrieveRaw should return error when adapter rejects', async (t) => {
  const uri = 'http://some.api/1.0/'
  const retrieve = sinon.stub().returns(Promise.reject(new Error('Fail!')))
  const adapter = {retrieve}
  const src = source({id: 'entries', adapter})

  await t.notThrows(async () => {
    const ret = await src.retrieveRaw({uri})

    t.truthy(ret)
    t.is(ret.status, 'error')
    t.regex(ret.error, /Fail!/)
  })
})

test('retrieveRaw should invoke beforeRetrieve hook', async (t) => {
  const uri = 'http://some.api/1.0/'
  const adapter = {retrieve: async () => ({})}
  const beforeRetrieve = sinon.stub()
  const src = source({id: 'entries', adapter, beforeRetrieve})

  await src.retrieveRaw({uri})

  t.is(beforeRetrieve.callCount, 1)
  const request = beforeRetrieve.args[0][0]
  t.truthy(request)
  t.is(request.uri, uri)
  const resources = beforeRetrieve.args[0][1]
  t.truthy(resources)
  t.is(resources.source, src)
})

test('retrieveRaw should allow beforeRetrieve hook to alter request', async (t) => {
  const uri = 'http://some.api/1.0/'
  const retrieve = sinon.stub().resolves({})
  const adapter = {retrieve}
  const beforeRetrieve = async (request) => {
    request.uri = uri
  }
  const src = source({id: 'entries', adapter, beforeRetrieve})

  await src.retrieveRaw({uri: 'http://other.api/1.0/'})

  t.is(retrieve.callCount, 1)
  const request = retrieve.args[0][0]
  t.is(request.uri, uri)
})

test('retrieveRaw should get beforeRetrieve hook by id', async (t) => {
  const adapter = {retrieve: async () => ({})}
  const hook = sinon.stub()
  const hooks = {hook}
  const src = source({id: 'entries', adapter, beforeRetrieve: 'hook'}, {hooks})

  await src.retrieveRaw({uri: 'http://some.api/1.0/'})

  t.is(hook.callCount, 1)
})

test('retrieveRaw should invoke array of beforeRetrieve hooks by id', async (t) => {
  const adapter = {retrieve: async () => ({})}
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const beforeRetrieve = ['hook1', 'hook2']
  const src = source({id: 'entries', adapter, beforeRetrieve}, {hooks})

  await src.retrieveRaw({uri: 'http://some.api/1.0/'})

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})

test('retrieveRaw should invoke afterRetrieve hook', async (t) => {
  const uri = 'http://some.api/1.0/'
  const response = {}
  const adapter = {retrieve: async () => response}
  const afterRetrieve = sinon.stub()
  const src = source({id: 'entries', adapter, afterRetrieve})

  await src.retrieveRaw({uri})

  t.is(afterRetrieve.callCount, 1)
  t.is(afterRetrieve.args[0][0], response)
  const resources = afterRetrieve.args[0][1]
  t.truthy(resources)
  t.is(resources.source, src)
})

test('retrieveRaw should allow afterRetrieve hook to alter response', async (t) => {
  const uri = 'http://some.api/1.0/'
  const adapter = {retrieve: async () => ({status: 'ok', data: {}})}
  const afterRetrieve = async (response) => {
    response.status = 'error'
    response.data = null
    response.error = 'Some error'
  }
  const src = source({id: 'entries', adapter, afterRetrieve})

  const ret = await src.retrieveRaw({uri})

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.is(ret.data, null)
  t.is(ret.error, 'Some error')
})

test('retrieveRaw should allow afterRetrieve hook to alter error', async (t) => {
  const uri = 'http://some.api/1.0/'
  const adapter = {retrieve: async () => { throw new Error('Badness!') }}
  const afterRetrieve = async (response) => {
    response.status = 'ok'
    response.data = {}
    response.error = null
  }
  const src = source({id: 'entries', adapter, afterRetrieve})

  const ret = await src.retrieveRaw({uri})

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, {})
  t.is(ret.error, null)
})

test('retrieveRaw should get afterRetrieve hook by id', async (t) => {
  const adapter = {retrieve: async () => ({})}
  const hook = sinon.stub()
  const hooks = {hook}
  const src = source({id: 'entries', adapter, afterRetrieve: 'hook'}, {hooks})

  await src.retrieveRaw({uri: 'http://some.api/1.0/'})

  t.is(hook.callCount, 1)
})

test('retrieveRaw should invoke array of afterRetrieve hooks by id', async (t) => {
  const adapter = {retrieve: async () => ({})}
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const afterRetrieve = ['hook1', 'hook2']
  const src = source({id: 'entries', adapter, afterRetrieve}, {hooks})

  await src.retrieveRaw({uri: 'http://some.api/1.0/'})

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})

test('retrieveRaw should make sure request has headers object', async (t) => {
  const uri = 'http://some.api/1.0/'
  const adapter = {retrieve: async () => ({})}
  const beforeRetrieve = sinon.stub()
  const src = source({id: 'entries', adapter, beforeRetrieve})

  await src.retrieveRaw({uri})

  const request = beforeRetrieve.args[0][0]
  t.deepEqual(request.headers, {})
})

// test -- retrieveNormalized

test('retrieveNormalized should exist', (t) => {
  const src = source({id: 'entries', adapter})

  t.is(typeof src.retrieveNormalized, 'function')
})

test('retrieveNormalized should retrieve from endpoint', async (t) => {
  const params = {id: 'ent1', type: 'entry'}
  const endpoints = {one: {uri: 'http://some.api/1.0/{type}:{id}', path: 'item'}}
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {id: 'ent1', type: 'entry'}}})
  const expected = {status: 'ok', data: {id: 'ent1', type: 'entry'}}

  const ret = await src.retrieveNormalized({endpoint: 'one', params})

  t.deepEqual(ret, expected)
})

test('retrieveNormalized should return null when normalize returns null', async (t) => {
  const params = {id: 'ent1', type: 'entry'}
  const endpoints = {one: {uri: 'http://some.api/1.0/{type}:{id}', path: 'item'}}
  const adapter = {
    normalize: async () => null
  }
  const src = source({id: 'entries', endpoints, adapter})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {id: 'ent1', type: 'entry'}}})
  const expected = {status: 'ok', data: null}

  const ret = await src.retrieveNormalized({endpoint: 'one', params})

  t.deepEqual(ret, expected)
})

test('retrieveNormalized should return error from retrieveRaw', async (t) => {
  const params = {id: 'unknown', type: 'entry'}
  const endpoints = {one: {uri: 'http://some.api/1.0/{type}:{id}'}}
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'notfound', error: 'The entry was not found'})

  const ret = await src.retrieveNormalized({endpoint: 'one', params})

  t.deepEqual(ret, {status: 'notfound', error: 'The entry was not found'})
})

test('retrieveNormalized should return error when normalize rejects', async (t) => {
  const data = {}
  const endpoints = {all: {uri: 'http://some.api/1.0'}}
  const adapter = {
    async retrieve () { return {status: 'ok', data} },
    async normalize () { return Promise.reject(new Error('Mistakes!')) }
  }
  const src = source({id: 'entries', endpoints, adapter}, {datatypes})

  await t.notThrows(async () => {
    const ret = await src.retrieveNormalized({endpoint: 'all'})

    t.is(ret.status, 'error')
    t.regex(ret.error, /Mistakes!/)
  })
})

test('retrieveNormalized should invoke afterNormalize hook', async (t) => {
  const params = {id: 'ent1', type: 'entry'}
  const item = {}
  const endpoints = {one: {uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'}}
  const afterNormalize = sinon.stub()
  const src = source({id: 'entries', endpoints, adapter: json, afterNormalize})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item}})

  await src.retrieveNormalized({endpoint: 'one', params})

  t.is(afterNormalize.callCount, 1)
  const response = afterNormalize.args[0][0]
  t.is(response.status, 'ok')
  t.is(response.data, item)
  t.truthy(response)
  const resources = afterNormalize.args[0][1]
  t.truthy(resources)
  t.is(resources.source, src)
})

test('retrieveNormalized should allow afterNormalize hook to alter response', async (t) => {
  const params = {id: 'ent1', type: 'entry'}
  const endpoints = {one: {uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'}}
  const afterNormalize = async (response) => {
    response.status = 'error'
    response.data = null
    response.error = 'Some error'
  }
  const src = source({id: 'entries', endpoints, adapter: json, afterNormalize})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {}}})

  const ret = await src.retrieveNormalized({endpoint: 'one', params})

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.is(ret.data, null)
  t.is(ret.error, 'Some error')
})

test('retrieveNormalized should get afterNormalize hook from id', async (t) => {
  const params = {id: 'ent1', type: 'entry'}
  const endpoints = {one: {uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'}}
  const hook = sinon.stub()
  const hooks = {hook}
  const src = source({id: 'entries', endpoints, adapter: json, afterNormalize: 'hook'}, {hooks})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {}}})

  await src.retrieveNormalized({endpoint: 'one', params})

  t.is(hook.callCount, 1)
})

test('retrieveNormalized should invoke array of afterNormalize hooks from id', async (t) => {
  const params = {id: 'ent1', type: 'entry'}
  const endpoints = {one: {uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'}}
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const afterNormalize = ['hook1', 'hook2']
  const src = source({id: 'entries', endpoints, adapter: json, afterNormalize}, {hooks})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {}}})

  await src.retrieveNormalized({endpoint: 'one', params})

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})

// Tests -- retrieve

test('retrieve should exist', (t) => {
  const src = source({id: 'entries', adapter})

  t.is(typeof src.retrieve, 'function')
})

test('retrieve should retrieve from endpoint', async (t) => {
  const params = {id: 'ent1', type: 'entry'}
  const endpoints = {one: {uri: 'http://some.api/1.0/{type}:{id}'}}
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {}})

  const ret = await src.retrieve({endpoint: 'one', params, type: 'entry'})

  t.is(src.retrieveRaw.callCount, 1)
  const request = src.retrieveRaw.args[0][0]
  t.is(request.uri, 'http://some.api/1.0/entry:ent1')
  t.deepEqual(ret, {status: 'ok', data: []})
})

test('retrieve should return error for non-existing endpoint', async (t) => {
  const src = source({id: 'entries', adapter: {}})
  sinon.stub(src, 'retrieveRaw').resolves({})

  const ret = await src.retrieve({endpoint: 'unknown', type: 'entry'})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('retrieve should return error for missing endpoint params', async (t) => {
  const endpoints = {get: {uri: 'http://some.api/1.0/{type}:{id}'}}
  const src = source({id: 'entries', endpoints, adapter: {}})
  sinon.stub(src, 'retrieveRaw').resolves({})

  const ret = await src.retrieve({endpoint: 'get', type: 'entry'})

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.regex(ret.error, /Missing\srequired\sparameter/)
})

test('retrieve should map data', async (t) => {
  const data = {items: [{key: 'ent1', header: 'The heading'}]}
  const endpoints = {all: {uri: 'http://some.api/1.0'}}
  const mappings = {entry: {
    path: 'items',
    attributes: {id: {path: 'key'}, title: {path: 'header'}}
  }}
  const src = source({id: 'entries', endpoints, mappings, adapter: json}, {datatypes})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})

  const ret = await src.retrieve({endpoint: 'all', type: 'entry'})

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'ent1')
  t.truthy(ret.data[0].attributes)
  t.is(ret.data[0].attributes.title, 'The heading')
})

test('retrieve should map data for several types', async (t) => {
  const data = {
    data: [{id: 'ent1', title: 'The heading'}],
    accounts: [{id: 'acc1', name: 'John'}]
  }
  const mappings = {
    entry: {path: 'data', attributes: {id: {}, title: {}}},
    account: {path: 'accounts', attributes: {id: {}, name: {}}}
  }
  const endpoints = {all: {uri: 'http://some.api/1.0'}}
  const src = source({id: 'entries', endpoints, mappings, adapter: json}, {datatypes})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})

  const ret = await src.retrieve({endpoint: 'all', type: ['entry', 'account']})

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 2)
  const item0 = ret.data[0]
  t.is(item0.id, 'ent1')
  t.truthy(item0.attributes)
  t.is(item0.attributes.title, 'The heading')
  const item1 = ret.data[1]
  t.is(item1.id, 'acc1')
  t.truthy(item1.attributes)
  t.is(item1.attributes.name, 'John')
})

test('retrieve should map from params', async (t) => {
  const data = {data: [{key: 'ent1', header: 'The heading'}]}
  const endpoints = {all: {uri: 'http://some.api/1.0'}}
  const mappings = {entry: {
    path: 'data',
    attributes: {id: {path: 'key'}, title: {param: 'title'}}
  }}
  const src = source({id: 'entries', endpoints, mappings, adapter: json}, {datatypes})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})
  const params = {title: 'Any heading'}

  const ret = await src.retrieve({endpoint: 'all', type: 'entry', params})

  t.is(ret.data[0].id, 'ent1')
  t.is(ret.data[0].attributes.title, 'Any heading')
})

test('retrieve should return empty array when no type', async (t) => {
  const data = {
    data: [{id: 'ent1', title: 'The heading'}]
  }
  const endpoints = {all: {uri: 'http://some.api/1.0'}}
  const src = source({id: 'entries', endpoints, adapter: json}, {datatypes})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})

  const ret = await src.retrieve({endpoint: 'all', type: null})

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 0)
  t.is(src.retrieveRaw.callCount, 0)
})

test('retrieve should return empty array when no data', async (t) => {
  const endpoints = {all: {uri: 'http://some.api/1.0', path: 'rows[]'}}
  const src = source({id: 'entries', endpoints, adapter: json}, {datatypes})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {rows: []}})

  const ret = await src.retrieve({endpoint: 'all', type: ['entry', 'item']})

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 0)
})

test('retrieve should include default values from type', async (t) => {
  const data = {data: [{id: 'ent1', title: 'The title'}]}
  const datatypes = {entry: datatype({
    id: 'entry', attributes: {byline: {default: 'Somebody'}, title: 'string'}
  })}
  const endpoints = {all: {uri: 'http://some.api/1.0'}}
  const mappings = {entry: {path: 'data', attributes: {title: 'title'}}}
  const src = source({id: 'entries', endpoints, mappings, adapter: json}, {datatypes})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})

  const ret = await src.retrieve({endpoint: 'all', type: 'entry', useDefaults: true})

  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.truthy(ret.data[0].attributes)
  t.is(ret.data[0].attributes.byline, 'Somebody')
})

test('retrieve should not include default values', async (t) => {
  const data = {data: [{id: 'ent1'}]}
  const endpoints = {all: {uri: 'http://some.api/1.0'}}
  const mappings = {entry: {path: 'data', attributes: {id: {}}}}
  const datatypes = {entry: datatype({id: 'entry', attributes: {byline: {default: 'Somebody'}}})}
  const src = source({id: 'entries', endpoints, mappings, adapter: json}, {datatypes})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})

  const ret = await src.retrieve({endpoint: 'all', type: 'entry', useDefaults: false})

  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.truthy(ret.data[0].attributes)
  t.is(ret.data[0].attributes.byline, undefined)
})

test('retrieve should use endpoint path', async (t) => {
  const data = {root: {data: [{key: 'ent1'}]}}
  const endpoints = {all: {uri: 'http://some.api/1.0', path: 'root'}}
  const mappings = {entry: {path: 'data', attributes: {id: {path: 'key'}}}}
  const src = source({id: 'entries', endpoints, mappings, adapter: json}, {datatypes})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})

  const ret = await src.retrieve({endpoint: 'all', type: 'entry'})

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'ent1')
})

test('retrieve should return error from retrieveRaw', async (t) => {
  const params = {id: 'unknown', type: 'entry'}
  const endpoints = {one: {uri: 'http://some.api/1.0/{type}:{id}'}}
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'notfound', error: 'The entry was not found'})

  const ret = await src.retrieve({endpoint: 'one', params, type: 'entry'})

  t.deepEqual(ret, {status: 'notfound', error: 'The entry was not found'})
})

// Tests -- sendRaw

test('sendRaw should exist', (t) => {
  const src = source({id: 'entries', adapter})

  t.is(typeof src.sendRaw, 'function')
})

test('sendRaw should send data to endpoint through adapter', async (t) => {
  const uri = 'http://some.api/1.0/'
  const data = {}
  const expected = {}
  const send = sinon.stub().resolves(expected)
  const adapter = {send}
  const src = source({id: 'entries', adapter})

  const ret = await src.sendRaw({uri, data})

  t.true(send.calledOnce)
  const request = send.args[0][0]
  t.is(request.uri, uri)
  t.is(request.data, data)
  t.is(ret, expected)
})

test('sendRaw should use auth', async (t) => {
  const uri = 'http://some.api/1.0/'
  const data = {}
  const auth = {}
  const send = sinon.stub().resolves({})
  const adapter = {send}
  const src = source({id: 'entries', adapter, auth})

  await src.sendRaw({uri, data})

  t.true(send.calledOnce)
  const request = send.args[0][0]
  t.is(request.uri, uri)
  t.is(request.data, data)
  t.is(request.auth, auth)
})

test('sendRaw should return error when adapter rejects', async (t) => {
  const uri = 'http://some.api/1.0/'
  const data = {}
  const send = sinon.stub().returns(Promise.reject(new Error('Fail!')))
  const adapter = {send}
  const src = source({id: 'entries', adapter})

  await t.notThrows(async () => {
    const ret = await src.sendRaw({uri, data})

    t.truthy(ret)
    t.is(ret.status, 'error')
    t.regex(ret.error, /Fail!/)
  })
})

test('sendRaw should send data to endpoint with POST method', async (t) => {
  const send = sinon.stub().resolves({})
  const adapter = {send}
  const src = source({id: 'entries', adapter})
  const uri = 'http://some.api/1.0/'
  const data = {}
  const method = 'POST'

  await src.sendRaw({uri, data, method})

  t.is(send.callCount, 1)
  const request = send.args[0][0]
  t.is(request.method, 'POST')
})

test('sendRaw should invoke beforeSend hook', async (t) => {
  const data = {}
  const uri = 'http://some.api/1.0/'
  const method = 'POST'
  const adapter = {send: async () => ({})}
  const beforeSend = sinon.stub()
  const src = source({id: 'entries', adapter, beforeSend})

  await src.sendRaw({uri, data, method})

  t.is(beforeSend.callCount, 1)
  const request = beforeSend.args[0][0]
  t.truthy(request)
  t.is(request.uri, uri)
  t.is(request.method, method)
  t.is(request.data, data)
  const resources = beforeSend.args[0][1]
  t.truthy(resources)
  t.is(resources.source, src)
})

test('sendRaw should allow beforeSend hook to alter request', async (t) => {
  const data = {}
  const uri = 'http://some.api/1.0/'
  const method = 'POST'
  const send = sinon.stub().resolves({})
  const adapter = {send}
  const beforeSend = async (request) => {
    request.uri = uri
    request.method = method
    request.data = data
  }
  const src = source({id: 'entries', adapter, beforeSend})

  await src.sendRaw({uri: 'http://other.api/1.0', data: {}, method: 'PUT'})

  t.is(send.callCount, 1)
  const request = send.args[0][0]
  t.is(request.uri, uri)
  t.is(request.data, data)
  t.is(request.method, method)
})

test('sendRaw should get beforeSend hook by id', async (t) => {
  const adapter = {send: async () => ({})}
  const hook = sinon.stub()
  const hooks = {hook}
  const src = source({id: 'entries', adapter, beforeSend: 'hook'}, {hooks})

  await src.sendRaw({uri: 'http://some.api/1.0/', data: {}})

  t.is(hook.callCount, 1)
})

test('sendRaw should invoke array of beforeSend hooks by id', async (t) => {
  const adapter = {send: async () => ({})}
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const beforeSend = ['hook1', 'hook2']
  const src = source({id: 'entries', adapter, beforeSend}, {hooks})

  await src.sendRaw({uri: 'http://some.api/1.0/', data: {}})

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})

test('sendRaw should invoke afterSend hook', async (t) => {
  const response = {status: 'ok', data: {}}
  const adapter = {send: async () => response}
  const afterSend = sinon.stub()
  const src = source({id: 'entries', adapter, afterSend})

  await src.sendRaw({uri: 'http://some.api/1.0/', data: {}})

  t.is(afterSend.callCount, 1)
  t.is(afterSend.args[0][0], response)
  const resources = afterSend.args[0][1]
  t.truthy(resources)
  t.is(resources.source, src)
})

test('sendRaw should allow afterSend hook to alter response', async (t) => {
  const adapter = {send: async () => ({status: 'ok', data: {}})}
  const afterSend = async (response) => {
    response.status = 'error'
    response.data = null
    response.error = 'Some error'
  }
  const src = source({id: 'entries', adapter, afterSend})

  const ret = await src.sendRaw({uri: 'http://some.api/1.0/', data: {}})

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.is(ret.data, null)
  t.is(ret.error, 'Some error')
})

test('sendRaw should allow afterSend hook to alter error', async (t) => {
  const adapter = {send: async () => { throw new Error('Badness!') }}
  const afterSend = async (response) => {
    response.status = 'ok'
    response.data = {}
    response.error = null
  }
  const src = source({id: 'entries', adapter, afterSend})

  const ret = await src.sendRaw({uri: 'http://some.api/1.0/', data: {}})

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, {})
  t.is(ret.error, null)
})

test('sendRaw should get afterSend hook by id', async (t) => {
  const adapter = {send: async () => ({})}
  const hook = sinon.stub()
  const hooks = {hook}
  const src = source({id: 'entries', adapter, afterSend: 'hook'}, {hooks})

  await src.sendRaw({uri: 'http://some.api/1.0/', data: {}})

  t.is(hook.callCount, 1)
})

test('sendRaw should invoke array of afterSend hooks by id', async (t) => {
  const adapter = {send: async () => ({})}
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const afterSend = ['hook1', 'hook2']
  const src = source({id: 'entries', adapter, afterSend}, {hooks})

  await src.sendRaw({uri: 'http://some.api/1.0/', data: {}})

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})

test('sendRaw should make sure request has headers object', async (t) => {
  const data = {}
  const uri = 'http://some.api/1.0/'
  const adapter = {send: async () => ({})}
  const beforeSend = sinon.stub()
  const src = source({id: 'entries', adapter, beforeSend})

  await src.sendRaw({uri, data})

  const request = beforeSend.args[0][0]
  t.deepEqual(request.headers, {})
})

// Tests -- sendSerialized

test('sendSerialized should exist', (t) => {
  const src = source({id: 'entries', adapter})

  t.is(typeof src.sendSerialized, 'function')
})

test('sendSerialized should send to endpoint', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const params = {id: 'ent1', type: 'entry'}
  const endpoints = {send: {uri: 'http://some.api/1.0/{type}:{id}', path: 'item'}}
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})
  const expected = {item: {id: 'ent1', type: 'entry'}}

  const ret = await src.sendSerialized({endpoint: 'send', params, data})

  t.is(ret.status, 'ok')
  t.is(src.sendRaw.callCount, 1)
  const request = src.sendRaw.args[0][0]
  t.is(request.uri, 'http://some.api/1.0/entry:ent1')
  t.deepEqual(request.data, expected)
})

test('sendSerialized should send with provided method', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = {send: {uri: 'http://some.api/1.0/_bulk_docs'}}
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  await src.sendSerialized({endpoint: 'send', data, method: 'POST'})

  t.is(src.sendRaw.callCount, 1)
  const request = src.sendRaw.args[0][0]
  t.is(request.method, 'POST')
})

test('sendSerialized should let method from endpoint override', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = {send: {uri: 'http://some.api/1.0/_bulk_docs', method: 'DELETE'}}
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  await src.sendSerialized({endpoint: 'send', data, method: 'POST'})

  t.is(src.sendRaw.callCount, 1)
  const request = src.sendRaw.args[0][0]
  t.is(request.method, 'DELETE')
})

test('sendSerialized should send with method from endpoint', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = {send: {uri: 'http://some.api/1.0/_bulk_docs', method: 'POST'}}
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  await src.sendSerialized({endpoint: 'send', data})

  t.is(src.sendRaw.callCount, 1)
  const request = src.sendRaw.args[0][0]
  t.is(request.method, 'POST')
})

test('sendSerialized should return error for non-existing endpoint', async (t) => {
  const src = source({id: 'entries', adapter: {}})
  sinon.stub(src, 'sendRaw').resolves({status: 'notfound'})

  const ret = await src.sendSerialized({endpoint: 'unknown'})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('sendSerialized should return error for missing endpoint params', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = {send: {uri: 'http://some.api/1.0/{typefolder}/{type}:{id}'}}
  const src = source({id: 'entries', endpoints, adapter: {}})
  sinon.stub(src, 'retrieveRaw').resolves({})

  const ret = await src.sendSerialized({endpoint: 'send', data})

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.regex(ret.error, /Missing\srequired\sparameter/)
})

test('sendSerialized should return error when serialize rejects', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = {send: {uri: 'http://some.api/1.0/entries'}}
  const mappings = {entry: {path: 'data', attributes: {id: {path: 'key'}}}}
  const adapter = {
    async send () { return {status: 'ok'} },
    async serialize () { return Promise.reject(new Error('Mistakes!')) }
  }
  const src = source({id: 'entries', endpoints, mappings, adapter}, {datatypes})

  await t.notThrows(async () => {
    const ret = await src.sendSerialized({endpoint: 'send', data})

    t.is(ret.status, 'error')
    t.regex(ret.error, /Mistakes!/)
  })
})

test('sendSerialized should invoke beforeSerialize hook', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = {send: {uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'}}
  const beforeSerialize = sinon.stub()
  const src = source({id: 'entries', endpoints, adapter: json, beforeSerialize})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  await src.sendSerialized({endpoint: 'send', params: data, data})

  t.is(beforeSerialize.callCount, 1)
  const request = beforeSerialize.args[0][0]
  t.truthy(request)
  t.is(request.uri, 'http://some.api/1.0/entry:ent1')
  t.is(request.method, 'POST')
  t.deepEqual(request.path, ['item'])
  t.is(request.data, data)
  const resources = beforeSerialize.args[0][1]
  t.truthy(resources)
  t.is(resources.source, src)
})

test('sendSerialized should allow beforeSerialize hook to alter request', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = {send: {uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'}}
  const beforeSerialize = async (request) => {
    request.uri = 'http://other.api/1.0/entry:ent1'
    request.data = data
    request.method = 'PUT'
  }
  const src = source({id: 'entries', endpoints, adapter: json, beforeSerialize})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  await src.sendSerialized({endpoint: 'send', params: data, data: {}})

  t.is(src.sendRaw.callCount, 1)
  const request = src.sendRaw.args[0][0]
  t.is(request.uri, 'http://other.api/1.0/entry:ent1')
  t.truthy(request.data)
  t.is(request.data.item, data)
  t.is(request.method, 'PUT')
})

test('sendSerialized should get beforeSerialize hook by id', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = {send: {uri: 'http://some.api/1.0/{type}:{id}'}}
  const hook = sinon.stub()
  const hooks = {hook}
  const src = source({id: 'entries', endpoints, adapter: json, beforeSerialize: 'hook'}, {hooks})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data})

  await src.sendSerialized({endpoint: 'send', params: data, data})

  t.is(hook.callCount, 1)
})

test('sendSerialized should invoke array of beforeSerialize hooks by id', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = {send: {uri: 'http://some.api/1.0/{type}:{id}'}}
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const beforeSerialize = ['hook1', 'hook2']
  const src = source({id: 'entries', endpoints, adapter: json, beforeSerialize}, {hooks})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data})

  await src.sendSerialized({endpoint: 'send', params: data, data})

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})

// Tests -- send

test('send should exist', (t) => {
  const src = source({id: 'entries', adapter})

  t.is(typeof src.send, 'function')
})

test('send should send to endpoint', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const params = {id: 'ent1', type: 'entry'}
  const endpoints = {send: {uri: 'http://some.api/1.0/{type}:{id}'}}
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  const ret = await src.send({endpoint: 'send', params, data, method: 'POST'})

  t.is(src.sendRaw.callCount, 1)
  const request = src.sendRaw.args[0][0]
  t.is(request.uri, 'http://some.api/1.0/entry:ent1')
  t.is(request.method, 'POST')
  t.deepEqual(ret, {status: 'ok', data: {}})
})

test('send should map data', async (t) => {
  const data = {id: 'ent1', type: 'entry', attributes: {title: 'The heading'}}
  const endpoints = {send: {uri: 'http://some.api/1.0/entries'}}
  const mappings = {entry: {
    path: 'data',
    attributes: {id: {path: 'key'}, title: {path: 'header'}}
  }}
  const src = source({id: 'entries', endpoints, mappings, adapter: json}, {datatypes})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  const ret = await src.send({endpoint: 'send', data})

  t.is(src.sendRaw.callCount, 1)
  const request = src.sendRaw.args[0][0]
  t.deepEqual(request.data, {data: {key: 'ent1', header: 'The heading'}})
  t.deepEqual(ret, {status: 'ok', data: {}})
})

test('send should use endpoint path', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = {send: {uri: 'http://some.api/1.0/entries', path: 'root'}}
  const mappings = {entry: {path: 'data', attributes: {id: {path: 'key'}}}}
  const src = source({id: 'entries', endpoints, mappings, adapter: json}, {datatypes})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  await src.send({endpoint: 'send', data})

  t.is(src.sendRaw.callCount, 1)
  const request = src.sendRaw.args[0][0]
  t.deepEqual(request.data, {root: {data: {key: 'ent1'}}})
})

test('send should include default values', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const params = {id: 'ent1', type: 'entry'}
  const endpoints = {send: {uri: 'http://some.api/1.0/{type}:{id}'}}
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})
  sinon.spy(src, 'mapToSource')

  await src.send({endpoint: 'send', params, data, useDefaults: true})

  t.is(src.mapToSource.callCount, 1)
  const options = src.mapToSource.args[0][1]
  t.truthy(options)
  t.true(options.useDefaults)
})
