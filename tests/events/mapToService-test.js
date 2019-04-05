import test from 'ava'
import sinon from 'sinon'
import nock from 'nock'
import json from 'integreat-adapter-json'
import defs from '../helpers/defs'

import integreat from '../..'

// Helpers

const entry1Item = {
  id: 'ent1',
  type: 'entry',
  attributes: {
    title: 'Entry 1',
    text: 'The text of entry 1'
  },
  relationships: {
    author: { id: 'johnf', type: 'user' },
    sections: [{ id: 'news', type: 'section' }, { id: 'sports', type: 'section' }]
  }
}

// Tests

test('should emit request before mapping to service', async (t) => {
  const adapters = { json }
  nock('http://some.api')
    .put('/entries/ent1')
    .reply(201, { id: 'ent1', ok: true, rev: '1-12345' })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entry1Item },
    meta: { ident: { root: true } }
  }
  const handler = sinon.stub()
  const expectedData = entry1Item

  const great = integreat(defs, { adapters })
  great.on('mapToService', 'entries', handler)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(handler.callCount, 1)
  const request = handler.args[0][0]
  t.is(request.action, 'SET')
  t.deepEqual(request.data, expectedData)

  nock.restore()
})

test('should emit request after mapping to service', async (t) => {
  const adapters = { json }
  nock('http://some.api')
    .put('/entries/ent2')
    .reply(201, { id: 'ent2', ok: true, rev: '1-12346' })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: { ...entry1Item, id: 'ent2' } },
    meta: { ident: { root: true } }
  }
  const handler = sinon.stub()

  const great = integreat(defs, { adapters })
  great.on('mappedToService', 'entries', handler)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(handler.callCount, 1)
  const request = handler.args[0][0]
  t.is(request.action, 'SET')
  t.is(request.data.key, 'ent2')

  nock.restore()
})
