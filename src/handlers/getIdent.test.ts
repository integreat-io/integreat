import test from 'ava'
import nock = require('nock')
import Integreat from '..'
import jsonAdapter from 'integreat-adapter-json'
import { completeExchange } from '../utils/exchangeMapping'
import defs from '../tests/helpers/defs'
import johnfData from '../tests/helpers/data/userJohnf'
import ent1Data from '../tests/helpers/data/entry1'
import { TypedData } from '../types'

import getIdent from './getIdent'

// Setup

const json = jsonAdapter()

const great = Integreat.create(defs, { adapters: { json } })
const getService = () => great.services.users
const dispatch = async () => completeExchange({ status: 'ok' })
const identConfig = { type: 'user' }

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
    .reply(200, { data: { ...johnfData } })
  const exchange = completeExchange({
    type: 'GET_IDENT',
    request: {},
    ident: { withToken: 'twitter|23456' },
  })

  const ret = await getIdent(exchange, dispatch, getService, identConfig)

  t.is(ret.status, 'ok', ret.response.error)
  t.deepEqual(ret.ident, johnfIdent)
  t.is((ret.response.data as TypedData).id, 'johnf')
  t.true(scope.isDone())
})

test('should complete ident with id', async (t) => {
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, { data: { ...johnfData } })
  const exchange = completeExchange({
    type: 'GET_IDENT',
    request: {},
    ident: { id: 'johnf' },
  })

  const ret = await getIdent(exchange, dispatch, getService, identConfig)

  t.is(ret.status, 'ok', ret.response.error)
  t.deepEqual(ret.ident, johnfIdent)
  t.is((ret.response.data as TypedData).id, 'johnf')
})

test('should complete ident with id when more props are present', async (t) => {
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, { data: { ...johnfData } })
  const exchange = completeExchange({
    type: 'GET_IDENT',
    request: {},
    ident: { id: 'johnf', withToken: 'other|34567' },
  })

  const ret = await getIdent(exchange, dispatch, getService, identConfig)

  t.is(ret.status, 'ok', ret.response.error)
  t.deepEqual(ret.ident, johnfIdent)
  t.is((ret.response.data as TypedData).id, 'johnf')
})

test('should return noaction when no props', async (t) => {
  const exchange = completeExchange({
    type: 'GET_IDENT',
    request: {},
    ident: {},
  })

  const ret = await getIdent(exchange, dispatch, getService, identConfig)

  t.is(ret.status, 'noaction')
  t.is(typeof ret.response.error, 'string')
})

test('should return noaction when null', async (t) => {
  const exchange = completeExchange({
    type: 'GET_IDENT',
    request: {},
    ident: undefined,
  })

  const ret = await getIdent(exchange, dispatch, getService, identConfig)

  t.is(ret.status, 'noaction')
  t.is(typeof ret.response.error, 'string')
})

test('should return noaction when no ident options', async (t) => {
  const exchange = completeExchange({
    type: 'GET_IDENT',
    request: {},
    ident: { withToken: 'twitter|23456' },
  })

  const ret = await getIdent(exchange, dispatch, getService, undefined)

  t.is(ret.status, 'noaction')
  t.is(typeof ret.response.error, 'string')
})

test('should return notfound when ident not found', async (t) => {
  const exchange = completeExchange({
    type: 'GET_IDENT',
    request: {},
    ident: { id: 'unknown' },
  })

  const ret = await getIdent(exchange, dispatch, getService, identConfig)

  t.truthy(ret)
  t.is(ret.status, 'notfound')
  t.is(typeof ret.response.error, 'string')
})

test('should complete ident with other prop keys', async (t) => {
  nock('http://some.api')
    .get('/entries')
    .query({ author: 'johnf' })
    .reply(200, { data: ent1Data })
  const exchange = completeExchange({
    type: 'GET_IDENT',
    request: {},
    ident: { id: 'johnf' },
  })
  const identConfig = {
    type: 'entry',
    props: {
      id: 'author',
      roles: 'sections',
      tokens: undefined,
    },
  }
  const getService = () => great.services.entries
  const expectedIdent = {
    id: 'johnf',
    roles: ['news', 'sports'],
    tokens: undefined,
  }

  const ret = await getIdent(exchange, dispatch, getService, identConfig)

  t.is(ret.status, 'ok', ret.response.error)
  t.deepEqual(ret.ident, expectedIdent)
})

// TODO: Best way to treat missing user?
test('should return notfound when unknown service', async (t) => {
  nock('http://some.api')
    .get('/users')
    .query({ tokens: 'twitter|23456' })
    .reply(200, { data: { ...johnfData } })
  const getService = () => undefined
  const exchange = completeExchange({
    type: 'GET_IDENT',
    request: {},
    ident: { withToken: 'twitter|23456' },
  })

  const ret = await getIdent(exchange, dispatch, getService, identConfig)

  t.is(ret.status, 'notfound')
  t.is(typeof ret.response.error, 'string')
})
