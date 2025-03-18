import test from 'node:test'
import assert from 'node:assert/strict'
import nock from 'nock'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'

import Integreat from '../../index.js'

// Setup

const createdAt = new Date()
const updatedAt = new Date()

const entryWithAuthor = {
  $type: 'entry',
  id: 'ent1',
  title: 'Entry 1',
  createdAt,
  updatedAt,
  author: { id: 'johnf', type: 'user' },
}

const entryWithoutAuthor = {
  $type: 'entry',
  id: 'ent2',
  title: 'Entry 2',
  createdAt,
  updatedAt,
}

test('set validation', async (t) => {
  t.after(() => {
    nock.restore()
  })

  // Tests

  await t.test(
    'should respond with response from validation when not validated',
    async () => {
      const scope = nock('http://some.api')
        .put('/entries/ent2')
        .reply(201, { data: { key: 'ent2', ok: true } })
      const action = {
        type: 'SET',
        payload: {
          type: 'entry',
          data: entryWithoutAuthor,
          doValidate: true,
        },
        meta: { ident: { id: 'johnf', roles: ['editor'] } },
      }

      const great = Integreat.create(defs, resources)
      const ret = await great.dispatch(action)

      assert.equal(ret.status, 'badrequest', ret.error)
      assert.equal(ret.error, 'Error from validator')
      assert.equal(scope.isDone(), false) // Should not send anything to service
    },
  )

  await t.test('should respond with ok when validated', async () => {
    const scope = nock('http://some.api')
      .put('/entries/ent1')
      .reply(201, { data: { key: 'ent1', ok: true } })
    const action = {
      type: 'SET',
      payload: {
        type: 'entry',
        data: entryWithAuthor,
        doValidate: true,
      },
      meta: { ident: { id: 'johnf', roles: ['editor'] } },
    }

    const great = Integreat.create(defs, resources)
    const ret = await great.dispatch(action)

    assert.equal(ret.status, 'ok', ret.error)
    assert.equal(typeof ret.error, 'undefined')
    assert.equal(scope.isDone(), true)
  })
})
