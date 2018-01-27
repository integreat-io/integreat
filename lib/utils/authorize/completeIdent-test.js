import test from 'ava'
import nock from 'nock'
import integreat from '../../integreat'
import json from '../../adapters/json'
import defs from '../../../tests/defs'
import johnfData from '../../../tests/data/userJohnf'
import ent1Data from '../../../tests/data/entry1'

import completeIdent from './completeIdent'

// Helpers

const great = integreat(defs, {adapters: {json}})

const johnfIdent = {id: 'johnf', roles: ['editor'], tokens: ['twitter|23456', 'facebook|12345']}

test.after.always(() => {
  nock.restore()
})

// Tests

test('should return already complete ident', async (t) => {
  const ident = johnfIdent

  const ret = await completeIdent({}, {})(ident)

  t.deepEqual(ret, ident)
})

test('should complete ident with token', async (t) => {
  nock('http://some.api')
    .get('/users')
      .query({tokens: 'twitter|23456'})
      .reply(200, {data: {...johnfData}})
  const ident = {token: 'twitter|23456'}
  const source = great.sources.users
  const options = {type: 'user'}
  const expected = johnfIdent

  const ret = await completeIdent(source, options)(ident)

  t.deepEqual(ret, expected)
})

test('should complete ident with id', async (t) => {
  nock('http://some.api')
    .get('/users/johnf')
      .reply(200, {data: {...johnfData}})
  const ident = {id: 'johnf'}
  const source = great.sources.users
  const options = {type: 'user'}
  const expected = johnfIdent

  const ret = await completeIdent(source, options)(ident)

  t.deepEqual(ret, expected)
})

test('should return null when no props', async (t) => {
  const ident = {}
  const source = great.sources.users
  const options = {type: 'user'}

  const ret = await completeIdent(source, options)(ident)

  t.is(ret, null)
})

test('should return null when null', async (t) => {
  const ident = null
  const source = great.sources.users
  const options = {type: 'user'}

  const ret = await completeIdent(source, options)(ident)

  t.is(ret, null)
})

test('should return null when ident not found', async (t) => {
  const ident = {id: 'unknown'}
  const source = great.sources.users
  const options = {type: 'user'}

  const ret = await completeIdent(source, options)(ident)

  t.is(ret, null)
})

test('should complete ident with other prop keys', async (t) => {
  nock('http://some.api')
    .get('/entries')
      .query({author: 'johnf'})
      .reply(200, {data: ent1Data})
  const ident = {id: 'johnf'}
  const source = great.sources.entries
  const options = {
    type: 'entry',
    props: {
      id: 'author',
      roles: 'sections',
      tokens: null
    }
  }
  const expected = {id: 'johnf', roles: ['news', 'sports'], tokens: undefined}

  const ret = await completeIdent(source, options)(ident)

  t.deepEqual(ret, expected)
})
