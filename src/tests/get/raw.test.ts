import test from 'node:test'
import assert from 'node:assert/strict'
import nock from 'nock'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import ent1Data from '../helpers/data/entry1.js'
import ent2Data from '../helpers/data/entry2.js'
import { IdentType } from '../../types.js'

import Integreat from '../../index.js'

// Setup

const createdAt = '2017-11-18T18:43:01Z'
const updatedAt = '2017-11-24T07:11:43Z'

test('raw', async (t) => {
  t.after(() => {
    nock.restore()
  })

  // Tests

  await t.test('should get raw response from service for root', async () => {
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
      meta: { ident: { id: 'root', type: IdentType.Root } },
    }
    const expected = { ...ent1Data, createdAt, updatedAt }

    const great = Integreat.create(defs, resources)
    const ret = await great.dispatch(action)

    assert.equal(ret.status, 'ok', ret.error)
    assert.deepEqual(ret.data, expected)
  })

  await t.test('should get raw response from service for user', async () => {
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

    assert.equal(ret.status, 'ok', ret.error)
    assert.deepEqual(ret.data, expected)
  })

  await t.test(
    'should return error when user tries to get raw response',
    async () => {
      nock('http://some.api')
        .get('/entries/ent3')
        .reply(200, { data: { ...ent2Data, createdAt, updatedAt } })
      const action = {
        type: 'GET',
        payload: { id: 'ent3', service: 'entries', rawForRoot: true }, // Flag to trigger raw endpoint
        meta: { ident: { id: 'johnf' } },
      }

      const great = Integreat.create(defs, resources)
      const ret = await great.dispatch(action)

      assert.equal(ret.status, 'noaccess', ret.error)
      assert.deepEqual(ret.data, undefined)
    },
  )
})
