import test from 'ava'
import nock from 'nock'
import json from 'integreat-adapter-json'
import defs from '../helpers/defs'
import usersUserMapping from '../helpers/defs/mappings/users-user'
import entry1Data from '../helpers/data/entry1'
import johnfData from '../helpers/data/userJohnf'

import integreat from '../..'

// Setup

const createdAt = '2017-11-18T18:43:01Z'
const updatedAt = '2017-11-24T07:11:43Z'

const entryMapping = {
  id: 'entries-entry',
  type: 'entry',
  service: 'entries',
  attributes: {
    id: 'key',
    title: { path: 'headline', default: 'An entry' },
    text: 'body',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt'
  },
  relationships: {
    author: { mapping: 'entries-user' },
    'sections.id': 'sections[]'
  }
}

// Tests

test('should get all entries from service', async (t) => {
  nock('http://some.api')
    .get('/entries/ent1')
    .reply(200, { data: [{ ...entry1Data, author: { ...johnfData, createdAt, updatedAt } }] })
  const adapters = { json: json() }
  defs.mappings[0] = entryMapping
  defs.mappings.push({
    ...usersUserMapping,
    id: 'entries-user',
    path: 'author'
  })
  const action = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' }
  }
  const expectedRel = {
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
      feeds: [
        { id: 'news', type: 'feed' },
        { id: 'social', type: 'feed' }
      ]
    }
  }

  const great = integreat(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'ent1')
  t.deepEqual(ret.data[0].relationships.author, expectedRel)

  nock.restore()
})

test.skip('should map relationship on self referring type', async (t) => {
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, { data: [{ ...johnfData, creator: 'betty' }] })
  const adapters = { json: json() }
  defs.mappings.push({
    ...usersUserMapping,
    id: 'entries-user',
    relationships: {
      ...usersUserMapping.relationships,
      createdBy: { path: 'creator', mapping: 'entries-user' }
    }
  })
  const action = {
    type: 'GET',
    payload: { type: 'user', id: 'johnf' }
  }

  const great = integreat(defs, { adapters })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'johnf')
  t.is(ret.data[0].relationships.createdBy.id, 'betty')

  nock.restore()
})
