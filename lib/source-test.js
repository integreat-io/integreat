import test from 'ava'
import sinon from 'sinon'
import json from './adapters/json'
import datatype from './datatype'
import setupMapping from './mapping'
import createEndpoint from '../tests/helpers/createEndpoint'

import source from './source'

// Helpers

const datatypes = {
  entry: datatype({
    id: 'entry',
    plural: 'entries',
    attributes: {
      title: 'string'
    }
  }),
  account: datatype({
    id: 'account',
    attributes: {
      name: 'string'
    }
  }),
  item: datatype({
    id: 'item',
    attributes: {
      title: 'string'
    }
  })
}

const mappings = [
  setupMapping(
    {
      type: 'entry',
      source: 'entries',
      path: 'items',
      attributes: {id: {path: 'key'}, title: {path: 'header'}}
    },
    {datatypes}
  ),
  setupMapping(
    {type: 'item', source: 'entries'},
    {datatypes}
  )
]

// Tests

test('should exist', (t) => {
  t.is(typeof source, 'function')
})

test('should return source object with id, adapter, endpoints, and meta', (t) => {
  const endpoints = [createEndpoint({id: 'endpoint1', uri: 'http://some.api/1.0'})]
  const def = {id: 'entries', adapter: 'json', endpoints, meta: 'meta'}
  const adapters = {json}

  const src = source(def, {adapters})

  t.is(src.id, 'entries')
  t.is(src.adapter, json)
  t.is(src.endpoints.length, 1)
  t.is(src.endpoints[0].id, 'endpoint1')
  t.is(src.meta, 'meta')
})

test('should throw when no id', (t) => {
  const adapters = {json}

  t.throws(() => {
    source({adapter: 'json'}, {adapters})
  })
})

test('should throw when no adapter', (t) => {
  t.throws(() => {
    source({id: 'entries'})
  })
})

// Tests -- prepareRequest

test('prepareRequest should exist', (t) => {
  const src = source({id: 'entries', adapter: json})

  t.is(typeof src.prepareRequest, 'function')
})

test('prepareRequest should keep request props', (t) => {
  const data = {}
  const headers = {}
  const auth = {}
  const request = {
    action: 'SET',
    id: 'ent1',
    type: 'entry',
    method: 'PATCH',
    data,
    headers,
    auth
  }
  const src = source({id: 'entries', adapter: json})

  const ret = src.prepareRequest(request)

  t.truthy(ret)
  t.is(ret.action, 'SET')
  t.is(ret.id, 'ent1')
  t.is(ret.type, 'entry')
  t.is(ret.method, 'PATCH')
  t.is(ret.data, data)
  t.is(ret.headers, headers)
  t.is(ret.auth, auth)
})

test('prepareRequest should make sure request have headers object', (t) => {
  const request = {action: 'SET'}
  const src = source({id: 'entries', adapter: json})

  const ret = src.prepareRequest(request)

  t.deepEqual(ret.headers, {})
})

test('prepareRequest should pass on uri prop', (t) => {
  const request = {uri: 'http://api.example.com/1.0'}
  const src = source({id: 'entries', adapter: json})

  const ret = src.prepareRequest(request)

  t.is(ret.uri, 'http://api.example.com/1.0')
})

test('prepareRequest should set auth', (t) => {
  const oauth = {}
  const auths = {oauth}
  const request = {action: 'SET'}
  const src = source({id: 'entries', adapter: json, auth: 'oauth'}, {auths})

  const ret = src.prepareRequest(request)

  t.is(ret.auth, oauth)
})

test('prepareRequest should set id and type from data when not set on request', (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const request = {action: 'SET', data}
  const src = source({id: 'entries', adapter: json})

  const ret = src.prepareRequest(request)

  t.is(ret.id, 'ent1')
  t.is(ret.type, 'entry')
})

test('prepareRequest should not set id and type from array of data', (t) => {
  const data = [{id: 'ent1', type: 'entry'}]
  const request = {action: 'SET', data}
  const src = source({id: 'entries', adapter: json})

  const ret = src.prepareRequest(request)

  t.is(ret.id, undefined)
  t.is(ret.type, undefined)
})

test('prepareRequest should add endpoint to request', (t) => {
  const request = {action: 'GET', id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  const expected = {uri: ['http://some.api/1.0'], method: null, path: null, body: null}

  const ret = src.prepareRequest(request)

  t.deepEqual(ret.endpoint, expected)
})

test('prepareRequest should add endpoint with id', (t) => {
  const request = {action: 'GET', id: 'ent1', type: 'entry', endpoint: 'one'}
  const endpoints = [
    createEndpoint({uri: 'http://wrong.api/1.0', action: 'GET'}),
    createEndpoint({uri: 'http://right.api/1.0', id: 'one'})
  ]
  const src = source({id: 'entries', endpoints, adapter: json})

  const ret = src.prepareRequest(request)

  t.is(typeof ret.endpoint, 'object')
  t.deepEqual(ret.endpoint.uri, ['http://right.api/1.0'])
})

test('prepareRequest should set endpoint to undefined on no match', (t) => {
  const request = {action: 'GET', id: 'ent1', type: 'entry'}
  const endpoints = []
  const src = source({id: 'entries', endpoints, adapter: json})

  const ret = src.prepareRequest(request)

  t.is(ret.endpoint, undefined)
})

test('prepareRequest should set method from endpoint', (t) => {
  const request = {action: 'GET', id: 'ent1', type: 'entry', method: 'GET'}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0', method: 'POST'})]
  const src = source({id: 'entries', endpoints, adapter: json})

  const ret = src.prepareRequest(request)

  t.is(ret.method, 'POST')
})

test('prepareRequest should prepare params on request', (t) => {
  const request = {action: 'GET', id: 'ent1', type: 'entry', method: 'GET', params: {first: 20}}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0', id: 'one'})]
  const src = source({id: 'entries', endpoints, adapter: json}, {datatypes})
  const expected = {
    $action: 'GET',
    $method: 'GET',
    $source: 'entries',
    type: 'entry',
    typePlural: 'entries',
    id: 'ent1',
    first: 20
  }

  const ret = src.prepareRequest(request)

  t.deepEqual(ret.params, expected)
})

test('prepareRequest should set typePlural without datatype.plural', (t) => {
  const request = {action: 'GET', id: 'acc1', type: 'account'}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0'})]
  const src = source({id: 'accounts', endpoints, adapter: json}, {datatypes})

  const ret = src.prepareRequest(request)

  t.is(ret.params.typePlural, 'accounts')
})

// Tests -- retrieveRaw

test('retrieveRaw should exist', (t) => {
  const src = source({id: 'entries', adapter: json})

  t.is(typeof src.retrieveRaw, 'function')
})

test('retrieveRaw should retrieve from endpoint through the adapter', async (t) => {
  const response = {}
  const send = sinon.stub().resolves(response)
  const adapter = {send}
  const src = source({id: 'entries', adapter})
  const request = {
    type: 'entry',
    endpoint: {}
  }

  const ret = await src.retrieveRaw(request)

  t.is(ret, response)
})

test('retrieveRaw should call adapter with request object', async (t) => {
  const send = sinon.stub().resolves({})
  const adapter = {send}
  const src = source({id: 'entries', adapter})
  const request = {
    type: 'entry',
    id: 'ent1',
    endpoint: {uri: ['http://some.api/1.0/']}
  }

  await src.retrieveRaw(request)

  t.is(send.args[0][0], request)
})

test('retrieveRaw should retrieve from endpoint with POST method', async (t) => {
  const expected = {}
  const send = sinon.stub().resolves(expected)
  const adapter = {send}
  const src = source({id: 'entries', adapter})
  const method = 'POST'
  const data = {}

  const ret = await src.retrieveRaw({endpoint: {}, method, data})

  t.true(send.calledOnce)
  const request = send.args[0][0]
  t.is(request.method, 'POST')
  t.is(request.data, data)
  t.is(ret, expected)
})

test('retrieveRaw should return error when adapter rejects', async (t) => {
  const send = sinon.stub().returns(Promise.reject(new Error('Fail!')))
  const adapter = {send}
  const src = source({id: 'entries', adapter})

  await t.notThrows(async () => {
    const ret = await src.retrieveRaw({endpoint: {}, type: 'entry'})

    t.truthy(ret)
    t.is(ret.status, 'error')
    t.regex(ret.error, /Fail!/)
  })
})

test('retrieveRaw should invoke beforeRetrieve hook', async (t) => {
  const endpoint = {}
  const adapter = {send: async () => ({})}
  const beforeRetrieve = sinon.stub()
  const src = source({id: 'entries', adapter, beforeRetrieve})

  await src.retrieveRaw({endpoint, type: 'entry'})

  t.is(beforeRetrieve.callCount, 1)
  const request = beforeRetrieve.args[0][0]
  t.truthy(request)
  t.is(request.endpoint, endpoint)
  t.is(request.type, 'entry')
  const resources = beforeRetrieve.args[0][1]
  t.truthy(resources)
  t.is(resources.source, src)
})

test('retrieveRaw should allow beforeRetrieve hook to alter request', async (t) => {
  const uri = 'http://some.api/1.0/'
  const send = sinon.stub().resolves({})
  const adapter = {send}
  const beforeRetrieve = async (request) => {
    request.uri = uri
  }
  const src = source({id: 'entries', adapter, beforeRetrieve})

  await src.retrieveRaw({uri: 'http://other.api/1.0/'})

  t.is(send.callCount, 1)
  const request = send.args[0][0]
  t.is(request.uri, uri)
})

test('retrieveRaw should get beforeRetrieve hook by id', async (t) => {
  const adapter = {send: async () => ({})}
  const hook = sinon.stub()
  const hooks = {hook}
  const src = source({id: 'entries', adapter, beforeRetrieve: 'hook'}, {hooks})

  await src.retrieveRaw({endpoint: {}, type: 'entry'})

  t.is(hook.callCount, 1)
})

test('retrieveRaw should invoke array of beforeRetrieve hooks by id', async (t) => {
  const adapter = {send: async () => ({})}
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const beforeRetrieve = ['hook1', 'hook2']
  const src = source({id: 'entries', adapter, beforeRetrieve}, {hooks})

  await src.retrieveRaw({endpoint: {}, type: 'entry'})

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})

test('retrieveRaw should invoke afterRetrieve hook', async (t) => {
  const response = {}
  const adapter = {send: async () => response}
  const afterRetrieve = sinon.stub()
  const src = source({id: 'entries', adapter, afterRetrieve})

  await src.retrieveRaw({endpoint: {}, type: 'entry'})

  t.is(afterRetrieve.callCount, 1)
  t.is(afterRetrieve.args[0][0], response)
  const resources = afterRetrieve.args[0][1]
  t.truthy(resources)
  t.is(resources.source, src)
})

test('retrieveRaw should allow afterRetrieve hook to alter response', async (t) => {
  const adapter = {send: async () => ({status: 'ok', data: {}})}
  const afterRetrieve = async (response) => {
    response.status = 'error'
    response.data = null
    response.error = 'Some error'
  }
  const src = source({id: 'entries', adapter, afterRetrieve})

  const ret = await src.retrieveRaw({endpoint: {}, type: 'entry'})

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.is(ret.data, null)
  t.is(ret.error, 'Some error')
})

test('retrieveRaw should allow afterRetrieve hook to alter error', async (t) => {
  const adapter = {send: async () => { throw new Error('Badness!') }}
  const afterRetrieve = async (response) => {
    response.status = 'ok'
    response.data = {}
    response.error = null
  }
  const src = source({id: 'entries', adapter, afterRetrieve})

  const ret = await src.retrieveRaw({endpoint: {}, type: 'entry'})

  t.truthy(ret)
  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, {})
  t.is(ret.error, null)
})

test('retrieveRaw should get afterRetrieve hook by id', async (t) => {
  const adapter = {send: async () => ({})}
  const hook = sinon.stub()
  const hooks = {hook}
  const src = source({id: 'entries', adapter, afterRetrieve: 'hook'}, {hooks})

  await src.retrieveRaw({endpoint: {}, type: 'entry'})

  t.is(hook.callCount, 1)
})

test('retrieveRaw should invoke array of afterRetrieve hooks by id', async (t) => {
  const adapter = {send: async () => ({})}
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const afterRetrieve = ['hook1', 'hook2']
  const src = source({id: 'entries', adapter, afterRetrieve}, {hooks})

  await src.retrieveRaw({endpoint: {}, type: 'entry'})

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})

// test -- retrieveNormalized

test('retrieveNormalized should exist', (t) => {
  const src = source({id: 'entries', adapter: json})

  t.is(typeof src.retrieveNormalized, 'function')
})

test('retrieveNormalized should retrieve from endpoint', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0', path: 'item'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  const request = src.prepareRequest({id: 'ent1', type: 'entry'})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {id: 'ent1', type: 'entry'}}})
  const expected = {status: 'ok', data: {id: 'ent1', type: 'entry'}}

  const ret = await src.retrieveNormalized(request)

  t.deepEqual(ret, expected)
})

test('retrieveNormalized should return error when no endpoint', async (t) => {
  const src = source({id: 'entries', adapter: json})
  const request = src.prepareRequest({id: 'ent1', type: 'entry'})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok'})

  const ret = await src.retrieveNormalized(request)

  t.is(ret.status, 'error')
  t.is(src.retrieveRaw.callCount, 0)
})

test('retrieveNormalized should return null when normalize returns null', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}', path: 'item'})]
  const adapter = {
    prepareEndpoint: json.prepareEndpoint,
    normalize: async () => null
  }
  const src = source({id: 'entries', endpoints, adapter})
  const request = src.prepareRequest({id: 'ent1', type: 'entry'})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {id: 'ent1', type: 'entry'}}})
  const expected = {status: 'ok', data: null}

  const ret = await src.retrieveNormalized(request)

  t.deepEqual(ret, expected)
})

test('retrieveNormalized should return error from retrieveRaw', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  const request = src.prepareRequest({id: 'unknown', type: 'entry'})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'notfound', error: 'The entry was not found'})

  const ret = await src.retrieveNormalized(request)

  t.deepEqual(ret, {status: 'notfound', error: 'The entry was not found'})
})

test('retrieveNormalized should return error when normalize rejects', async (t) => {
  const data = {}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0'})]
  const adapter = {
    prepareEndpoint: json.prepareEndpoint,
    async send () { return {status: 'ok', data} },
    async normalize () { return Promise.reject(new Error('Mistakes!')) }
  }
  const src = source({id: 'entries', endpoints, adapter}, {datatypes})
  const request = src.prepareRequest({})

  await t.notThrows(async () => {
    const ret = await src.retrieveNormalized(request)

    t.is(ret.status, 'error')
    t.regex(ret.error, /Mistakes!/)
  })
})

test('retrieveNormalized should invoke afterNormalize hook', async (t) => {
  const item = {}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'})]
  const afterNormalize = sinon.stub()
  const src = source({id: 'entries', endpoints, adapter: json, afterNormalize})
  const request = src.prepareRequest({id: 'ent1', type: 'entry'})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item}})

  await src.retrieveNormalized(request)

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
  const endpoints = [createEndpoint({id: 'one', uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'})]
  const afterNormalize = async (response) => {
    response.status = 'error'
    response.data = null
    response.error = 'Some error'
  }
  const src = source({id: 'entries', endpoints, adapter: json, afterNormalize})
  const request = src.prepareRequest({id: 'ent1', type: 'entry'})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {}}})

  const ret = await src.retrieveNormalized(request)

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.is(ret.data, null)
  t.is(ret.error, 'Some error')
})

test('retrieveNormalized should get afterNormalize hook from id', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'})]
  const hook = sinon.stub()
  const hooks = {hook}
  const src = source({id: 'entries', endpoints, adapter: json, afterNormalize: 'hook'}, {hooks})
  const request = src.prepareRequest({id: 'ent1', type: 'entry'})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {}}})

  await src.retrieveNormalized(request)

  t.is(hook.callCount, 1)
})

test('retrieveNormalized should invoke array of afterNormalize hooks from id', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'})]
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const afterNormalize = ['hook1', 'hook2']
  const src = source({id: 'entries', endpoints, adapter: json, afterNormalize}, {hooks})
  const request = src.prepareRequest({id: 'ent1', type: 'entry'})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {}}})

  await src.retrieveNormalized(request)

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})

// Tests -- retrieve

test('retrieve should exist', (t) => {
  const src = source({id: 'entries', adapter: json})

  t.is(typeof src.retrieve, 'function')
})

test('retrieve should retrieve with the given request and return response', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}'})]
  const src = source({id: 'entries', endpoints, adapter: json}, {datatypes, mappings})
  const request = src.prepareRequest({id: 'ent1', type: 'entry'})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {}})

  const ret = await src.retrieve(request)

  t.deepEqual(ret, {status: 'ok', data: []})
  t.is(src.retrieveRaw.callCount, 1)
  t.is(src.retrieveRaw.args[0][0], request)
})

test('retrieve should map data', async (t) => {
  const def = {
    id: 'entries',
    endpoints: [createEndpoint({uri: 'http://some.api/1.0'})],
    adapter: json
  }
  const src = source(def, {datatypes, mappings})
  const request = src.prepareRequest({type: 'entry'})
  const data = {items: [{key: 'ent1', header: 'The heading'}]}
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})

  const ret = await src.retrieve(request)

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'ent1')
  t.truthy(ret.data[0].attributes)
  t.is(ret.data[0].attributes.title, 'The heading')
})

test('retrieve should map data - with mapper for several sources', async (t) => {
  const def = {
    id: 'entries',
    endpoints: [createEndpoint({uri: 'http://some.api/1.0'})],
    adapter: json
  }
  const mappings = [setupMapping({
    type: 'entry',
    source: ['entries', 'stories'],
    attributes: {id: 'key'}
  }, {datatypes})]
  const src = source(def, {datatypes, mappings})
  const request = src.prepareRequest({type: 'entry'})
  const data = [{key: 'ent1'}]
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})

  const ret = await src.retrieve(request)

  t.is(ret.status, 'ok')
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'ent1')
})

test('retrieve should map data for several types', async (t) => {
  const def = {
    id: 'entries',
    endpoints: [createEndpoint({uri: 'http://some.api/1.0'})],
    adapter: json
  }
  const mappings = [
    setupMapping({
      type: 'entry', source: 'entries', path: 'data', attributes: {id: {}, title: {}}
    }, {datatypes}),
    setupMapping({
      type: 'account', source: 'entries', path: 'accounts', attributes: {id: {}, name: {}}
    }, {datatypes})
  ]
  const src = source(def, {datatypes, mappings})
  const request = src.prepareRequest({type: ['entry', 'account']})
  const data = {
    data: [{id: 'ent1', title: 'The heading'}],
    accounts: [{id: 'acc1', name: 'John'}]
  }
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})

  const ret = await src.retrieve(request)

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

test('retrieve should map data - with mappings referenced by id', async (t) => {
  const def = {
    id: 'entries',
    endpoints: [createEndpoint({uri: 'http://some.api/1.0'})],
    adapter: json,
    mappings: ['entriesMapping']
  }
  const mappings = [setupMapping({
    id: 'entriesMapping',
    type: 'entry',
    attributes: {id: 'key'}
  }, {datatypes})]
  const src = source(def, {datatypes, mappings})
  const request = src.prepareRequest({type: 'entry'})
  const data = [{key: 'ent1'}]
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})

  const ret = await src.retrieve(request)

  t.is(ret.status, 'ok')
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'ent1')
})

test('retrieve should not map when mapping referenced by id does not exist', async (t) => {
  const def = {
    id: 'entries',
    endpoints: [createEndpoint({uri: 'http://some.api/1.0'})],
    adapter: json,
    mappings: ['unknownMapping']
  }
  const mappings = []
  const src = source(def, {datatypes, mappings})
  const request = src.prepareRequest({type: 'entry'})
  const data = [{key: 'ent1'}]
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})

  const ret = await src.retrieve(request)

  t.is(ret.status, 'ok')
  t.is(ret.data.length, 0)
})

test('retrieve should map from params', async (t) => {
  const def = {
    id: 'entries',
    endpoints: [createEndpoint({uri: 'http://some.api/1.0'})],
    adapter: json
  }
  const mappings = [setupMapping({
    type: 'entry',
    source: 'entries',
    path: 'data',
    attributes: {id: {path: 'key'}, title: {param: 'title'}}
  }, {datatypes})]
  const src = source(def, {datatypes, mappings})
  const params = {title: 'Any heading'}
  const request = src.prepareRequest({type: 'entry', params})
  const data = {data: [{key: 'ent1', header: 'The heading'}]}
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})

  const ret = await src.retrieve(request)

  t.is(ret.data[0].id, 'ent1')
  t.is(ret.data[0].attributes.title, 'Any heading')
})

test('retrieve should return empty array when no type', async (t) => {
  const def = {
    id: 'entries',
    endpoints: [createEndpoint({uri: 'http://some.api/1.0'})],
    adapter: json
  }
  const src = source(def, {datatypes})
  const request = src.prepareRequest({type: null})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: [{}]})

  const ret = await src.retrieve(request)

  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, [])
  t.is(src.retrieveRaw.callCount, 0)
})

test('retrieve should skip types with no corresponding mapper', async (t) => {
  const def = {
    id: 'entries',
    endpoints: [createEndpoint({uri: 'http://some.api/1.0'})],
    adapter: json
  }
  const src = source(def, {datatypes, mappings})
  const request = src.prepareRequest({type: 'unknown'})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: [{}]})

  const ret = await src.retrieve(request)

  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, [])
})

test('retrieve should return empty array when no data', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0', path: 'rows[]'})]
  const src = source({id: 'entries', endpoints, adapter: json}, {datatypes, mappings})
  const request = src.prepareRequest({type: ['entry', 'item']})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {rows: []}})

  const ret = await src.retrieve(request)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, [])
})

test('retrieve should return empty array when path points to undefined', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0', path: 'rows[].unknown'})]
  const src = source({id: 'entries', endpoints, adapter: json}, {datatypes, mappings})
  const request = src.prepareRequest({type: ['entry', 'item']})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {rows: []}})

  const ret = await src.retrieve(request)

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 0)
})

test('retrieve should include default values from type', async (t) => {
  const def = {
    id: 'entries',
    endpoints: [createEndpoint({uri: 'http://some.api/1.0'})],
    adapter: json
  }
  const datatypes = {entry: datatype({
    id: 'entry', attributes: {byline: {default: 'Somebody'}, title: 'string'}
  })}
  const mappings = [setupMapping({
    type: 'entry', source: 'entries', path: 'data', attributes: {title: 'title'}
  }, {datatypes})]
  const src = source(def, {datatypes, mappings})
  const request = src.prepareRequest({type: 'entry'})
  const data = {data: [{id: 'ent1', title: 'The title'}]}
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})

  const ret = await src.retrieve(request, {useDefaults: true})

  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.truthy(ret.data[0].attributes)
  t.is(ret.data[0].attributes.byline, 'Somebody')
})

test('retrieve should not include default values', async (t) => {
  const def = {
    id: 'entries',
    endpoints: [createEndpoint({uri: 'http://some.api/1.0'})],
    adapter: json
  }
  const datatypes = {entry: datatype({
    id: 'entry', attributes: {byline: {default: 'Somebody'}}
  })}
  const mappings = [setupMapping({
    type: 'entry', source: 'entries', path: 'data', attributes: {id: {}}
  }, {datatypes})]
  const src = source(def, {datatypes, mappings})
  const request = src.prepareRequest({type: 'entry'})
  const data = {data: [{id: 'ent1'}]}
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})

  const ret = await src.retrieve(request, {useDefaults: false})

  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.truthy(ret.data[0].attributes)
  t.is(ret.data[0].attributes.byline, undefined)
})

test('retrieve should use endpoint path', async (t) => {
  const def = {
    id: 'entries',
    endpoints: [createEndpoint({uri: 'http://some.api/1.0', path: 'root'})],
    adapter: json
  }
  const mappings = [setupMapping({
    type: 'entry', source: 'entries', path: 'data', attributes: {id: {path: 'key'}}
  }, {datatypes})]
  const src = source(def, {datatypes, mappings})
  const request = src.prepareRequest({type: 'entry'})
  const data = {root: {data: [{key: 'ent1'}]}}
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})

  const ret = await src.retrieve(request)

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'ent1')
})

test('retrieve should return error from retrieveRaw', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}'})]
  const src = source({id: 'entries', endpoints, adapter: json}, {mappings})
  const request = src.prepareRequest({id: 'unknown', type: 'entry'})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'notfound', error: 'The entry was not found'})

  const ret = await src.retrieve(request)

  t.deepEqual(ret, {status: 'notfound', error: 'The entry was not found'})
})

// Tests -- sendRaw

test('sendRaw should exist', (t) => {
  const src = source({id: 'entries', adapter: json})

  t.is(typeof src.sendRaw, 'function')
})

test('sendRaw should send data to endpoint through adapter', async (t) => {
  const response = {}
  const send = sinon.stub().resolves(response)
  const adapter = {send}
  const src = source({id: 'entries', adapter})
  const request = {
    action: 'SET',
    type: 'entry',
    id: 'ent1',
    data: {id: 'ent1', type: 'entry'},
    endpoint: {uri: ['http://some.api/1.0/']}
  }

  const ret = await src.sendRaw(request)

  t.true(send.calledOnce)
  t.deepEqual(send.args[0][0], request)
  t.is(ret, response)
})

test('sendRaw should return error when adapter rejects', async (t) => {
  const data = {}
  const send = sinon.stub().returns(Promise.reject(new Error('Fail!')))
  const adapter = {send}
  const src = source({id: 'entries', adapter})
  const request = {endpoint: {}, data}

  await t.notThrows(async () => {
    const ret = await src.sendRaw(request)

    t.truthy(ret)
    t.is(ret.status, 'error')
    t.regex(ret.error, /Fail!/)
  })
})

test('sendRaw should invoke beforeSend hook', async (t) => {
  const data = {}
  const endpoint = {}
  const method = 'POST'
  const adapter = {send: async () => ({})}
  const beforeSend = sinon.stub()
  const src = source({id: 'entries', adapter, beforeSend})

  await src.sendRaw({endpoint, data, method})

  t.is(beforeSend.callCount, 1)
  const request = beforeSend.args[0][0]
  t.truthy(request)
  t.is(request.endpoint, endpoint)
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

  await src.sendRaw({endpoint: {}, data: {}})

  t.is(hook.callCount, 1)
})

test('sendRaw should invoke array of beforeSend hooks by id', async (t) => {
  const adapter = {send: async () => ({})}
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const beforeSend = ['hook1', 'hook2']
  const src = source({id: 'entries', adapter, beforeSend}, {hooks})

  await src.sendRaw({endpoint: {}, data: {}})

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})

test('sendRaw should invoke afterSend hook', async (t) => {
  const response = {status: 'ok', data: {}}
  const adapter = {send: async () => response}
  const afterSend = sinon.stub()
  const src = source({id: 'entries', adapter, afterSend})

  await src.sendRaw({endpoint: {}, data: {}})

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

  const ret = await src.sendRaw({endpoint: {}, data: {}})

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

  const ret = await src.sendRaw({endpoint: {}, data: {}})

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

  await src.sendRaw({endpoint: {}, data: {}})

  t.is(hook.callCount, 1)
})

test('sendRaw should invoke array of afterSend hooks by id', async (t) => {
  const adapter = {send: async () => ({})}
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const afterSend = ['hook1', 'hook2']
  const src = source({id: 'entries', adapter, afterSend}, {hooks})

  await src.sendRaw({endpoint: {}, data: {}})

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})

// Tests -- sendSerialized

test('sendSerialized should exist', (t) => {
  const src = source({id: 'entries', adapter: json})

  t.is(typeof src.sendSerialized, 'function')
})

test('sendSerialized should send to endpoint', async (t) => {
  const data = [{id: 'ent1', type: 'entry'}]
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0', path: 'item', method: 'POST'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  const request = src.prepareRequest({action: 'SET', data})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: [{}]})
  const expected = {
    ...request,
    data: {item: [{id: 'ent1', type: 'entry'}]}
  }

  const ret = await src.sendSerialized(request)

  t.is(ret.status, 'ok')
  t.is(src.sendRaw.callCount, 1)
  t.deepEqual(src.sendRaw.args[0][0], expected)
})

test('sendSerialized should return error when no endpoint', async (t) => {
  const src = source({id: 'entries', adapter: {}})
  const request = src.prepareRequest({endpoint: 'unknown'})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok'})

  const ret = await src.sendSerialized(request)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('sendSerialized should return error when serialize rejects', async (t) => {
  const def = {
    id: 'entries',
    endpoints: [createEndpoint({uri: 'http://some.api/1.0/entries'})],
    adapter: {
      prepareEndpoint: json.prepareEndpoint,
      async send () { return {status: 'ok'} },
      async serialize () { return Promise.reject(new Error('Mistakes!')) }
    }
  }
  const mappings = [setupMapping({
    type: 'entry', source: 'entries', path: 'data', attributes: {id: {path: 'key'}}
  }, {datatypes})]
  const src = source(def, {datatypes, mappings})
  const data = {id: 'ent1', type: 'entry'}
  const request = src.prepareRequest({data})

  await t.notThrows(async () => {
    const ret = await src.sendSerialized(request)

    t.is(ret.status, 'error')
    t.regex(ret.error, /Mistakes!/)
  })
})

test('sendSerialized should invoke beforeSerialize hook', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'})]
  const beforeSerialize = sinon.stub()
  const src = source({id: 'entries', endpoints, adapter: json, beforeSerialize})
  const request = src.prepareRequest({id: 'ent1', type: 'entry', data})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  await src.sendSerialized(request)

  t.is(beforeSerialize.callCount, 1)
  const req = beforeSerialize.args[0][0]
  t.truthy(req)
  t.is(req.method, 'POST')
  t.is(req.data, data)
  const resources = beforeSerialize.args[0][1]
  t.truthy(resources)
  t.is(resources.source, src)
})

test('sendSerialized should allow beforeSerialize hook to alter request', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'})]
  const beforeSerialize = async (request) => {
    request.uri = 'http://other.api/1.0/other'
    request.data = data
    request.method = 'PUT'
  }
  const src = source({id: 'entries', endpoints, adapter: json, beforeSerialize})
  const request = src.prepareRequest({id: 'ent1', type: 'entry', data: {}})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  await src.sendSerialized(request)

  t.is(src.sendRaw.callCount, 1)
  const req = src.sendRaw.args[0][0]
  t.is(req.uri, 'http://other.api/1.0/other')
  t.truthy(req.data)
  t.is(req.data.item, data)
  t.is(req.method, 'PUT')
})

test('sendSerialized should get beforeSerialize hook by id', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}'})]
  const hook = sinon.stub()
  const hooks = {hook}
  const src = source({id: 'entries', endpoints, adapter: json, beforeSerialize: 'hook'}, {hooks})
  const request = src.prepareRequest({id: 'ent1', type: 'entry', data})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data})

  await src.sendSerialized(request)

  t.is(hook.callCount, 1)
})

test('sendSerialized should invoke array of beforeSerialize hooks by id', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}'})]
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const beforeSerialize = ['hook1', 'hook2']
  const src = source({id: 'entries', endpoints, adapter: json, beforeSerialize}, {hooks})
  const request = src.prepareRequest({id: 'ent1', type: 'entry', data})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data})

  await src.sendSerialized(request)

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})

// Tests -- send

test('send should exist', (t) => {
  const src = source({id: 'entries', adapter: json})

  t.is(typeof src.send, 'function')
})

test('send should send to endpoint', async (t) => {
  const def = {
    id: 'entries',
    endpoints: [createEndpoint({uri: 'http://some.api/1.0'})],
    adapter: json
  }
  const params = {id: 'ent1', type: 'entry'}
  const src = source(def, {datatypes, mappings})
  const request = src.prepareRequest({params, data: {id: 'ent1', type: 'entry'}, method: 'POST'})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  const ret = await src.send(request)

  t.is(src.sendRaw.callCount, 1)
  const req = src.sendRaw.args[0][0]
  t.truthy(req.endpoint)
  t.deepEqual(req.endpoint.uri, ['http://some.api/1.0'])
  t.is(req.method, 'POST')
  t.deepEqual(ret, {status: 'ok', data: {}})
})

test('send should map data', async (t) => {
  const def = {
    id: 'entries',
    endpoints: [createEndpoint({uri: 'http://some.api/1.0/entries'})],
    adapter: json
  }
  const mappings = [setupMapping({
    type: 'entry',
    source: 'entries',
    path: 'data',
    attributes: {id: {path: 'key'}, title: {path: 'header'}}
  }, {datatypes})]
  const src = source(def, {datatypes, mappings})
  const data = {id: 'ent1', type: 'entry', attributes: {title: 'The heading'}}
  const request = src.prepareRequest({data})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  const ret = await src.send(request)

  t.is(src.sendRaw.callCount, 1)
  const req = src.sendRaw.args[0][0]
  t.deepEqual(req.data, {data: {key: 'ent1', header: 'The heading'}})
  t.deepEqual(ret, {status: 'ok', data: {}})
})

test('send should use endpoint path', async (t) => {
  const def = {
    id: 'entries',
    endpoints: [createEndpoint({uri: 'http://some.api/1.0/entries', path: 'root'})],
    adapter: json
  }
  const mappings = [setupMapping({
    type: 'entry', source: 'entries', path: 'data', attributes: {id: {path: 'key'}}
  }, {datatypes})]
  const src = source(def, {datatypes, mappings})
  const data = {id: 'ent1', type: 'entry'}
  const request = src.prepareRequest({data})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  await src.send(request)

  t.is(src.sendRaw.callCount, 1)
  const req = src.sendRaw.args[0][0]
  t.deepEqual(req.data, {root: {data: {key: 'ent1'}}})
})

test('send should skip items with unknown type', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  const request = src.prepareRequest({data: [{id: 'ent1', type: 'unknown'}], method: 'POST'})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  const ret = await src.send(request)

  t.is(ret.status, 'ok', ret.error)
  t.is(src.sendRaw.callCount, 1)
  const req = src.sendRaw.args[0][0]
  t.deepEqual(req.data, [])
})
