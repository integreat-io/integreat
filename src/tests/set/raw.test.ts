import test from 'node:test'
import assert from 'node:assert/strict'
import nock from 'nock'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import { type TypedData, IdentType } from '../../types.js'

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

test('set raw', async (t) => {
  t.after(() => {
    nock.restore()
  })

  // Tests

  await t.test('should set new entry with raw data as user', async () => {
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

    assert.equal(ret.status, 'ok', ret.error)
    const data = ret.data as TypedData[]
    assert.equal(Array.isArray(data), true)
    assert.equal(data[0].id, 'ent1')
  })

  await t.test('should set new entry with raw data as root', async () => {
    const putData2 = { ...putData, key: 'ent2' }
    nock('http://some.api')
      .post('/entries', putData2)
      .reply(201, { data: { key: 'ent2', ok: true } })
    const action = {
      type: 'SET',
      payload: { data: putData2, service: 'entries', rawForRoot: true },
      meta: { ident: { id: 'root', type: IdentType.Root } },
    }

    const great = Integreat.create(defs, resources)
    const ret = await great.dispatch(action)

    assert.equal(ret.status, 'ok', ret.error)
    const data = ret.data as TypedData[]
    assert.equal(Array.isArray(data), true)
    assert.equal(data[0].id, 'ent2')
  })

  await t.test(
    'should return error when user is setting new entry with raw data',
    async () => {
      const putData3 = { ...putData, key: 'ent3' }
      nock('http://some.api')
        .post('/entries', putData3)
        .reply(201, { data: { key: 'ent3', ok: true } })
      const action = {
        type: 'SET',
        payload: { data: putData3, service: 'entries', rawForRoot: true },
        meta: { ident: { id: 'johnf', roles: ['editor'] } },
      }

      const great = Integreat.create(defs, resources)
      const ret = await great.dispatch(action)

      assert.equal(ret.status, 'noaccess', ret.error)
      assert.deepEqual(ret.data, [])
    },
  )
})
