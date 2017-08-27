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
  const endpoint = 'http://some.api/1.0/'
  const expected = {}
  const retrieve = sinon.stub().returns(Promise.resolve(expected))
  const adapter = {retrieve}
  const src = source({id: 'entries', adapter})

  const ret = await src.retrieveRaw(endpoint)

  t.true(retrieve.calledOnce)
  t.true(retrieve.calledWith(endpoint))
  t.is(ret, expected)
})

test('retrieveRaw should use auth', async (t) => {
  const endpoint = 'http://some.api/1.0/'
  const oauth = {}
  const auths = {oauth}
  const retrieve = sinon.stub().returns(Promise.resolve({}))
  const adapter = {retrieve}
  const src = source({id: 'entries', adapter, auth: 'oauth'}, {auths})

  await src.retrieveRaw(endpoint)

  t.true(retrieve.calledWith(endpoint, oauth))
})

test('retrieveRaw should return error when adapter rejects', async (t) => {
  const endpoint = 'http://some.api/1.0/'
  const retrieve = sinon.stub().returns(Promise.reject(new Error('Fail!')))
  const adapter = {retrieve}
  const src = source({id: 'entries', adapter})

  await t.notThrows(async () => {
    const ret = await src.retrieveRaw(endpoint)

    t.truthy(ret)
    t.is(ret.status, 'error')
    t.regex(ret.error, /Fail!/)
  })
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
  sinon.stub(src, 'retrieveRaw').returns(Promise.resolve({status: 'ok', data: {}}))

  const ret = await src.retrieve({endpoint: 'one', params, type: 'entry'})

  t.true(src.retrieveRaw.calledOnce)
  t.true(src.retrieveRaw.calledWith('http://some.api/1.0/entry:ent1'))
  t.deepEqual(ret, {status: 'ok', data: []})
})

test('retrieve should return error for non-existing endpoint', async (t) => {
  const src = source({id: 'entries', adapter: {}})
  sinon.stub(src, 'retrieveRaw').returns(Promise.resolve({}))

  const ret = await src.retrieve({endpoint: 'unknown', type: 'entry'})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('retrieve should return error for missing endpoint params', async (t) => {
  const endpoints = {get: {uri: 'http://some.api/1.0/{type}:{id}'}}
  const src = source({id: 'entries', endpoints, adapter: {}})
  sinon.stub(src, 'retrieveRaw').returns(Promise.resolve({}))

  const ret = await src.retrieve({endpoint: 'get', type: 'entry'})

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.regex(ret.error, /Missing\srequired\sparameter/)
})

test('retrieve should map data', async (t) => {
  const data = {data: [{key: 'ent1', header: 'The heading'}]}
  const endpoints = {all: {uri: 'http://some.api/1.0'}}
  const mappings = {entry: {
    path: 'data',
    attributes: {id: {path: 'key'}, title: {path: 'header'}}
  }}
  const src = source({id: 'entries', endpoints, mappings, adapter: json}, {datatypes})
  sinon.stub(src, 'retrieveRaw').returns(Promise.resolve({status: 'ok', data}))

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
  sinon.stub(src, 'retrieveRaw').returns(Promise.resolve({status: 'ok', data}))

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
  sinon.stub(src, 'retrieveRaw').returns(Promise.resolve({status: 'ok', data}))
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
  sinon.stub(src, 'retrieveRaw').returns(Promise.resolve({status: 'ok', data}))

  const ret = await src.retrieve({endpoint: 'all', type: null})

  t.is(ret.status, 'ok')
  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 0)
  t.is(src.retrieveRaw.callCount, 0)
})

test('retrieve should include default values from type', async (t) => {
  const data = {data: [{id: 'ent1', title: 'The title'}]}
  const datatypes = {entry: datatype({
    id: 'entry', attributes: {byline: {default: 'Somebody'}, title: 'string'}
  })}
  const endpoints = {all: {uri: 'http://some.api/1.0'}}
  const mappings = {entry: {path: 'data', attributes: {title: 'title'}}}
  const src = source({id: 'entries', endpoints, mappings, adapter: json}, {datatypes})
  sinon.stub(src, 'retrieveRaw').returns(Promise.resolve({status: 'ok', data}))

  const ret = await src.retrieve({endpoint: 'all', type: 'entry'})

  t.true(Array.isArray(ret.data))
  t.is(ret.data.length, 1)
  t.truthy(ret.data[0].attributes)
  t.is(ret.data[0].attributes.byline, 'Somebody')
})

test('retrieve should not include rest values', async (t) => {
  const data = {data: [{id: 'ent1'}]}
  const endpoints = {all: {uri: 'http://some.api/1.0'}}
  const mappings = {entry: {path: 'data', attributes: {id: {}}}}
  const datatypes = {entry: datatype({id: 'entry', attributes: {byline: {default: 'Somebody'}}})}
  const src = source({id: 'entries', endpoints, mappings, adapter: json}, {datatypes})
  sinon.stub(src, 'retrieveRaw').returns(Promise.resolve({status: 'ok', data}))

  const ret = await src.retrieve({endpoint: 'all', type: 'entry', mappedValuesOnly: true})

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
  sinon.stub(src, 'retrieveRaw').returns(Promise.resolve({status: 'ok', data}))

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
  sinon.stub(src, 'retrieveRaw').returns(Promise.resolve({status: 'notfound', error: 'The entry was not found'}))

  const ret = await src.retrieve({endpoint: 'one', params, type: 'entry'})

  t.deepEqual(ret, {status: 'notfound', error: 'The entry was not found'})
})

test('retrieve should return error when mapFromSource rejects', async (t) => {
  const data = {data: [{key: 'ent1', header: 'The heading'}]}
  const endpoints = {all: {uri: 'http://some.api/1.0'}}
  const mappings = {entry: {
    path: 'data',
    attributes: {id: {path: 'key'}, title: {path: 'header'}}
  }}
  const adapter = {
    async retrieve () { return {status: 'ok', data} },
    async normalize () { return Promise.reject(new Error('Mistakes!')) }
  }
  const src = source({id: 'entries', endpoints, mappings, adapter}, {datatypes})

  await t.notThrows(async () => {
    const ret = await src.retrieve({endpoint: 'all', type: 'entry'})

    t.is(ret.status, 'error')
    t.regex(ret.error, /Mistakes!/)
  })
})

// Tests -- sendRaw

test('sendRaw should exist', (t) => {
  const src = source({id: 'entries', adapter})

  t.is(typeof src.sendRaw, 'function')
})

test('sendRaw should send data to endpoint through the adapter', async (t) => {
  const endpoint = 'http://some.api/1.0/'
  const data = {}
  const expected = {}
  const send = sinon.stub().returns(Promise.resolve(expected))
  const adapter = {send}
  const src = source({id: 'entries', adapter})

  const ret = await src.sendRaw(endpoint, data)

  t.true(send.calledOnce)
  t.true(send.calledWith(endpoint, data))
  t.is(ret, expected)
})

test('sendRaw should use auth', async (t) => {
  const endpoint = 'http://some.api/1.0/'
  const data = {}
  const auth = {}
  const send = sinon.stub().returns(Promise.resolve({}))
  const adapter = {send}
  const src = source({id: 'entries', adapter, auth})

  await src.sendRaw(endpoint, data)

  t.true(send.calledOnce)
  t.true(send.calledWith(endpoint, data, auth))
})

test('sendRaw should return error when adapter rejects', async (t) => {
  const endpoint = 'http://some.api/1.0/'
  const data = {}
  const send = sinon.stub().returns(Promise.reject(new Error('Fail!')))
  const adapter = {send}
  const src = source({id: 'entries', adapter})

  await t.notThrows(async () => {
    const ret = await src.sendRaw(endpoint, data)

    t.truthy(ret)
    t.is(ret.status, 'error')
    t.regex(ret.error, /Fail!/)
  })
})

test('sendRaw should send data to endpoint with POST method', async (t) => {
  const send = sinon.stub().resolves({})
  const adapter = {send}
  const src = source({id: 'entries', adapter})
  const endpoint = 'http://some.api/1.0/'
  const data = {}
  const method = 'POST'

  await src.sendRaw(endpoint, data, method)

  t.is(send.callCount, 1)
  t.is(send.args[0][3], 'POST')
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
  sinon.stub(src, 'sendRaw').returns(Promise.resolve({status: 200, data: {}}))

  const ret = await src.send({endpoint: 'send', params, data})

  t.true(src.sendRaw.calledOnce)
  t.is(src.sendRaw.args[0][0], 'http://some.api/1.0/entry:ent1')
  t.deepEqual(ret, {status: 200, data: {}})
})

test('send should send to endpoint with POST method', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = {send: {uri: 'http://some.api/1.0/_bulk_docs', method: 'POST'}}
  const src = source({id: 'entries', endpoints, adapter: json})
  sinon.stub(src, 'sendRaw').returns(Promise.resolve({status: 200, data: {}}))

  await src.send({endpoint: 'send', data})

  t.true(src.sendRaw.calledOnce)
  t.is(src.sendRaw.args[0][2], 'POST')
})

test('send should return error for non-existing endpoint', async (t) => {
  const src = source({id: 'entries', adapter: {}})
  sinon.stub(src, 'sendRaw').returns(Promise.resolve({status: 404}))

  const ret = await src.send({endpoint: 'unknown'})

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('send should return error for missing endpoint params', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = {send: {uri: 'http://some.api/1.0/{typefolder}/{type}:{id}'}}
  const src = source({id: 'entries', endpoints, adapter: {}})
  sinon.stub(src, 'retrieveRaw').returns(Promise.resolve({}))

  const ret = await src.send({endpoint: 'send', data})

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.regex(ret.error, /Missing\srequired\sparameter/)
})

test('send should map data', async (t) => {
  const data = {id: 'ent1', type: 'entry', attributes: {title: 'The heading'}}
  const endpoints = {send: {uri: 'http://some.api/1.0/entries'}}
  const mappings = {entry: {
    path: 'data',
    attributes: {id: {path: 'key'}, title: {path: 'header'}}
  }}
  const src = source({id: 'entries', endpoints, mappings, adapter: json}, {datatypes})
  sinon.stub(src, 'sendRaw').returns(Promise.resolve({status: 200, data: {}}))

  const ret = await src.send({endpoint: 'send', data})

  t.true(src.sendRaw.calledOnce)
  t.deepEqual(src.sendRaw.args[0][1], {data: {key: 'ent1', header: 'The heading'}})
  t.deepEqual(ret, {status: 200, data: {}})
})

test('send should use endpoint path', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = {send: {uri: 'http://some.api/1.0/entries', path: 'root'}}
  const mappings = {entry: {path: 'data', attributes: {id: {path: 'key'}}}}
  const src = source({id: 'entries', endpoints, mappings, adapter: json}, {datatypes})
  sinon.stub(src, 'sendRaw').returns(Promise.resolve({status: 200, data: {}}))

  await src.send({endpoint: 'send', data})

  t.true(src.sendRaw.calledOnce)
  t.deepEqual(src.sendRaw.args[0][1], {root: {data: {key: 'ent1'}}})
})

test('send should return error when mapFromSource rejects', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = {send: {uri: 'http://some.api/1.0/entries'}}
  const mappings = {entry: {path: 'data', attributes: {id: {path: 'key'}}}}
  const adapter = {
    async send () { return {status: 'ok'} },
    async serialize () { return Promise.reject(new Error('Mistakes!')) }
  }
  const src = source({id: 'entries', endpoints, mappings, adapter}, {datatypes})

  await t.notThrows(async () => {
    const ret = await src.send({endpoint: 'send', data})

    t.is(ret.status, 'error')
    t.regex(ret.error, /Mistakes!/)
  })
})
