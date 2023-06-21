import test from 'ava'
import nock from 'nock'
import Integreat from '../index.js'
import defs from '../tests/helpers/defs/index.js'
import resources from '../tests/helpers/resources/index.js'
import johnfData from '../tests/helpers/data/userJohnf.js'
import ent1Data from '../tests/helpers/data/entry1.js'
import defaultHandlerResources from '../tests/helpers/handlerResources.js'
import type { TypedData } from '../types.js'

import getIdent from './getIdent.js'

// Setup

const great = Integreat.create(defs, resources)
const getService = () => great.services.users
const options = { identConfig: { type: 'user' } }
const handlerResources = { ...defaultHandlerResources, getService, options }

const johnfIdent = {
  id: 'johnf',
  roles: ['editor'],
  tokens: ['twitter|23456', 'facebook|12345'],
}

test.after.always(() => {
  nock.restore()
})

// Tests

test('should complete ident with token', async (t) => {
  const scope = nock('http://some.api')
    .get('/users')
    .query({ tokens: 'twitter|23456' })
    .reply(200, { data: johnfData })
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { withToken: 'twitter|23456' } },
  }
  const expected = {
    ident: johnfIdent,
  }

  const ret = await getIdent(action, handlerResources)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.access, expected)
  t.is((ret.data as TypedData).id, 'johnf')
  t.true(scope.isDone())
})

test('should complete ident with id', async (t) => {
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, { data: { ...johnfData } })
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await getIdent(action, handlerResources)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.access?.ident, johnfIdent)
  t.is((ret.data as TypedData).id, 'johnf')
})

test('should complete ident with id when more props are present', async (t) => {
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, { data: { ...johnfData } })
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { id: 'johnf', withToken: 'other|34567' } },
  }

  const ret = await getIdent(action, handlerResources)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.access?.ident, johnfIdent)
  t.is((ret.data as TypedData).id, 'johnf')
})

test('should return noaction when no props', async (t) => {
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: {} },
  }

  const ret = await getIdent(action, handlerResources)

  t.is(ret.status, 'noaction', ret.error)
  t.is(typeof ret.error, 'string')
})

test('should return noaction when null', async (t) => {
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: undefined },
  }

  const ret = await getIdent(action, handlerResources)

  t.is(ret.status, 'noaction', ret.error)
  t.is(typeof ret.error, 'string')
})

test('should return noaction when no ident options', async (t) => {
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { withToken: 'twitter|23456' } },
  }
  const options = {}

  const ret = await getIdent(action, { ...handlerResources, options })

  t.is(ret.status, 'noaction', ret.error)
  t.is(typeof ret.error, 'string')
})

test('should return notfound when ident not found', async (t) => {
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { id: 'unknown' } },
  }

  const ret = await getIdent(action, handlerResources)

  t.truthy(ret)
  t.is(ret.status, 'notfound', ret.error)
  t.is(typeof ret.error, 'string')
})

test('should complete ident with other prop keys', async (t) => {
  nock('http://some.api')
    .get('/entries')
    .query({ author: 'johnf' })
    .reply(200, { data: ent1Data })
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { id: 'johnf' } },
  }
  const identConfig = {
    type: 'entry',
    props: {
      id: 'author',
      roles: 'sections',
      tokens: undefined,
    },
  }
  const options = { identConfig }
  const getService = () => great.services.entries
  const expectedIdent = {
    id: 'johnf',
    roles: ['news', 'sports'],
    tokens: undefined,
  }

  const ret = await getIdent(action, {
    ...handlerResources,
    getService,
    options,
  })

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.access?.ident, expectedIdent)
})

// TODO: Best way to treat missing user?
test('should return notfound when unknown service', async (t) => {
  nock('http://some.api')
    .get('/users')
    .query({ tokens: 'twitter|23456' })
    .reply(200, { data: { ...johnfData } })
  const getService = () => undefined
  const action = {
    type: 'GET_IDENT',
    payload: {},
    meta: { ident: { withToken: 'twitter|23456' } },
  }

  const ret = await getIdent(action, { ...handlerResources, getService })

  t.is(ret.status, 'notfound')
  t.is(typeof ret.error, 'string')
})
