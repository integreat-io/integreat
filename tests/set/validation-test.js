import test from 'ava'
import nock from 'nock'
import json from 'integreat-adapter-json'
import defs from '../helpers/defs'

import integreat from '../..'

// Helpers

const createdAt = new Date()
const updatedAt = new Date()

const entryWithAuthor = {
  id: 'ent1',
  type: 'entry',
  attributes: {
    title: 'Entry 1',
    createdAt,
    updatedAt
  },
  relationships: {
    author: { id: 'johnf', type: 'user' }
  }
}

const entryWithoutAuthor = {
  id: 'ent2',
  type: 'entry',
  attributes: {
    title: 'Entry 2',
    createdAt,
    updatedAt
  },
  relationships: {}
}

test.after.always(() => {
  nock.restore()
})

const alwaysOk = () => null

const shouldHaveAuthor = (action) =>
  (action.payload.data && action.payload.data.relationships.author)
    ? null
    : { status: 'badrequest', error: 'Error from validator' }

const isNumericId = (action) => (isNaN(action.payload.id)) ? { status: 'badrequest', error: 'Not number' } : null

defs.services[0].endpoints.push({
  match: { action: 'SET', scope: 'member' },
  validate: ['alwaysOk', 'shouldHaveAuthor'],
  options: { uri: '/{id}' }
})
defs.services[0].endpoints.push({
  match: { action: 'REQUEST', filters: { 'params.id': { type: 'string' } } },
  validate: 'isNumericId',
  options: { uri: '/{id}', actionType: 'GET' }
})

const adapters = { json: json() }
const transformers = { alwaysOk, shouldHaveAuthor, isNumericId }

// Tests

test('should respond with response from validation when not validated', async (t) => {
  const scope = nock('http://some.api')
    .put('/entries/ent2')
    .reply(201, { data: { key: 'ent2', ok: true } })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entryWithoutAuthor },
    meta: { ident: { root: true } }
  }

  const great = integreat(defs, { adapters, transformers })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'badrequest', ret.error)
  t.is(ret.error, 'Error from validator')
  t.false(scope.isDone())
})

test('should respond with ok when validated', async (t) => {
  const scope = nock('http://some.api')
    .put('/entries/ent1')
    .reply(201, { data: { key: 'ent1', ok: true } })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entryWithAuthor },
    meta: { ident: { root: true } }
  }

  const great = integreat(defs, { adapters, transformers })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(typeof ret.error, 'undefined')
  t.true(scope.isDone())
})

test('should respond with response from validation when not validated - REQUEST', async (t) => {
  const action = {
    type: 'REQUEST',
    payload: { type: 'entry', id: 'invalid' },
    meta: { ident: { root: true } }
  }

  const great = integreat(defs, { adapters, transformers })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'badrequest', ret.error)
  t.is(ret.error, 'Not number')
})
