import test from 'ava'
import nock from 'nock'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import johnfData from '../helpers/data/userJohnf.js'
import ent1Data from '../helpers/data/entry1.js'
import ent2Data from '../helpers/data/entry2.js'
import type { TypedData } from '../../types.js'

import Integreat from '../../index.js'

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
    .reply(200, {
      data: {
        ...ent1Data,
        createdAt,
        updatedAt,
        props: [
          { key: 'sourceCheckBy', value: 'Anita' },
          { key: 'proofReadBy', value: 'Svein' },
        ],
      },
    })
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
    props: [
      { key: 'sourceCheckBy', value: 'Anita' },
      { key: 'proofReadBy', value: 'Svein' },
    ],
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)
  t.true((ret.data as TypedData).createdAt instanceof Date)
})

test('should get one entry from service with sub schemas', async (t) => {
  nock('http://some.api')
    .get('/entries/ent2')
    .reply(200, {
      data: {
        ...ent2Data,
        createdAt,
        updatedAt,
        approver: { id: 'johnf', firstname: 'John' },
      },
    })
  const action = {
    type: 'GET',
    payload: { id: 'ent2', type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  const approver = (ret.data as TypedData).approvedBy as TypedData
  t.is(approver.$type, 'user')
  t.is(approver.id, 'johnf')
  t.is(approver.firstname, 'John')
})

test('should get no entry from service', async (t) => {
  nock('http://some.api').get('/entries/ent0').reply(404)
  const action = {
    type: 'GET',
    payload: { id: 'ent0', type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'notfound', ret.error)
  t.is(ret.data, undefined)
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

test('should respond with headers', async (t) => {
  nock('http://some.api')
    .get('/entries/ent1')
    .reply(200, {
      data: {
        ...ent1Data,
        createdAt,
        updatedAt,
        props: [
          { key: 'sourceCheckBy', value: 'Anita' },
          { key: 'proofReadBy', value: 'Svein' },
        ],
      },
    })
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    'content-type': 'application/json',
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.headers, expected)
})

test('should unfold $value props', async (t) => {
  nock('http://some.api')
    .get('/entries/ent1')
    .reply(200, {
      data: {
        ...ent1Data,
        key: { $value: 'ent1' },
        headline: { $value: 'Entry 1' },
        createdAt: { $value: createdAt },
        updatedAt: { $value: updatedAt },
        props: [
          { key: { $value: 'sourceCheckBy' }, value: { $value: 'Anita' } },
          { key: { $value: 'proofReadBy' }, value: { $value: 'Svein' } },
        ],
        sections: [{ $value: 'news' }, { $value: 'sports' }],
      },
    })
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
    props: [
      { key: 'sourceCheckBy', value: 'Anita' },
      { key: 'proofReadBy', value: 'Svein' },
    ],
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.data, expected)
})
