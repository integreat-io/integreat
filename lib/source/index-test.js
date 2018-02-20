import test from 'ava'
import sinon from 'sinon'
import json from '../adapters/json'
import datatype from '../datatype'
import setupMapping from '../mapping'
import createEndpoint from '../../tests/helpers/createEndpoint'

import setupSource from '.'

// Helpers

const datatypes = {
  entry: datatype({
    id: 'entry',
    plural: 'entries',
    attributes: {
      title: 'string',
      one: {type: 'integer', default: 1},
      two: 'integer'
    },
    relationships: {
      source: 'source'
    }
  }),
  account: datatype({
    id: 'account',
    attributes: {
      name: 'string'
    },
    access: {
      identFromField: 'id',
      actions: {
        TEST: 'all'
      }
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
      attributes: {
        id: 'key',
        title: 'header',
        one: 'one',
        two: 'two'
      },
      relationships: {
        source: {param: 'source'}
      }
    },
    {datatypes}
  ),
  setupMapping(
    {type: 'item', source: 'entries'},
    {datatypes}
  ),
  setupMapping({
    type: 'account', source: ['entries', 'accounts'], path: 'accounts', attributes: {id: {}, name: {}}
  }, {datatypes})
]

// Tests

test('should return source object with id, adapter, endpoints, and meta', (t) => {
  const endpoints = [createEndpoint({id: 'endpoint1', uri: 'http://some.api/1.0'})]
  const def = {id: 'entries', adapter: 'json', endpoints, meta: 'meta'}
  const adapters = {json}

  const src = setupSource(def, {adapters})

  t.is(src.id, 'entries')
  t.is(src.adapter, json)
  t.is(src.endpoints.length, 1)
  t.is(src.endpoints[0].id, 'endpoint1')
  t.is(src.meta, 'meta')
})

test('should throw when no id', (t) => {
  const adapters = {json}

  t.throws(() => {
    setupSource({adapter: 'json'}, {adapters})
  })
})

test('should throw when no adapter', (t) => {
  t.throws(() => {
    setupSource({id: 'entries'})
  })
})

// Tests -- prepareRequest

test('prepareRequest should return complete request', (t) => {
  const auth = {id: 'auth1'}
  const source = setupSource({id: 'accounts', adapter: json, auth}, {mappings})
  const request = {
    action: 'SET',
    data: [
      {id: 'johnf', type: 'account'},
      {id: 'betty', type: 'account'}
    ],
    endpoint: {uri: 'http://some.api/1.0'},
    params: {
      id: 'johnf',
      type: 'account'
    },
    access: {ident: {id: 'johnf'}}
  }
  const expected = {
    action: 'SET',
    type: 'account',
    data: [{id: 'johnf', type: 'account'}],
    endpoint: {
      uri: ['http://some.api/1.0'],
      body: null,
      method: null,
      path: null
    },
    headers: {},
    auth: {id: 'auth1'},
    params: {
      id: 'johnf',
      type: 'account',
      typePlural: 'accounts',
      ident: 'johnf'
    },
    access: {
      status: 'partially',
      scheme: 'data',
      ident: {id: 'johnf'}
    }
  }

  const ret = source.prepareRequest(request)

  t.deepEqual(ret, expected)
})

// Tests -- prepareResponse

test('prepareResponse should return authorized response', (t) => {
  const auth = {id: 'auth1'}
  const source = setupSource({id: 'accounts', adapter: json, auth}, {mappings})
  const request = {
    action: 'GET',
    endpoint: {uri: 'http://some.api/1.0'},
    params: {
      type: 'account'
    },
    access: {ident: {id: 'johnf'}}
  }
  const response = {
    status: 'ok',
    data: [
      {id: 'johnf', type: 'account'},
      {id: 'betty', type: 'account'}
    ],
    access: {
      status: 'granted',
      scheme: null,
      ident: {id: 'johnf'}
    }
  }
  const expected = {
    status: 'ok',
    data: [
      {id: 'johnf', type: 'account'}
    ],
    access: {
      status: 'partially',
      scheme: 'data',
      ident: {id: 'johnf'}
    }
  }

  const ret = source.prepareResponse(response, request)

  t.deepEqual(ret, expected)
})

// Tests -- mapFromSource

test('mapFromSource should map and cast data', (t) => {
  const def = {id: 'entries', adapter: json}
  const source = setupSource(def, {mappings})
  const data = {items: [{key: 'ent1', header: 'The heading', two: 2}]}
  const params = {source: 'thenews'}
  const expected = [{
    id: 'ent1',
    type: 'entry',
    attributes: {
      title: 'The heading',
      two: 2
    },
    relationships: {
      source: {id: 'thenews', type: 'source'}
    }
  }]

  const ret = source.mapFromSource(data, {type: 'entry', params})

  t.deepEqual(ret, expected)
})

test('mapFromSource should cast data with defaults', (t) => {
  const def = {id: 'entries', adapter: json}
  const source = setupSource(def, {mappings})
  const data = {items: [{key: 'ent1'}]}

  const ret = source.mapFromSource(data, {type: 'entry', useDefaults: true})

  t.is(ret[0].attributes.one, 1)
})

test('mapFromSource should map and cast data that is not array', (t) => {
  const def = {id: 'entries', adapter: json}
  const source = setupSource(def, {mappings})
  const data = {items: {key: 'ent1'}}

  const ret = source.mapFromSource(data, {type: 'entry'})

  t.is(ret.length, 1)
  t.is(ret[0].id, 'ent1')
})

test('mapFromSource should map and cast data of different types', (t) => {
  const def = {id: 'entries', adapter: json}
  const source = setupSource(def, {mappings})
  const data = {
    items: [{key: 'ent1', header: 'The heading'}],
    accounts: [{id: 'acc1', name: 'John'}]
  }
  const expected = [
    {
      id: 'ent1',
      type: 'entry',
      attributes: {title: 'The heading'},
      relationships: {}
    },
    {
      id: 'acc1',
      type: 'account',
      attributes: {name: 'John'},
      relationships: {}
    }
  ]

  const ret = source.mapFromSource(data, {type: ['entry', 'account']})

  t.deepEqual(ret, expected)
})

test('mapFromSource should return empty array when no type', (t) => {
  const def = {id: 'entries', adapter: json}
  const source = setupSource(def, {mappings})
  const data = {}

  const ret = source.mapFromSource(data, {type: null})

  t.deepEqual(ret, [])
})

test('mapFromSource should skip unknown types', (t) => {
  const def = {id: 'entries', adapter: json}
  const source = setupSource(def, {mappings})
  const data = {}

  const ret = source.mapFromSource(data, {type: 'unknown'})

  t.deepEqual(ret, [])
})

test('mapFromSource should return empty array when no data', (t) => {
  const def = {id: 'entries', adapter: json}
  const source = setupSource(def, {mappings})
  const data = null

  const ret = source.mapFromSource(data, {type: 'entry'})

  t.deepEqual(ret, [])
})

test('mapFromSource should return empty array when path points to undefined', (t) => {
  const def = {id: 'entries', adapter: json}
  const source = setupSource(def, {mappings})
  const data = {items: null}

  const ret = source.mapFromSource(data, {type: 'entry'})

  t.deepEqual(ret, [])
})

test('mapFromSource should use mapping defined for several sources', (t) => {
  const def = {id: 'entries', adapter: json}
  const mappings = [setupMapping({
    type: 'entry',
    source: ['entries', 'stories'],
    attributes: {id: 'key'}
  }, {datatypes})]
  const source = setupSource(def, {mappings})
  const data = [{key: 'ent1'}]

  const ret = source.mapFromSource(data, {type: 'entry'})

  t.is(ret.length, 1)
  t.is(ret[0].id, 'ent1')
})

test('mapFromSource should use mapping referenced by id', (t) => {
  const def = {id: 'entries', adapter: json, mappings: ['entriesMapping']}
  const mappings = [setupMapping({
    id: 'entriesMapping',
    type: 'entry',
    attributes: {id: 'key'}
  }, {datatypes})]
  const source = setupSource(def, {mappings})
  const data = [{key: 'ent1'}]

  const ret = source.mapFromSource(data, {type: 'entry'})

  t.is(ret.length, 1)
  t.is(ret[0].id, 'ent1')
})

test('mapFromSource should skip mappings referenced by unknown id', (t) => {
  const def = {id: 'entries', adapter: json, mappings: ['unknown']}
  const mappings = []
  const source = setupSource(def, {mappings})
  const data = [{key: 'ent1'}]

  const ret = source.mapFromSource(data, {type: 'entry'})

  t.deepEqual(ret, [])
})

// Tests -- mapToSource

test('mapToSource should map data', (t) => {
  const def = {id: 'entries', adapter: json}
  const source = setupSource(def, {mappings})
  const data = {id: 'ent1', type: 'entry', attributes: {title: 'The heading'}}
  const expected = {items: {key: 'ent1', header: 'The heading'}}

  const ret = source.mapToSource(data)

  t.deepEqual(ret, expected)
})

test('mapToSource should map array of data', (t) => {
  const def = {id: 'entries', adapter: json}
  const source = setupSource(def, {mappings})
  const data = [{id: 'ent1', type: 'entry', attributes: {title: 'The heading'}}]
  const expected = [{items: {key: 'ent1', header: 'The heading'}}]

  const ret = source.mapToSource(data)

  t.deepEqual(ret, expected)
})

test('mapToSource should skip items with unknown type', (t) => {
  const def = {id: 'entries', adapter: json}
  const source = setupSource(def, {mappings})
  const data = [{id: 'strange1', type: 'unknown'}]
  const expected = []

  const ret = source.mapToSource(data)

  t.deepEqual(ret, expected)
})

test('mapToSource should return null for object item with unknown type', (t) => {
  const def = {id: 'entries', adapter: json}
  const source = setupSource(def, {mappings})
  const data = {id: 'strange1', type: 'unknown'}
  const expected = null

  const ret = source.mapToSource(data)

  t.deepEqual(ret, expected)
})

test('mapToSource should return null when no data', (t) => {
  const def = {id: 'entries', adapter: json}
  const source = setupSource(def, {mappings})
  const data = null
  const expected = null

  const ret = source.mapToSource(data)

  t.deepEqual(ret, expected)
})

test('mapToSource should return empty array when data from array', (t) => {
  const def = {id: 'entries', adapter: json}
  const source = setupSource(def, {mappings})
  const data = []
  const expected = []

  const ret = source.mapToSource(data)

  t.deepEqual(ret, expected)
})

// Tests -- retrieveRaw

test('retrieveRaw should retrieve from endpoint through the adapter', async (t) => {
  const response = {}
  const send = sinon.stub().resolves(response)
  const adapter = {send}
  const src = setupSource({id: 'entries', adapter})
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
  const src = setupSource({id: 'entries', adapter})
  const request = {
    type: 'entry',
    params: {id: 'ent1'},
    endpoint: {uri: ['http://some.api/1.0/']}
  }

  await src.retrieveRaw(request)

  t.is(send.args[0][0], request)
})

test('retrieveRaw should retrieve from endpoint with POST method', async (t) => {
  const expected = {}
  const send = sinon.stub().resolves(expected)
  const adapter = {send}
  const src = setupSource({id: 'entries', adapter})
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
  const src = setupSource({id: 'entries', adapter})

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
  const src = setupSource({id: 'entries', adapter, beforeRetrieve})

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
  const src = setupSource({id: 'entries', adapter, beforeRetrieve})

  await src.retrieveRaw({uri: 'http://other.api/1.0/'})

  t.is(send.callCount, 1)
  const request = send.args[0][0]
  t.is(request.uri, uri)
})

test('retrieveRaw should get beforeRetrieve hook by id', async (t) => {
  const adapter = {send: async () => ({})}
  const hook = sinon.stub()
  const hooks = {hook}
  const src = setupSource({id: 'entries', adapter, beforeRetrieve: 'hook'}, {hooks})

  await src.retrieveRaw({endpoint: {}, type: 'entry'})

  t.is(hook.callCount, 1)
})

test('retrieveRaw should invoke array of beforeRetrieve hooks by id', async (t) => {
  const adapter = {send: async () => ({})}
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const beforeRetrieve = ['hook1', 'hook2']
  const src = setupSource({id: 'entries', adapter, beforeRetrieve}, {hooks})

  await src.retrieveRaw({endpoint: {}, type: 'entry'})

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})

test('retrieveRaw should invoke afterRetrieve hook', async (t) => {
  const response = {}
  const adapter = {send: async () => response}
  const afterRetrieve = sinon.stub()
  const src = setupSource({id: 'entries', adapter, afterRetrieve})

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
  const src = setupSource({id: 'entries', adapter, afterRetrieve})

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
  const src = setupSource({id: 'entries', adapter, afterRetrieve})

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
  const src = setupSource({id: 'entries', adapter, afterRetrieve: 'hook'}, {hooks})

  await src.retrieveRaw({endpoint: {}, type: 'entry'})

  t.is(hook.callCount, 1)
})

test('retrieveRaw should invoke array of afterRetrieve hooks by id', async (t) => {
  const adapter = {send: async () => ({})}
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const afterRetrieve = ['hook1', 'hook2']
  const src = setupSource({id: 'entries', adapter, afterRetrieve}, {hooks})

  await src.retrieveRaw({endpoint: {}, type: 'entry'})

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})

// test -- retrieve

test('retrieve should retrieve from endpoint', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0', path: 'item'})]
  const mappings = [{type: 'entry', source: 'entries', datatype: {id: 'entry', access: {ident: 'johnf'}}}]
  const src = setupSource({id: 'entries', endpoints, adapter: json}, {mappings})
  const request = src.prepareRequest({params: {id: 'ent1', type: 'entry'}, access: {ident: {id: 'johnf'}}})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {id: 'ent1', type: 'entry'}}})
  const expected = {
    status: 'ok',
    data: {id: 'ent1', type: 'entry'},
    access: {status: 'granted', ident: {id: 'johnf'}, scheme: {ident: 'johnf'}}
  }

  const ret = await src.retrieve(request)

  t.deepEqual(ret, expected)
})

test('retrieve should return error when no endpoint', async (t) => {
  const src = setupSource({id: 'entries', adapter: json})
  const request = src.prepareRequest({type: 'entry', params: {id: 'ent1'}})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok'})

  const ret = await src.retrieve(request)

  t.is(ret.status, 'error')
  t.is(src.retrieveRaw.callCount, 0)
})

test('retrieve should return noaccess when request is refused', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0', path: 'item'})]
  const mappings = [{type: 'entry', source: 'entries', datatype: {id: 'entry', access: 'none'}}]
  const src = setupSource({id: 'entries', endpoints, adapter: json}, {mappings})
  const request = src.prepareRequest({params: {type: 'entry', id: 'ent1'}})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {id: 'ent1', type: 'entry'}}})

  const ret = await src.retrieve(request)

  t.is(ret.status, 'noaccess', ret.error)
  t.is(typeof ret.error, 'string')
})

test('retrieve should return null when normalize returns null', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}', path: 'item'})]
  const adapter = {
    prepareEndpoint: json.prepareEndpoint,
    normalize: async () => null
  }
  const src = setupSource({id: 'entries', endpoints, adapter})
  const request = src.prepareRequest({type: 'entry', params: {id: 'ent1'}})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {id: 'ent1', type: 'entry'}}})

  const ret = await src.retrieve(request)

  t.is(ret.status, 'ok')
  t.is(ret.data, null)
})

test('retrieve should return error from retrieveRaw', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}'})]
  const src = setupSource({id: 'entries', endpoints, adapter: json})
  const request = src.prepareRequest({type: 'entry', params: {id: 'unknown'}})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'notfound', error: 'The entry was not found'})

  const ret = await src.retrieve(request)

  t.is(ret.status, 'notfound')
  t.is(ret.error, 'The entry was not found')
})

test('retrieve should return error when normalize rejects', async (t) => {
  const data = {}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0'})]
  const adapter = {
    prepareEndpoint: json.prepareEndpoint,
    async send () { return {status: 'ok', data} },
    async normalize () { return Promise.reject(new Error('Mistakes!')) }
  }
  const src = setupSource({id: 'entries', endpoints, adapter})
  const request = src.prepareRequest({})

  await t.notThrows(async () => {
    const ret = await src.retrieve(request)

    t.is(ret.status, 'error')
    t.regex(ret.error, /Mistakes!/)
  })
})

test('retrieve should invoke afterNormalize hook', async (t) => {
  const item = {}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'})]
  const afterNormalize = sinon.stub()
  const src = setupSource({id: 'entries', endpoints, adapter: json, afterNormalize})
  const request = src.prepareRequest({type: 'entry', params: {id: 'ent1'}})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item}})

  await src.retrieve(request)

  t.is(afterNormalize.callCount, 1)
  const response = afterNormalize.args[0][0]
  t.is(response.status, 'ok')
  t.is(response.data, item)
  t.truthy(response)
  const resources = afterNormalize.args[0][1]
  t.truthy(resources)
  t.is(resources.source, src)
})

test('retrieve should allow afterNormalize hook to alter response', async (t) => {
  const endpoints = [createEndpoint({id: 'one', uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'})]
  const afterNormalize = async (response) => {
    response.status = 'error'
    response.data = null
    response.error = 'Some error'
  }
  const src = setupSource({id: 'entries', endpoints, adapter: json, afterNormalize})
  const request = src.prepareRequest({type: 'entry', params: {id: 'ent1'}})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {}}})

  const ret = await src.retrieve(request)

  t.truthy(ret)
  t.is(ret.status, 'error')
  t.is(ret.data, null)
  t.is(ret.error, 'Some error')
})

test('retrieve should get afterNormalize hook from id', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'})]
  const hook = sinon.stub()
  const hooks = {hook}
  const src = setupSource({id: 'entries', endpoints, adapter: json, afterNormalize: 'hook'}, {hooks})
  const request = src.prepareRequest({type: 'entry', params: {id: 'ent1'}})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {}}})

  await src.retrieve(request)

  t.is(hook.callCount, 1)
})

test('retrieve should invoke array of afterNormalize hooks from id', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'})]
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const afterNormalize = ['hook1', 'hook2']
  const src = setupSource({id: 'entries', endpoints, adapter: json, afterNormalize}, {hooks})
  const request = src.prepareRequest({type: 'entry', params: {id: 'ent1'}})
  sinon.stub(src, 'retrieveRaw').resolves({status: 'ok', data: {item: {}}})

  await src.retrieve(request)

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})

// Tests -- sendRaw

test('sendRaw should send data to endpoint through adapter', async (t) => {
  const response = {}
  const send = sinon.stub().resolves(response)
  const adapter = {send}
  const src = setupSource({id: 'entries', adapter})
  const request = {
    action: 'SET',
    type: 'entry',
    params: {id: 'ent1'},
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
  const src = setupSource({id: 'entries', adapter})
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
  const src = setupSource({id: 'entries', adapter, beforeSend})

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
  const src = setupSource({id: 'entries', adapter, beforeSend})

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
  const src = setupSource({id: 'entries', adapter, beforeSend: 'hook'}, {hooks})

  await src.sendRaw({endpoint: {}, data: {}})

  t.is(hook.callCount, 1)
})

test('sendRaw should invoke array of beforeSend hooks by id', async (t) => {
  const adapter = {send: async () => ({})}
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const beforeSend = ['hook1', 'hook2']
  const src = setupSource({id: 'entries', adapter, beforeSend}, {hooks})

  await src.sendRaw({endpoint: {}, data: {}})

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})

test('sendRaw should invoke afterSend hook', async (t) => {
  const response = {status: 'ok', data: {}}
  const adapter = {send: async () => response}
  const afterSend = sinon.stub()
  const src = setupSource({id: 'entries', adapter, afterSend})

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
  const src = setupSource({id: 'entries', adapter, afterSend})

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
  const src = setupSource({id: 'entries', adapter, afterSend})

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
  const src = setupSource({id: 'entries', adapter, afterSend: 'hook'}, {hooks})

  await src.sendRaw({endpoint: {}, data: {}})

  t.is(hook.callCount, 1)
})

test('sendRaw should invoke array of afterSend hooks by id', async (t) => {
  const adapter = {send: async () => ({})}
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const afterSend = ['hook1', 'hook2']
  const src = setupSource({id: 'entries', adapter, afterSend}, {hooks})

  await src.sendRaw({endpoint: {}, data: {}})

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})

// Tests -- send

test('send should send to endpoint', async (t) => {
  const data = [{id: 'ent1', type: 'entry'}]
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0', path: 'item', method: 'POST'})]
  const mappings = [{type: 'entry', source: 'entries', datatype: {id: 'entry', access: {ident: 'johnf'}}}]
  const src = setupSource({id: 'entries', endpoints, adapter: json}, {mappings})
  const request = src.prepareRequest({action: 'SET', data, access: {ident: {id: 'johnf'}}})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: [{}]})
  const expected = {
    ...request,
    data: {item: [{id: 'ent1', type: 'entry'}]}
  }

  const ret = await src.send(request)

  t.is(ret.status, 'ok')
  t.is(src.sendRaw.callCount, 1)
  t.deepEqual(src.sendRaw.args[0][0], expected)
})

test('send should return error when no endpoint', async (t) => {
  const src = setupSource({id: 'entries', adapter: {}})
  const request = src.prepareRequest({endpoint: 'unknown'})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok'})

  const ret = await src.send(request)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('send should return noaccess when request is refused', async (t) => {
  const data = [{id: 'ent1', type: 'entry'}]
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0', path: 'item', method: 'POST'})]
  const mappings = [{type: 'entry', source: 'entries', datatype: {id: 'entry', access: {ident: 'johnf'}}}]
  const src = setupSource({id: 'entries', endpoints, adapter: json}, {mappings})
  const request = src.prepareRequest({action: 'SET', params: {type: 'entry'}, data})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: [{}]})

  const ret = await src.send(request)

  t.is(ret.status, 'noaccess', ret.error)
  t.is(typeof ret.error, 'string')
})

test('send should return error when serialize rejects', async (t) => {
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
  const src = setupSource(def, {mappings})
  const data = {id: 'ent1', type: 'entry'}
  const request = src.prepareRequest({data})

  await t.notThrows(async () => {
    const ret = await src.send(request)

    t.is(ret.status, 'error')
    t.regex(ret.error, /Mistakes!/)
  })
})

test('send should invoke beforeSerialize hook', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'})]
  const beforeSerialize = sinon.stub()
  const src = setupSource({id: 'entries', endpoints, adapter: json, beforeSerialize})
  const request = src.prepareRequest({type: 'entry', data, params: {id: 'ent1'}})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  await src.send(request)

  t.is(beforeSerialize.callCount, 1)
  const req = beforeSerialize.args[0][0]
  t.truthy(req)
  t.is(req.data, data)
  const resources = beforeSerialize.args[0][1]
  t.truthy(resources)
  t.is(resources.source, src)
})

test('send should allow beforeSerialize hook to alter request', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}', path: 'item', method: 'POST'})]
  const beforeSerialize = async (request) => {
    request.uri = 'http://other.api/1.0/other'
    request.data = data
    request.method = 'PUT'
  }
  const src = setupSource({id: 'entries', endpoints, adapter: json, beforeSerialize})
  const request = src.prepareRequest({type: 'entry', params: {id: 'ent1'}, data: {}})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data: {}})

  await src.send(request)

  t.is(src.sendRaw.callCount, 1)
  const req = src.sendRaw.args[0][0]
  t.is(req.uri, 'http://other.api/1.0/other')
  t.truthy(req.data)
  t.is(req.data.item, data)
  t.is(req.method, 'PUT')
})

test('send should get beforeSerialize hook by id', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}'})]
  const hook = sinon.stub()
  const hooks = {hook}
  const src = setupSource({id: 'entries', endpoints, adapter: json, beforeSerialize: 'hook'}, {hooks})
  const request = src.prepareRequest({type: 'entry', params: {id: 'ent1'}, data})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data})

  await src.send(request)

  t.is(hook.callCount, 1)
})

test('send should invoke array of beforeSerialize hooks by id', async (t) => {
  const data = {id: 'ent1', type: 'entry'}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0/{type}:{id}'})]
  const hook1 = sinon.stub()
  const hook2 = sinon.stub()
  const hooks = {hook1, hook2}
  const beforeSerialize = ['hook1', 'hook2']
  const src = setupSource({id: 'entries', endpoints, adapter: json, beforeSerialize}, {hooks})
  const request = src.prepareRequest({type: 'entry', params: {id: 'ent1'}, data})
  sinon.stub(src, 'sendRaw').resolves({status: 'ok', data})

  await src.send(request)

  t.is(hook1.callCount, 1)
  t.is(hook2.callCount, 1)
})