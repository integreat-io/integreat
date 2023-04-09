import test from 'ava'
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

test.after.always(() => {
  nock.restore()
})

// Tests

test('should respond with response from validation when not validated', async (t) => {
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

  t.is(ret.status, 'badrequest', ret.error)
  t.is(ret.error, 'Error from validator')
  t.false(scope.isDone()) // Should not send anything to service
})

test('should respond with ok when validated', async (t) => {
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

  t.is(ret.status, 'ok', ret.error)
  t.is(typeof ret.error, 'undefined')
  t.true(scope.isDone())
})
