import test from 'ava'
import nock = require('nock')
import completeIdent from '../../middleware/completeIdent'
import defs from '../helpers/defs'
import resources from '../helpers/resources'
import johnfData from '../helpers/data/userJohnf'
import { TypedData } from '../../types'

import Integreat from '../..'

// Setup

const createdAt = new Date()
const updatedAt = new Date()

const entry1Item = {
  $type: 'entry',
  id: 'ent1',
  title: 'Entry 1',
  text: 'The text of entry 1',
  createdAt,
  updatedAt,
  author: { id: 'johnf', $ref: 'user' },
  sections: [
    { id: 'news', $ref: 'section' },
    { id: 'sports', $ref: 'section' },
  ],
}

const entriesArr = [
  {
    $type: 'entry',
    id: 'ent1',
    title: 'Entry 1',
  },
  {
    $type: 'entry',
    id: 'ent2',
    title: 'Entry 2',
  },
]

test.after.always(() => {
  nock.restore()
})

// Tests

test('should set new entry (getting role from identity)', async (t) => {
  const middleware = [completeIdent]
  const putData = {
    key: 'ent1',
    headline: 'Entry 1',
    originalTitle: 'Entry 1',
    body: 'The text of entry 1',
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    authorId: 'johnf',
    sections: [
      { id: 'news', $ref: 'section' },
      { id: 'sports', $ref: 'section' },
    ],
  }
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, { data: { ...johnfData } })
    .put('/entries/ent1', putData)
    .reply(201, { data: { key: 'ent1', ok: true } })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entry1Item },
    meta: { ident: { id: 'johnf' } },
  }

  const great = Integreat.create(defs, resources, middleware)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  const data = ret.data as TypedData
  t.false(Array.isArray(data))
  t.is(data.id, 'ent1')
  t.is(data.title, 'An entry') // Default value, as it is not provided in the response data
})

test('should set new entries', async (t) => {
  nock('http://some.api')
    .post('/entries')
    .reply(201, {
      data: [
        { key: 'real1', ok: true },
        { key: 'real2', ok: true },
      ],
    })
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entriesArr },
    meta: { ident: { id: 'johnf', roles: ['editor'] } },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  const data = ret.data as TypedData[]
  t.is(data.length, 2)
  t.is(data[0].id, 'real1')
  t.is(data[1].id, 'real2')
})
