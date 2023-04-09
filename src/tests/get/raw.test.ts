import test from 'ava'
import nock from 'nock'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import ent1Data from '../helpers/data/entry1.js'
import ent2Data from '../helpers/data/entry2.js'

import Integreat from '../../index.js'

// Setup

const createdAt = '2017-11-18T18:43:01Z'
const updatedAt = '2017-11-24T07:11:43Z'

test.after.always(() => {
  nock.restore()
})

// Tests

test('should get raw response from service for root', async (t) => {
  nock('http://some.api')
    .get('/entries/ent1')
    .reply(200, { data: { ...ent1Data, createdAt, updatedAt } })
  const action = {
    type: 'GET',
    payload: {
      id: 'ent1',
      targetService: 'entries', // Find service by `targetService`
      rawForRoot: true,
    }, // Flag to trigger raw endpoint
    meta: { ident: { id: 'admin', root: true } },
  }
  const expected = { ...ent1Data, createdAt, updatedAt }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)
})

test('should get raw response from service for user', async (t) => {
  nock('http://some.api')
    .get('/entries/ent2')
    .reply(200, { data: { ...ent2Data, createdAt, updatedAt } })
  const action = {
    type: 'GET',
    payload: {
      id: 'ent2',
      service: 'entries', // Find service by alias `service`
      rawForAll: true,
    }, // Flag to trigger raw endpoint
    meta: { ident: { id: 'johnf' } },
  }
  const expected = { ...ent2Data, createdAt, updatedAt }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)
})

test('should return error when user tries to get raw response', async (t) => {
  nock('http://some.api')
    .get('/entries/ent3')
    .reply(200, { data: { ...ent2Data, createdAt, updatedAt } })
  const action = {
    type: 'GET',
    payload: { id: 'ent3', type: 'entry', rawForRoot: true }, // Flag to trigger raw endpoint
    meta: { ident: { id: 'johnf' } },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'noaccess', ret.error)
  t.deepEqual(ret.data, undefined)
})
