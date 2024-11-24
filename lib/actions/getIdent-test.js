import test from 'ava'
import nock from 'nock'
import sinon from 'sinon'
import integreat from '../integreat'
import json from 'integreat-adapter-json'
import defs from '../../tests/helpers/defs'
import johnfData from '../../tests/helpers/data/userJohnf'
import ent1Data from '../../tests/helpers/data/entry1'

import getIdent from './getIdent'

// Helpers

const great = integreat(defs, { adapters: { json: json() } })
const getService = () => great.services.users
const identOptions = { type: 'user' }

const johnfIdent = {
  id: 'johnf',
  roles: ['editor'],
  tokens: ['twitter|23456', 'facebook|12345'],
}
const johnfItem = {
  id: 'johnf',
  type: 'user',
  attributes: {
    firstname: 'John',
    lastname: 'Fjon',
    roles: ['editor'],
    tokens: ['twitter|23456', 'facebook|12345'],
    username: 'johnf',
    yearOfBirth: 1987,
  },
  relationships: {
    feeds: [
      { id: 'news', type: 'feed' },
      { id: 'social', type: 'feed' },
    ],
  },
}

test.after.always(() => {
  nock.restore()
})

// Tests

test('should complete ident with token', async (t) => {
  nock('http://some.api')
    .get('/users')
    .query({ tokens: 'twitter|23456' })
    .reply(200, { data: { ...johnfData } })
  const ident = { withToken: 'twitter|23456' }
  const expected = {
    status: 'ok',
    data: johnfItem,
    access: { status: 'granted', ident: johnfIdent },
  }

  const ret = await getIdent(
    {
      type: 'GET_IDENT',
      payload: {},
      meta: { ident },
    },
    { getService, identOptions }
  )

  t.deepEqual(ret, expected)
})

test('should complete ident with id', async (t) => {
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, { data: { ...johnfData } })
  const ident = { id: 'johnf' }
  const expected = {
    status: 'ok',
    data: johnfItem,
    access: { status: 'granted', ident: johnfIdent },
  }

  const ret = await getIdent(
    { type: 'GET_IDENT', payload: {}, meta: { ident } },
    { getService, identOptions }
  )

  t.deepEqual(ret, expected)
})

test('should complete ident with id when more props are present', async (t) => {
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, { data: { ...johnfData } })
  const ident = { id: 'johnf', withToken: 'other|34567' }
  const expected = {
    status: 'ok',
    data: johnfItem,
    access: { status: 'granted', ident: johnfIdent },
  }

  const ret = await getIdent(
    { type: 'GET_IDENT', payload: {}, meta: { ident } },
    { getService, identOptions }
  )

  t.deepEqual(ret, expected)
})

test('should return noaction when no props', async (t) => {
  const ident = {}

  const ret = await getIdent(
    { type: 'GET_IDENT', payload: {}, meta: { ident } },
    { getService, identOptions }
  )

  t.is(ret.status, 'noaction')
  t.is(typeof ret.error, 'string')
})

test('should return noaction when null', async (t) => {
  const ident = null

  const ret = await getIdent(
    { type: 'GET_IDENT', payload: {}, meta: { ident } },
    { getService, identOptions }
  )

  t.is(ret.status, 'noaction')
  t.is(typeof ret.error, 'string')
})

test('should return noaction when no ident options', async (t) => {
  const ident = { withToken: 'twitter|23456' }

  const ret = await getIdent(
    { type: 'GET_IDENT', payload: {}, meta: { ident } },
    { getService }
  )

  t.is(ret.status, 'noaction')
  t.is(typeof ret.error, 'string')
})

test('should return notfound when ident not found', async (t) => {
  const ident = { id: 'unknown' }

  const ret = await getIdent(
    { type: 'GET_IDENT', payload: {}, meta: { ident } },
    { getService, identOptions }
  )

  t.truthy(ret)
  t.is(ret.status, 'notfound')
  t.is(typeof ret.error, 'string')
})

test('should complete ident with other prop keys', async (t) => {
  nock('http://some.api')
    .get('/entries')
    .query({ author: 'johnf' })
    .reply(200, { data: ent1Data })
  const ident = { id: 'johnf' }
  const identOptions = {
    type: 'entry',
    props: {
      id: 'author',
      roles: 'sections',
      tokens: null,
    },
  }
  const getService = () => great.services.entries
  const expectedAccess = {
    status: 'granted',
    ident: { id: 'johnf', roles: ['news', 'sports'], tokens: undefined },
  }

  const ret = await getIdent(
    { type: 'GET_IDENT', payload: {}, meta: { ident } },
    { getService, identOptions }
  )

  t.is(ret.status, 'ok')
  t.deepEqual(ret.access, expectedAccess)
})

test('should return error when unknown service', async (t) => {
  nock('http://some.api')
    .get('/users')
    .query({ tokens: 'twitter|23456' })
    .reply(200, { data: { ...johnfData } })
  const getService = () => null
  const ident = { withToken: 'twitter|23456' }

  const ret = await getIdent(
    { type: 'GET_IDENT', payload: {}, meta: { ident } },
    { getService, identOptions }
  )

  t.is(ret.status, 'error')
})
