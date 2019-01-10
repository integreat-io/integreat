import test from 'ava'
import sinon from 'sinon'
import nock from 'nock'
import json from 'integreat-adapter-json'
import defs from '../helpers/defs'
import ent1Data from '../helpers/data/entry1'

import integreat from '../..'

test('should emit request and response before mapping from service', async (t) => {
  const adapters = { json }
  nock('http://some.api')
    .get('/entries/ent1')
    .reply(200, { data: ent1Data })
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { root: true } }
  }
  const handler = sinon.stub()

  const great = integreat(defs, { adapters })
  great.on('mapFromService', 'entries', handler)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(handler.callCount, 1)
  t.is(handler.args[0][0].method, 'QUERY')
  const response = handler.args[0][1]
  t.truthy(response.data)
  t.is(response.data.data.key, 'ent1')

  nock.restore()
})

test('should emit request and response after mapping from service', async (t) => {
  const adapters = { json }
  nock('http://some.api')
    .get('/entries/ent1')
    .reply(200, { data: ent1Data })
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { root: true } }
  }
  const handler = sinon.stub()

  const great = integreat(defs, { adapters })
  great.on('mappedFromService', 'entries', handler)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(handler.callCount, 1)
  t.is(handler.args[0][0].method, 'QUERY')
  const response = handler.args[0][1]
  t.truthy(response.data)
  t.is(response.data[0].id, 'ent1')

  nock.restore()
})
