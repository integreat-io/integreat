import test from 'ava'
import nock = require('nock')
import json from 'integreat-adapter-json'
import defs from '../helpers/defs'
import johnfData from '../helpers/data/userJohnf'
import ent1Data from '../helpers/data/entry1'

import integreat = require('../..')

// Setup

const createdAt = '2017-11-18T18:43:01Z'
const updatedAt = '2017-11-24T07:11:43Z'

// Tests

test('should get one entry from service', async t => {
  const adapters = { json }
  nock('http://some.api')
    .get('/entries/ent1')
    .reply(200, { data: { ...ent1Data, createdAt, updatedAt } })
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { root: true } }
  }
  const expected = {
    $schema: 'entry',
    id: 'ent1',
    type: 'entry',
    attributes: {
      title: 'Entry 1',
      text: 'The text of entry 1',
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt)
    },
    relationships: {
      author: { id: 'johnf', $ref: 'user' },
      sections: [
        { id: 'news', $ref: 'section' },
        { id: 'sports', $ref: 'section' }
      ]
    }
  }

  const great = integreat(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)

  nock.restore()
})

test('should get one user from service', async t => {
  const adapters = { json }
  nock('http://some.api')
    .get('/users/johnf')
    .times(2)
    .reply(200, { data: { ...johnfData, createdAt, updatedAt } })
  const action = {
    type: 'GET',
    payload: { id: 'johnf', type: 'user' },
    meta: { ident: { id: 'johnf' } }
  }
  const expected = {
    $schema: 'user',
    id: 'johnf',
    type: 'user',
    attributes: {
      username: 'johnf',
      firstname: 'John',
      lastname: 'Fjon',
      yearOfBirth: 1987,
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt),
      roles: ['editor'],
      tokens: ['twitter|23456', 'facebook|12345']
    },
    relationships: {
      feeds: [{ id: 'news', $ref: 'feed' }, { id: 'social', $ref: 'feed' }]
    }
  }

  const great = integreat(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)

  nock.restore()
})
