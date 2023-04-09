import test from 'ava'
import nock from 'nock'
import completeIdent from '../../middleware/completeIdent.js'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import johnfData from '../helpers/data/userJohnf.js'
import type { TypedData, Action } from '../../types.js'

import Integreat from '../../index.js'

// Setup

const createdAt = new Date('2022-05-03T18:43:11+02:00')
const updatedAt = new Date('2022-05-04T07:18:03+02:00')

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
    sections: [{ id: 'news' }, { id: 'sports' }],
    props: [],
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
  nock('http://some.api', {
    reqheaders: {
      'content-type': 'application/json',
      'x-correlation-id': '12345',
    },
  })
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
    meta: { ident: { id: 'johnf', roles: ['editor'] }, cid: '12345' },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  const data = ret.data as TypedData[]
  t.is(data.length, 2)
  t.is(data[0].id, 'real1')
  t.is(data[1].id, 'real2')
})

test('should use outgoing middleware', async (t) => {
  const failMiddleware = () => async (action: Action) => ({
    ...action,
    response: {
      ...action.response,
      status: 'badresponse',
    },
  })
  const outgoingMiddleware = [failMiddleware]
  const action = {
    type: 'SET',
    payload: { type: 'entry', data: entriesArr },
    meta: { ident: { id: 'johnf', roles: ['editor'] } },
  }

  const great = Integreat.create(defs, resources, [], outgoingMiddleware)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'badresponse', ret.error)
})
