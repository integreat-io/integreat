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

// Tests -- send

test('send should retrieve from endpoint', async (t) => {
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0', path: 'item'})]
  const mappings = [{type: 'entry', source: 'entries', datatype: {id: 'entry', access: {ident: 'johnf'}}}]
  const send = sinon.stub().resolves({status: 'ok', data: {item: {id: 'ent1', type: 'entry'}}})
  const adapter = {...json, send}
  const src = setupSource({id: 'entries', endpoints, adapter}, {mappings})
  const request = src.prepareRequest({params: {id: 'ent1', type: 'entry'}, access: {ident: {id: 'johnf'}}})
  const expected = {
    status: 'ok',
    data: {id: 'ent1', type: 'entry'},
    access: {status: 'granted', ident: {id: 'johnf'}, scheme: {ident: 'johnf'}}
  }

  const ret = await src.send(request)

  t.deepEqual(ret, expected)
})

test('send should send to endpoint', async (t) => {
  const data = [{id: 'ent1', type: 'entry'}]
  const endpoints = [createEndpoint({uri: 'http://some.api/1.0', path: 'item', method: 'POST'})]
  const mappings = [{type: 'entry', source: 'entries', datatype: {id: 'entry', access: {ident: 'johnf'}}}]
  const send = sinon.stub().resolves({status: 'ok', data: [{}]})
  const adapter = {...json, send}
  const src = setupSource({id: 'entries', endpoints, adapter}, {mappings})
  const request = src.prepareRequest({action: 'SET', data, access: {ident: {id: 'johnf'}}})
  const expected = {
    ...request,
    data: {item: [{id: 'ent1', type: 'entry'}]}
  }

  const ret = await src.send(request)

  t.is(ret.status, 'ok')
  t.is(send.callCount, 1)
  t.deepEqual(send.args[0][0], expected)
})
