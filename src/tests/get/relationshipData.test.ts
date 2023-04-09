import test from 'ava'
import nock from 'nock'
import defsBase from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import usersUserMapping from '../helpers/defs/mutations/users-user.js'
import entry1Data from '../helpers/data/entry1.js'
import johnfData from '../helpers/data/userJohnf.js'
import { TypedData } from '../../types.js'

import Integreat from '../../index.js'

// Setup

const createdAt = '2017-11-18T18:43:01Z'
const updatedAt = '2017-11-24T07:11:43Z'

const defs = {
  ...defsBase,
  mutations: {
    ...defsBase.mutations,
    'entries-entry': [
      {
        $iterate: true,
        id: 'key',
        title: { $alt: ['headline', { $value: 'An entry' }] },
        text: 'body',
        createdAt: 'createdAt',
        updatedAt: 'updatedAt',
        author: ['author', { $apply: 'entries-user' }],
        'sections.id': 'sections[]',
      },
      { $apply: 'cast_entry' },
    ],
    'entries-user': usersUserMapping,
  },
}

// Tests

test('should get all entries from service', async (t) => {
  nock('http://some.api')
    .get('/entries/ent1')
    .reply(200, {
      data: [
        {
          ...entry1Data,
          author: { ...johnfData, createdAt, updatedAt, creator: 'bettyk' },
        },
      ],
    })
  const action = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' },
  }
  const expectedRel = {
    $type: 'user',
    id: 'johnf',
    username: 'johnf',
    firstname: 'John',
    lastname: 'Fjon',
    yearOfBirth: 1987,
    createdAt: new Date(createdAt),
    createdBy: { id: 'bettyk', $ref: 'user' },
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
  const data = ret.data as TypedData[]
  t.is(data.length, 1)
  t.is(data[0].id, 'ent1')
  t.deepEqual(data[0].author, expectedRel)

  nock.restore()
})

test.todo('should allow self-referential mappings')
