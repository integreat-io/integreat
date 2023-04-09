import test from 'ava'
import nock from 'nock'
import defs from '../helpers/defs/index.js'
import resources from '../helpers/resources/index.js'
import entry1Data from '../helpers/data/entry1.js'
import entry2Data from '../helpers/data/entry2.js'
import entry3Data from '../helpers/data/entry3.js'
import { TypedData, Action } from '../../types.js'

import Integreat from '../../index.js'

// Setup

const entries1 = [entry1Data, entry2Data]
const entries2 = [entry3Data]

// Tests

test('should get first and second page of entries from service', async (t) => {
  nock('http://some.api')
    .get('/entries')
    .reply(200, { data: entries1, next: 'page2', prev: null })
    .get('/entries?offset=page2')
    .reply(200, { data: entries2, next: null, prev: 'page1' })
    .get('/entries?offset=page1')
    .reply(200, { data: entries1, next: 'page2', prev: null })
  const great = Integreat.create(defs, resources)
  const action1 = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }

  const ret1 = await great.dispatch(action1)
  const action2 = { ...action1, payload: ret1.paging?.next }
  const ret2 = await great.dispatch(action2 as Action)
  const action3 = { ...action1, payload: ret2.paging?.prev }
  const ret3 = await great.dispatch(action3 as Action)

  t.is(ret1.status, 'ok', ret1.error)
  const data1 = ret1.data as TypedData[]
  t.is(data1.length, 2)
  t.is(data1[0].id, 'ent1')
  t.is(data1[1].id, 'ent2')
  t.is(ret2.status, 'ok', ret2.error)
  const data2 = ret2.data as TypedData[]
  t.is(data2.length, 1)
  t.is(data2[0].id, 'ent3')
  t.is(ret3.status, 'ok', ret3.error)
  const data3 = ret3.data as TypedData[]
  t.is(data3.length, 2)
  t.is(data3[0].id, 'ent1')
  t.is(data3[1].id, 'ent2')

  nock.restore()
})
