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
    },
    access: 'auth'
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
      path: 'items[]',
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

  const source = setupSource(def, {adapters})

  t.is(source.id, 'entries')
  t.is(source.adapter, json)
  t.is(source.endpoints.length, 1)
  t.is(source.endpoints[0].id, 'endpoint1')
  t.is(source.meta, 'meta')
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

// Tests -- send

test('send should return complete request', async (t) => {
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
    data: [{id: 'johnf', type: 'account', attributes: {}, relationships: {}}],
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

  const ret = await source.sendRequest(request)

  t.deepEqual(ret.request, expected)
})

test('send should retrieve and map data from endpoint', async (t) => {
  const send = async () => ({
    status: 'ok',
    data: {items: [{key: 'ent1', header: 'Entry 1', two: 2}]}
  })
  const adapter = {...json, send}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0'})]
  const source = setupSource({id: 'entries', endpoints, adapter}, {mappings})
  const request = {
    params: {id: 'ent1', type: 'entry', source: 'thenews'},
    access: {ident: {id: 'johnf'}}
  }
  const expected = {
    status: 'ok',
    data: [{
      id: 'ent1',
      type: 'entry',
      attributes: {title: 'Entry 1', two: 2},
      relationships: {
        source: {id: 'thenews', type: 'source'}
      }
    }],
    access: {status: 'granted', ident: {id: 'johnf'}, scheme: 'data'}
  }

  const {response} = await source.sendRequest(request)

  t.deepEqual(response, expected)
})

test('send should retrieve from endpoint with default values', async (t) => {
  const send = async () => ({
    status: 'ok',
    data: {items: [{key: 'ent1', header: 'Entry 1', two: 2}]}
  })
  const adapter = {...json, send}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0'})]
  const source = setupSource({id: 'entries', endpoints, adapter}, {mappings})
  const request = {
    params: {id: 'ent1', type: 'entry'},
    access: {ident: {id: 'johnf'}}
  }

  const {response} = await source.sendRequest(request, {useDefaults: true})

  const {data} = response
  t.is(data[0].attributes.one, 1)
  t.true(data[0].attributes.createdAt instanceof Date)
  t.true(data[0].attributes.updatedAt instanceof Date)
})

test('send should not map missing data', async (t) => {
  const send = async () => ({
    status: 'notfound',
    error: 'Not found'
  })
  const adapter = {...json, send}
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0'})]
  const source = setupSource({id: 'entries', endpoints, adapter}, {mappings})
  const request = {
    params: {id: 'ent1', type: 'entry'},
    access: {ident: {id: 'johnf'}}
  }

  const {response} = await source.sendRequest(request)

  t.is(typeof response.data, 'undefined')
})

test('send should return authorized response', async (t) => {
  const send = async () => ({
    status: 'ok',
    data: {accounts: [
      {id: 'johnf', type: 'account'},
      {id: 'betty', type: 'account'}
    ]}
  })
  const adapter = {...json, send}
  const auth = {id: 'auth1'}
  const source = setupSource({id: 'accounts', adapter, auth}, {mappings})
  const request = {
    action: 'GET',
    endpoint: {uri: 'http://some.api/1.0'},
    params: {type: 'account'},
    access: {ident: {id: 'johnf'}}
  }
  const expected = {
    status: 'ok',
    data: [
      {id: 'johnf', type: 'account', attributes: {}, relationships: {}}
    ],
    access: {
      status: 'partially',
      scheme: 'data',
      ident: {id: 'johnf'}
    }
  }

  const ret = await source.sendRequest(request)

  t.deepEqual(ret.response, expected)
})

test('send should map and send data to source', async (t) => {
  const send = sinon.stub().resolves({status: 'ok', data: []})
  const adapter = {...json, send}
  const source = setupSource({id: 'entries', adapter}, {mappings})
  const request = {
    action: 'SET',
    data: [{id: 'ent1', type: 'entry', attributes: {title: 'The heading'}}],
    params: {type: 'entry'},
    endpoint: {uri: 'http://some.api/1.0'},
    access: {ident: {id: 'johnf'}}
  }
  const expectedData = {items: [{key: 'ent1', header: 'The heading'}]}

  const {response} = await source.sendRequest(request)

  t.is(response.status, 'ok')
  t.is(send.callCount, 1)
  const sentRequest = send.args[0][0]
  t.truthy(sentRequest)
  t.deepEqual(sentRequest.data, expectedData)
})

test('send should use mapping referenced by id', async (t) => {
  const send = async () => ({status: 'ok', data: [{key: 'ent1'}]})
  const adapter = {...json, send}
  const mappings = [setupMapping({
    id: 'entriesMapping',
    type: 'entry',
    attributes: {id: 'key'}
  }, {datatypes})]
  const source = setupSource(
    {id: 'entries', adapter, mappings: ['entriesMapping']},
    {mappings}
  )
  const request = {
    params: {type: 'entry'},
    endpoint: {uri: 'http://some.api/1.0'},
    access: {ident: {id: 'johnf'}}
  }

  const {response} = await source.sendRequest(request)

  t.is(response.data.length, 1)
  t.is(response.data[0].id, 'ent1')
})

test('send should skip mappings referenced by unknown id', async (t) => {
  const send = async () => ({status: 'ok', data: [{key: 'ent1'}]})
  const adapter = {...json, send}
  const source = setupSource(
    {id: 'entries', adapter, mappings: ['unknown']},
    {mappings: []}
  )
  const request = {
    params: {type: 'entry'},
    endpoint: {uri: 'http://some.api/1.0'},
    access: {ident: {id: 'johnf'}}
  }

  const {response} = await source.sendRequest(request)

  t.deepEqual(response.data, [])
})
