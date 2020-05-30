import test from 'ava'
import sinon = require('sinon')
import nock = require('nock')
import defs from '../helpers/defs'
import resources from '../helpers/resources'

import Integreat from '../..'

// Setup

const entry1Item = {
  $type: 'entry',
  id: 'ent1',
  title: 'Entry 1',
  text: 'The text of entry 1',
  author: { id: 'johnf', $ref: 'user' },
  sections: [
    { id: 'news', $ref: 'section' },
    { id: 'sports', $ref: 'section' },
  ],
}

test.after.always(() => {
  nock.restore()
})

// Tests

test.skip('should emit request before mapping to service', async (t) => {
  nock('http://some.api')
    .put('/entries/ent1')
    .reply(201, { id: 'ent1', ok: true, rev: '1-12345' })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entry1Item },
    meta: { ident: { root: true } },
  }
  const handler = sinon.stub()
  const expectedData = entry1Item

  const great = Integreat.create(defs, resources)
  great.on('mapRequest', 'entries', handler)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(handler.callCount, 1)
  const request = handler.args[0][0]
  t.is(request.action, 'SET')
  t.deepEqual(request.data, expectedData)
})

test.skip('should emit request after mapping to service', async (t) => {
  nock('http://some.api')
    .put('/entries/ent2')
    .reply(201, { id: 'ent2', ok: true, rev: '1-12346' })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: { ...entry1Item, id: 'ent2' } },
    meta: { ident: { root: true } },
  }
  const handler = sinon.stub()

  const great = Integreat.create(defs, resources)
  great.on('mappedToService', 'entries', handler)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(handler.callCount, 1)
  const request = handler.args[0][0]
  t.is(request.action, 'SET')
  t.is(request.data.key, 'ent2')
})
