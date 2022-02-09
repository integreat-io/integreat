/* eslint-disable @typescript-eslint/no-non-null-assertion */
import test from 'ava'
import nock = require('nock')
import defs from '../helpers/defs'
import resources from '../helpers/resources'
import entriesData from '../helpers/data/entries'
import { TypedData } from '../../types'

import Integreat from '../..'

// Setup

test.after.always(() => {
  nock.restore()
})

// Tests

test('should get all entries from service', async (t) => {
  nock('http://some.api').get('/entries').reply(200, { data: entriesData })
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  const data = ret.data as TypedData[]
  t.true(Array.isArray(data))
  t.is(data?.length, 3)
  t.is(data![0].id, 'ent1')
  t.is(data![1].id, 'ent2')
  t.is(data![2].id, 'ent3')

  nock.restore()
})

test('should get all entries with transformed param', async (t) => {
  nock('http://some.api')
    .get('/entries')
    .query({
      since: '2021-07-05T14:07:19.000Z',
      until: '2021-07-05T23:59:59.999Z',
    })
    .reply(200, { data: entriesData })
  const action = {
    type: 'GET',
    payload: {
      type: 'entry',
      updatedSince: new Date('2021-07-05T14:07:19Z'),
      updatedUntil: new Date('2021-07-05T23:59:59.999Z'),
    },
    meta: { ident: { id: 'johnf' } },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  const data = ret.data as TypedData[]
  t.true(Array.isArray(data))
  t.is(data?.length, 3)
  t.is(data![0].id, 'ent1')
  t.is(data![1].id, 'ent2')
  t.is(data![2].id, 'ent3')

  nock.restore()
})
