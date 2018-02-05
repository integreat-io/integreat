import test from 'ava'
import nock from 'nock'
import integreat from '../integreat'
import json from '../adapters/json'
import defs from '../../tests/defs'
import johnfData from '../../tests/data/userJohnf'
import ent1Data from '../../tests/data/entry1'

import getIdent from './getIdent'

// Helpers

const great = integreat(defs, {adapters: {json}})
const getSource = () => great.sources.users
const identOptions = {type: 'user'}

const johnfIdent = {id: 'johnf', roles: ['editor'], tokens: ['twitter|23456', 'facebook|12345']}

test.after.always(() => {
  nock.restore()
})

// Tests

test('should exist', (t) => {
  t.is(typeof getIdent, 'function')
})

test('should complete ident with token', async (t) => {
  nock('http://some.api')
    .get('/users')
      .query({tokens: 'twitter|23456'})
      .reply(200, {data: {...johnfData}})
  const ident = {withToken: 'twitter|23456'}
  const expected = {status: 'ok', data: johnfIdent}

  const ret = await getIdent({ident}, {getSource, identOptions})

  t.deepEqual(ret, expected)
})

test('should complete ident with id', async (t) => {
  nock('http://some.api')
    .get('/users/johnf')
      .reply(200, {data: {...johnfData}})
  const ident = {id: 'johnf'}
  const expected = {status: 'ok', data: johnfIdent}

  const ret = await getIdent({ident}, {getSource, identOptions})

  t.deepEqual(ret, expected)
})

test('should return ident with nothing to complete', async (t) => {
  const ident = johnfIdent
  const expected = {status: 'ok', data: johnfIdent}

  const ret = await getIdent({ident}, {getSource: () => null, identOptions})

  t.deepEqual(ret, expected)
})

test('should return null when no props', async (t) => {
  const ident = {}
  const expected = {status: 'ok', data: null}

  const ret = await getIdent({ident}, {getSource, identOptions})

  t.deepEqual(ret, expected)
})

test('should return null when null', async (t) => {
  const ident = null
  const expected = {status: 'ok', data: null}

  const ret = await getIdent({ident}, {getSource, identOptions})

  t.deepEqual(ret, expected)
})

test('should return notfound when ident not found', async (t) => {
  const ident = {id: 'unknown'}

  const ret = await getIdent({ident}, {getSource, identOptions})

  t.truthy(ret)
  t.is(ret.status, 'notfound')
  t.is(typeof ret.error, 'string')
})

test('should complete ident with other prop keys', async (t) => {
  nock('http://some.api')
    .get('/entries')
      .query({author: 'johnf'})
      .reply(200, {data: ent1Data})
  const ident = {id: 'johnf'}
  const identOptions = {
    type: 'entry',
    props: {
      id: 'author',
      roles: 'sections',
      tokens: null
    }
  }
  const getSource = () => great.sources.entries
  const expected = {status: 'ok', data: {id: 'johnf', roles: ['news', 'sports'], tokens: undefined}}

  const ret = await getIdent({ident}, {getSource, identOptions})

  t.deepEqual(ret, expected)
})
