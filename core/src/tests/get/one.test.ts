import test from 'ava'
import nock = require('nock')
import defs from '../helpers/defs'
import resources from '../helpers/resources'
import johnfData from '../helpers/data/userJohnf'
import ent1Data from '../helpers/data/entry1'

import Integreat from '../..'

// Setup

const createdAt = '2017-11-18T18:43:01Z'
const updatedAt = '2017-11-24T07:11:43Z'

test.after.always(() => {
  nock.restore()
})

// Tests

test('should get one entry from service', async (t) => {
  nock('http://some.api')
    .get('/entries/ent1')
    .reply(200, { data: { ...ent1Data, createdAt, updatedAt } })
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    $type: 'entry',
    id: 'ent1',
    title: 'Entry 1',
    text: 'The text of entry 1',
    createdAt: new Date(createdAt),
    updatedAt: new Date(updatedAt),
    author: { id: 'johnf', $ref: 'user' },
    sections: [
      { id: 'news', $ref: 'section' },
      { id: 'sports', $ref: 'section' },
    ],
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)
})

test('should get one user from service', async (t) => {
  nock('http://some.api')
    .get('/users/johnf')
    .times(2)
    .reply(200, { data: { ...johnfData, createdAt, updatedAt } })
  const action = {
    type: 'GET',
    payload: { id: 'johnf', type: 'user' },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    $type: 'user',
    id: 'johnf',
    username: 'johnf',
    firstname: 'John',
    lastname: 'Fjon',
    yearOfBirth: 1987,
    createdBy: undefined,
    createdAt: new Date(createdAt),
    updatedAt: new Date(updatedAt),
    roles: ['editor'],
    tokens: ['twitter|23456', 'facebook|12345'],
    feeds: [
      { id: 'news', $ref: 'feed' },
      { id: 'social', $ref: 'feed' },
    ],
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)
})
