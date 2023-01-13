import test from 'ava'
import nock = require('nock')
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import { TypedData } from '../../types.js'

import Integreat from '../../index.js'

// Setup

const createdAt = new Date()
const updatedAt = new Date()

const putData = {
  key: 'ent1',
  headline: 'Entry 1',
  originalTitle: 'Entry 1',
  body: 'The text of entry 1',
  createdAt: createdAt.toISOString(),
  updatedAt: updatedAt.toISOString(),
  authorId: { id: 'johnf', $ref: 'user' },
  sections: [
    { id: 'news', $ref: 'section' },
    { id: 'sports', $ref: 'section' },
  ],
}

test.after.always(() => {
  nock.restore()
})

// Tests

test('should set new entry with raw data as user', async (t) => {
  nock('http://some.api')
    .post('/entries', putData)
    .reply(201, { data: { key: 'ent1', ok: true } })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: putData, rawForAll: true },
    meta: { ident: { id: 'johnf', roles: ['editor'] } },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  const data = ret.data as TypedData[]
  t.true(Array.isArray(data))
  t.is(data[0].id, 'ent1')
})

test('should set new entry with raw data as root', async (t) => {
  const putData2 = { ...putData, key: 'ent2' }
  nock('http://some.api')
    .post('/entries', putData2)
    .reply(201, { data: { key: 'ent2', ok: true } })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: putData2, rawForRoot: true },
    meta: { ident: { id: 'admin', root: true } },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  const data = ret.data as TypedData[]
  t.true(Array.isArray(data))
  t.is(data[0].id, 'ent2')
})

test('should return error when user is setting new entry with raw data', async (t) => {
  const putData3 = { ...putData, key: 'ent3' }
  nock('http://some.api')
    .post('/entries', putData3)
    .reply(201, { data: { key: 'ent3', ok: true } })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: putData3, rawForRoot: true },
    meta: { ident: { id: 'johnf', roles: ['editor'] } },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'noaccess', ret.error)
  t.deepEqual(ret.data, [])
})
