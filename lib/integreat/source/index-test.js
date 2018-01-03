import test from 'ava'
import sinon from 'sinon'
import json from '../../adapters/json'
import datatype from '../datatype'
import createEndpoint from '../../../tests/helpers/createEndpoint'

import source from '.'

// Helpers

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
  const adapters = {json}

  const src = source({id: 'entries', adapter: 'json'}, {adapters})

  t.is(src.id, 'entries')
  t.is(src.adapter, json)
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

test('should set handleMeta', (t) => {
  const handleMeta = 'store'

  const src = source({id: 'entries', adapter: json, handleMeta})

  t.is(src.handleMeta, 'store')
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
  const expected = {
    auth: null,
    headers: {},
    method: 'GET',
    type: 'entry',
    id: 'ent1',
    endpoint: {uri: ['http://some.api/1.0/']}
  }

  await src.retrieveRaw(request)

  t.deepEqual(send.args[0][0], expected)
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

test('retrieveRaw should use auth', async (t) => {
  const oauth = {}
  const auths = {oauth}
  const send = sinon.stub().resolves({})
  const adapter = {send}
  const src = source({id: 'entries', adapter, auth: 'oauth'}, {auths})

  await src.retrieveRaw({endpoint: {}, type: 'entry'})

  const request = send.args[0][0]
  t.is(request.auth, oauth)
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

test('retrieveRaw should make sure request has headers object', async (t) => {
  const adapter = {send: async () => ({})}
  const beforeRetrieve = sinon.stub()
  const src = source({id: 'entries', adapter, beforeRetrieve})

  await src.retrieveRaw({endpoint: {}, type: 'entry'})

  const request = beforeRetrieve.args[0][0]
  t.deepEqual(request.headers, {})
})

// test -- retrieveNormalized

test('retrieveNormalized should exist', (t) => {
  const src = source({id: 'entries', adapter: json})

  t.is(typeof src.retrieveNormalized, 'function')
})

test('retrieveNormalized should retrieve from endpoint', async (t) => {
  const request = {id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0', path: 'item'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {id: 'ent1', type: 'entry'}}})
  const expected = {status: 'ok', data: {id: 'ent1', type: 'entry'}}

  const ret = await src.retrieveNormalized(request)

  t.deepEqual(ret, expected)
})

test('retrieveNormalized should add endpoint to request', async (t) => {
  const request = {action: 'GET', id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0', id: 'one'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {id: 'ent1', type: 'entry'}})
  const expected = {uri: ['http://some.api/1.0'], method: null, path: null}

  await src.retrieveNormalized(request)

  t.is(src.retrieveRaw.callCount, 1)
  const req = src.retrieveRaw.args[0][0]
  t.deepEqual(req.endpoint, expected)
})

test('retrieveNormalized should retrieve from endpoint with id', async (t) => {
  const request = {endpoint: 'one', id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0', id: 'one', path: 'item'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {id: 'ent1', type: 'entry'}}})
  const expected = {status: 'ok', data: {id: 'ent1', type: 'entry'}}

  const ret = await src.retrieveNormalized(request)

  t.deepEqual(ret, expected)
})

test('retrieveNormalized should retrieve from endpoint with POST and data', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}', id: 'one', path: 'item'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {}})
  const method = 'POST'
  const data = {}

  await src.retrieveNormalized({endpoint: 'one', id: 'ent1', type: 'entry', method, data})

  const request = src.retrieveRaw.args[0][0]
  t.is(request.method, 'POST')
  t.is(request.data, data)
})

test('retrieveNormalized should prepare params on request', async (t) => {
  const request = {action: 'GET', id: 'ent1', type: 'entry', params: {first: 20}}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0', id: 'one'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {}})
  const expected = {
    action: 'GET',
    type: 'entry',
    id: 'ent1',
    method: 'GET',
    first: 20
  }

  await src.retrieveNormalized(request)

  const req = src.retrieveRaw.args[0][0]
  t.deepEqual(req.params, expected)
})

test('retrieveNormalized should return error for non-existing endpoint', async (t) => {
  const src = source({id: 'entries', adapter: {}})
  sinon.stub(src, 'retrieveRaw').resolves({})

  const ret = await src.retrieveNormalized({endpoint: 'unknown', type: 'entry'})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('retrieveNormalized should return null when normalize returns null', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}', id: 'one', path: 'item'})]
  const adapter = {
    prepareEndpoint: json.prepareEndpoint,
    normalize: async () => null
  }
  const src = source({id: 'entries', endpoints, adapter})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {id: 'ent1', type: 'entry'}}})
  const expected = {status: 'ok', data: null}

  const ret = await src.retrieveNormalized({endpoint: 'one', id: 'ent1', type: 'entry'})

  t.deepEqual(ret, expected)
})

test('retrieveNormalized should return error from retrieveRaw', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}', id: 'one'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'notfound', error: 'The entry was not found'})

  const ret = await src.retrieveNormalized({endpoint: 'one', id: 'unknown', type: 'entry'})

  t.deepEqual(ret, {status: 'notfound', error: 'The entry was not found'})
})

test('retrieveNormalized should return error when normalize rejects', async (t) => {
  const data = {}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0', id: 'all'})]
  const adapter = {
    prepareEndpoint: json.prepareEndpoint,
    async send () { return {status: 'ok', data} },
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
  const item = {}
  const endpoints = [createEndpoint({id: 'one', uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'})]
  const afterNormalize = sinon.stub()
  const src = source({id: 'entries', endpoints, adapter: json, afterNormalize})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item}})

  await src.retrieveNormalized({endpoint: 'one', id: 'ent1', type: 'entry'})

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
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {}}})

  const ret = await src.retrieveNormalized({endpoint: 'one', id: 'ent1', type: 'entry'})

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.is(ret.data, null)
  t.is(ret.error, 'Some error')
})

test('retrieveNormalized should get afterNormalize hook from id', async (t) => {
  const endpoints = [createEndpoint({id: 'one', uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'})]
  const hook = sinon.stub()
  const hooks = {hook}
  const src = source({id: 'entries', endpoints, adapter: json, afterNormalize: 'hook'}, {hooks})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {}}})

  await src.retrieveNormalized({endpoint: 'one', id: 'ent1', type: 'entry'})

  t.is(hook.callCount, 1)
})

test('retrieveNormalized should invoke array of afterNormalize hooks from id', async (t) => {
  const endpoints = [createEndpoint({id: 'one', uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'})]
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const afterNormalize = ['hook1', 'hook2']
  const src = source({id: 'entries', endpoints, adapter: json, afterNormalize}, {hooks})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {}}})

  await src.retrieveNormalized({endpoint: 'one', id: 'ent1', type: 'entry'})

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})

// Tests -- retrieve

test('retrieve should exist', (t) => {
  const src = source({id: 'entries', adapter: json})

  t.is(typeof src.retrieve, 'function')
})

test('retrieve should retrieve from endpoint', async (t) => {
  const endpoints = [createEndpoint({id: 'one', uri: 'http://some.api/1.0/{type}:{id}'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {}})

  const ret = await src.retrieve({endpoint: 'one', id: 'ent1', type: 'entry'})

  t.is(src.retrieveRaw.callCount, 1)
  const request = src.retrieveRaw.args[0][0]
  t.truthy(request.endpoint)
  t.deepEqual(ret, {status: 'ok', data: []})
})

test('retrieve should retrieve from endpoint with POST and data', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}', id: 'one'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {}})
  const method = 'POST'
  const data = {}

  await src.retrieve({endpoint: 'one', id: 'ent1', type: 'entry', method, data})

  t.is(src.retrieveRaw.callCount, 1)
  const request = src.retrieveRaw.args[0][0]
  t.truthy(request.endpoint)
  t.is(request.method, 'POST')
  t.is(request.data, data)
})

test('retrieve should map data', async (t) => {
  const data = {items: [{key: 'ent1', header: 'The heading'}]}
  const endpoints = [createEndpoint({id: 'all', uri: 'http://some.api/1.0'})]
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
  const endpoints = [createEndpoint({id: 'all', uri: 'http://some.api/1.0'})]
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
  const params = {title: 'Any heading'}
  const request = {endpoint: 'all', type: 'entry', params}
  const data = {data: [{key: 'ent1', header: 'The heading'}]}
  const endpoints = [createEndpoint({id: 'all', uri: 'http://some.api/1.0'})]
  const mappings = {entry: {
    path: 'data',
    attributes: {id: {path: 'key'}, title: {param: 'title'}}
  }}
  const src = source({id: 'entries', endpoints, mappings, adapter: json}, {datatypes})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})

  const ret = await src.retrieve(request)

  t.is(ret.data[0].id, 'ent1')
  t.is(ret.data[0].attributes.title, 'Any heading')
})

test('retrieve should return empty array when no type', async (t) => {
  const data = {
    data: [{id: 'ent1', title: 'The heading'}]
  }
  const endpoints = [createEndpoint({id: 'all', uri: 'http://some.api/1.0'})]
  const src = source({id: 'entries', endpoints, adapter: json}, {datatypes})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})

  const ret = await src.retrieve({endpoint: 'all', type: null})

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 0)
  t.is(src.retrieveRaw.callCount, 0)
})

test('retrieve should return empty array when no data', async (t) => {
  const endpoints = [createEndpoint({id: 'all', uri: 'http://some.api/1.0', path: 'rows[]'})]
  const src = source({id: 'entries', endpoints, adapter: json}, {datatypes})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {rows: []}})

  const ret = await src.retrieve({endpoint: 'all', type: ['entry', 'item']})

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 0)
})

test('retrieve should return empty array when path points to undefined', async (t) => {
  const endpoints = [createEndpoint({id: 'all', uri: 'http://some.api/1.0', path: 'rows[].unknown'})]
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
  const endpoints = [createEndpoint({id: 'all', uri: 'http://some.api/1.0'})]
  const mappings = {entry: {path: 'data', attributes: {title: 'title'}}}
  const src = source({id: 'entries', endpoints, mappings, adapter: json}, {datatypes})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})

  const ret = await src.retrieve({endpoint: 'all', type: 'entry'}, {useDefaults: true})

  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.truthy(ret.data[0].attributes)
  t.is(ret.data[0].attributes.byline, 'Somebody')
})

test('retrieve should not include default values', async (t) => {
  const data = {data: [{id: 'ent1'}]}
  const endpoints = [createEndpoint({id: 'all', uri: 'http://some.api/1.0'})]
  const mappings = {entry: {path: 'data', attributes: {id: {}}}}
  const datatypes = {entry: datatype({id: 'entry', attributes: {byline: {default: 'Somebody'}}})}
  const src = source({id: 'entries', endpoints, mappings, adapter: json}, {datatypes})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data})

  const ret = await src.retrieve({endpoint: 'all', type: 'entry'}, {useDefaults: false})

  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.truthy(ret.data[0].attributes)
  t.is(ret.data[0].attributes.byline, undefined)
})

test('retrieve should use endpoint path', async (t) => {
  const data = {root: {data: [{key: 'ent1'}]}}
  const endpoints = [createEndpoint({id: 'all', uri: 'http://some.api/1.0', path: 'root'})]
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
  const endpoints = [createEndpoint({id: 'one', uri: 'http://some.api/1.0/{type}:{id}'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'notfound', error: 'The entry was not found'})

  const ret = await src.retrieve({endpoint: 'one', id: 'unknown', type: 'entry'})

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
  const expected = {
    auth: null,
    headers: {},
    action: 'SET',
    type: 'entry',
    source: 'entries',
    id: 'ent1',
    data: {id: 'ent1', type: 'entry'},
    endpoint: {uri: ['http://some.api/1.0/']}
  }

  const ret = await src.sendRaw(request)

  t.true(send.calledOnce)
  t.deepEqual(send.args[0][0], expected)
  t.is(ret, response)
})

test('sendRaw should use auth', async (t) => {
  const auth = {}
  const send = sinon.stub().resolves({})
  const adapter = {send}
  const src = source({id: 'entries', adapter, auth})

  await src.sendRaw({endpoint: {}, data: {}})

  t.true(send.calledOnce)
  const request = send.args[0][0]
  t.is(request.auth, auth)
})

test('sendRaw should return error when adapter rejects', async (t) => {
  const data = {}
  const send = sinon.stub().returns(Promise.reject(new Error('Fail!')))
  const adapter = {send}
  const src = source({id: 'entries', adapter})

  await t.notThrows(async () => {
    const ret = await src.sendRaw({endpoint: {}, data})

    t.truthy(ret)
    t.is(ret.status, 'error')
    t.regex(ret.error, /Fail!/)
  })
})

test('sendRaw should send data to endpoint with POST method', async (t) => {
  const send = sinon.stub().resolves({})
  const adapter = {send}
  const src = source({id: 'entries', adapter})
  const data = {}
  const method = 'POST'

  await src.sendRaw({endpoint: {}, data, method})

  t.is(send.callCount, 1)
  const request = send.args[0][0]
  t.is(request.method, 'POST')
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

test('sendRaw should make sure request has headers object', async (t) => {
  const data = {}
  const adapter = {send: async () => ({})}
  const beforeSend = sinon.stub()
  const src = source({id: 'entries', adapter, beforeSend})

  await src.sendRaw({endpoint: {}, data})

  const request = beforeSend.args[0][0]
  t.deepEqual(request.headers, {})
})

// Tests -- sendSerialized

test('sendSerialized should exist', (t) => {
  const src = source({id: 'entries', adapter: json})

  t.is(typeof src.sendSerialized, 'function')
})

test('sendSerialized should send to endpoint', async (t) => {
  const data = [{id: 'ent1', type: 'entry'}]
  const request = {action: 'SET', data}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0', path: 'item', method: 'POST'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: [{}]})
  const expected = {
    action: 'SET',
    method: 'POST',
    data: {item: [{id: 'ent1', type: 'entry'}]},
    endpoint: {uri: ['http://some.api/1.0'], path: ['item'], method: 'POST'},
    params: {
      action: 'SET',
      method: 'POST',
      id: undefined,
      type: undefined
    }
  }

  const ret = await src.sendSerialized(request)

  t.is(ret.status, 'ok')
  t.is(src.sendRaw.callCount, 1)
  t.deepEqual(src.sendRaw.args[0][0], expected)
})

test('sendSerialized set id and type params', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const request = {action: 'SET', data}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0', method: 'POST'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})
  const expected = {
    action: 'SET',
    method: 'POST',
    data: {id: 'ent1', type: 'entry'},
    endpoint: {uri: ['http://some.api/1.0'], path: null, method: 'POST'},
    params: {
      id: 'ent1',
      type: 'entry',
      action: 'SET',
      method: 'POST'
    }
  }

  await src.sendSerialized(request)

  t.deepEqual(src.sendRaw.args[0][0], expected)
})

test('sendSerialized should send to endpoint with the provided id', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const request = {action: 'SET', endpoint: 'send', type: 'entry', source: 'entries', id: null, data}
  const endpoints = [createEndpoint({id: 'send', uri: 'http://some.api/1.0'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})
  const expected = {uri: ['http://some.api/1.0'], method: null, path: null}

  const ret = await src.sendSerialized(request)

  t.is(ret.status, 'ok')
  t.is(src.sendRaw.callCount, 1)
  t.deepEqual(src.sendRaw.args[0][0].endpoint, expected)
})

test('sendSerialized should send with provided method', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({id: 'send', uri: 'http://some.api/1.0/_bulk_docs'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  await src.sendSerialized({endpoint: 'send', data, method: 'POST'})

  t.is(src.sendRaw.callCount, 1)
  const request = src.sendRaw.args[0][0]
  t.is(request.method, 'POST')
})

test('sendSerialized should let method from endpoint override', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({id: 'send', uri: 'http://some.api/1.0/_bulk_docs', method: 'DELETE'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  await src.sendSerialized({endpoint: 'send', data, method: 'POST'})

  t.is(src.sendRaw.callCount, 1)
  const request = src.sendRaw.args[0][0]
  t.is(request.method, 'DELETE')
})

test('sendSerialized should send with method from endpoint', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({id: 'send', uri: 'http://some.api/1.0/_bulk_docs', method: 'POST'})]
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
  const endpoints = [createEndpoint({id: 'send', uri: 'http://some.api/1.0/{typefolder}/{type}:{id}'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'retrieveRaw').resolves({})

  const ret = await src.sendSerialized({endpoint: 'send', data})

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.regex(ret.error, /Missing\srequired\sparameter/)
})

test('sendSerialized should return error when serialize rejects', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({id: 'send', uri: 'http://some.api/1.0/entries'})]
  const mappings = {entry: {path: 'data', attributes: {id: {path: 'key'}}}}
  const adapter = {
    prepareEndpoint: json.prepareEndpoint,
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
  const endpoints = [createEndpoint({id: 'send', uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'})]
  const beforeSerialize = sinon.stub()
  const src = source({id: 'entries', endpoints, adapter: json, beforeSerialize})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  await src.sendSerialized({endpoint: 'send', id: 'ent1', type: 'entry', data})

  t.is(beforeSerialize.callCount, 1)
  const request = beforeSerialize.args[0][0]
  t.truthy(request)
  t.is(request.method, 'POST')
  t.is(request.data, data)
  const resources = beforeSerialize.args[0][1]
  t.truthy(resources)
  t.is(resources.source, src)
})

test('sendSerialized should allow beforeSerialize hook to alter request', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({id: 'send', uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'})]
  const beforeSerialize = async (request) => {
    request.uri = 'http://other.api/1.0/other'
    request.data = data
    request.method = 'PUT'
  }
  const src = source({id: 'entries', endpoints, adapter: json, beforeSerialize})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  await src.sendSerialized({endpoint: 'send', id: 'ent1', type: 'entry', data: {}})

  t.is(src.sendRaw.callCount, 1)
  const request = src.sendRaw.args[0][0]
  t.is(request.uri, 'http://other.api/1.0/other')
  t.truthy(request.data)
  t.is(request.data.item, data)
  t.is(request.method, 'PUT')
})

test('sendSerialized should get beforeSerialize hook by id', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({id: 'send', uri: 'http://some.api/1.0/{type}:{id}'})]
  const hook = sinon.stub()
  const hooks = {hook}
  const src = source({id: 'entries', endpoints, adapter: json, beforeSerialize: 'hook'}, {hooks})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data})

  await src.sendSerialized({endpoint: 'send', id: 'ent1', type: 'entry', data})

  t.is(hook.callCount, 1)
})

test('sendSerialized should invoke array of beforeSerialize hooks by id', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({id: 'send', uri: 'http://some.api/1.0/{type}:{id}'})]
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const beforeSerialize = ['hook1', 'hook2']
  const src = source({id: 'entries', endpoints, adapter: json, beforeSerialize}, {hooks})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data})

  await src.sendSerialized({endpoint: 'send', id: 'ent1', type: 'entry', data})

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})

// Tests -- send

test('send should exist', (t) => {
  const src = source({id: 'entries', adapter: json})

  t.is(typeof src.send, 'function')
})

test('send should send to endpoint', async (t) => {
  const params = {id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({id: 'send', uri: 'http://some.api/1.0/{type}:{id}'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  const ret = await src.send({endpoint: 'send', params, id: 'ent1', type: 'entry', method: 'POST'})

  t.is(src.sendRaw.callCount, 1)
  const request = src.sendRaw.args[0][0]
  t.truthy(request.endpoint)
  t.is(request.method, 'POST')
  t.deepEqual(ret, {status: 'ok', data: {}})
})

test('send should map data', async (t) => {
  const data = {id: 'ent1', type: 'entry', attributes: {title: 'The heading'}}
  const endpoints = [createEndpoint({id: 'send', uri: 'http://some.api/1.0/entries'})]
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
  const endpoints = [createEndpoint({id: 'send', uri: 'http://some.api/1.0/entries', path: 'root'})]
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
  const request = {endpoint: 'send', id: 'ent1', type: 'entry', data}
  const endpoints = [createEndpoint({id: 'send', uri: 'http://some.api/1.0/{type}:{id}'})]
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})
  sinon.spy(src, 'mapToSource')

  await src.send(request, {useDefaults: true})

  t.is(src.mapToSource.callCount, 1)
  const options = src.mapToSource.args[0][1]
  t.truthy(options)
  t.true(options.useDefaults)
})
