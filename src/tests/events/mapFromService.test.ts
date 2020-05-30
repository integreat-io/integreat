import test from 'ava'
import sinon = require('sinon')
import nock = require('nock')
import defs from '../helpers/defs'
import resources from '../helpers/resources'
import ent1Data from '../helpers/data/entry1'

import Integreat from '../..'

// Setup

test.after.always(() => {
  nock.restore()
})

// Tests

test.skip('should emit request and response before mapping from service', async (t) => {
  nock('http://some.api').get('/entries/ent1').reply(200, { data: ent1Data })
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { root: true } },
  }
  const handler = sinon.stub()

  const great = Integreat.create(defs, resources)
  great.on('mapResponse', 'entries', handler)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(handler.callCount, 1)
  const response = handler.args[0][1]
  t.truthy(response.data)
  t.is(response.data.data.key, 'ent1')
})

test.skip('should emit request and response after mapping from service', async (t) => {
  nock('http://some.api').get('/entries/ent1').reply(200, { data: ent1Data })
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { root: true } },
  }
  const handler = sinon.stub()

  const great = Integreat.create(defs, resources)
  great.on('mappedFromService', 'entries', handler)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(handler.callCount, 1)
  const response = handler.args[0][1]
  t.truthy(response.data)
  t.is(response.data.id, 'ent1')
})
