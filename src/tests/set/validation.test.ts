import test from 'ava'
import nock = require('nock')
import defs from '../helpers/defs'
import resources from '../helpers/resources'
import { TypedData, Action } from '../../types'

import Integreat from '../..'

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

// Lots of typing hoops. Sorry
const shouldHaveAuthor =
  () =>
  (action: unknown): unknown => {
    return ((action as Action).payload?.data as TypedData).author
      ? action
      : {
          ...(action as Action),
          response: {
            ...(action as Action).response,
            status: 'badrequest',
            error: 'Error from validator',
            data: undefined,
          },
        }
  }
const resourcesWithTransformer = {
  ...resources,
  transformers: { ...resources.transformers, shouldHaveAuthor },
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

  const great = Integreat.create(defs, resourcesWithTransformer)
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

  const great = Integreat.create(defs, resourcesWithTransformer)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(typeof ret.error, 'undefined')
  t.true(scope.isDone())
})
