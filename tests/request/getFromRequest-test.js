import test from 'ava'
import sinon from 'sinon'
import nock from 'nock'
import json from 'integreat-adapter-json'
import defs from '../helpers/defs'
import ent1Data from '../helpers/data/entry1'

import integreat from '../..'

// Setup

const createdAt = '2017-11-18T18:43:01.000Z'
const updatedAt = '2017-11-24T07:11:43.000Z'

const serializeData = ({ key, headline, body, createdAt, updatedAt, authorId, sections }) =>
  JSON.stringify([{ key, headline, originalTitle: headline, body, createdAt, updatedAt, authorId, sections }])

test.after.always(() => {
  nock.restore()
})

// Tests

test('should dispatch get action and return respons', async (t) => {
  const send = sinon.stub().resolves({ status: 'ok', data: JSON.stringify({ data: { ...ent1Data, createdAt, updatedAt } }) })
  const resources = { adapters: { json: { ...json, send } } }
  const action = {
    type: 'REQUEST',
    payload: { type: 'entry', data: '{"key":"ent1"}', requestMethod: 'GET' },
    meta: { ident: { id: 'johnf' } }
  }
  const expectedRequestParams = { type: 'entry', id: 'ent1', onlyMappedValues: false }
  const expectedResponse = {
    status: 'ok',
    data: serializeData({ ...ent1Data, createdAt, updatedAt }),
    access: { status: 'granted', ident: { id: 'johnf' }, scheme: 'data' }
  }

  const great = integreat(defs, resources)
  const ret = await great.dispatch(action)

  t.is(send.callCount, 1)
  const sentRequest = send.args[0][0]
  t.is(sentRequest.action, 'GET')
  t.deepEqual(sentRequest.params, expectedRequestParams)
  t.deepEqual(ret, expectedResponse)
})
