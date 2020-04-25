import test from 'ava'
import nock = require('nock')
import jsonAdapter from 'integreat-adapter-json'
import defs from '../helpers/defs'
import { Action, DataObject } from '../../types'

import Integreat from '../..'

// Setup

const json = jsonAdapter()

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

const alwaysOk = () => () => null

const shouldHaveAuthor = () => (action: Action) =>
  (action.payload.data as DataObject).author
    ? null
    : { status: 'badrequest', error: 'Error from validator' }

const isNumericId = () => (action: Action) =>
  isNaN(action.payload.id)
    ? { status: 'badrequest', error: 'Not number' }
    : null

// defs.services[0].endpoints.push({
//   match: { action: 'SET', scope: 'member' },
//   validate: ['alwaysOk', 'shouldHaveAuthor'],
//   options: { uri: '/entries/{id}' }
// })
// defs.services[0].endpoints.push({
//   match: { action: 'REQUEST', filters: { 'params.id': { type: 'string' } } },
//   validate: 'isNumericId',
//   options: { uri: '/entries/{id}', actionType: 'GET' }
// })

const adapters = { json }
const transformers = { alwaysOk, shouldHaveAuthor, isNumericId }

// Tests

// TODO: Solution for validations
test.failing(
  'should respond with response from validation when not validated',
  async (t) => {
    const scope = nock('http://some.api')
      .put('/entries/ent2')
      .reply(201, { data: { key: 'ent2', ok: true } })
    const action = {
      type: 'SET',
      payload: { type: 'entry', data: entryWithoutAuthor },
      meta: { ident: { root: true } },
    }

    const great = Integreat.create(defs, { adapters, transformers })
    const ret = await great.dispatch(action)

    t.is(ret.status, 'badrequest', ret.error)
    t.is(ret.error, 'Error from validator')
    t.false(scope.isDone())
  }
)

test('should respond with ok when validated', async (t) => {
  const scope = nock('http://some.api')
    .put('/entries/ent1')
    .reply(201, { data: { key: 'ent1', ok: true } })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entryWithAuthor },
    meta: { ident: { root: true } },
  }

  const great = Integreat.create(defs, { adapters, transformers })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(typeof ret.error, 'undefined')
  t.true(scope.isDone())
})

// TODO: Solution for validations
test.failing(
  'should respond with response from validation when not validated - REQUEST',
  async (t) => {
    const action = {
      type: 'REQUEST',
      payload: { type: 'entry', id: 'invalid' },
      meta: { ident: { root: true } },
    }

    const great = Integreat.create(defs, { adapters, transformers })
    const ret = await great.dispatch(action)

    t.is(ret.status, 'badrequest', ret.error)
    t.is(ret.error, 'Not number')
  }
)
