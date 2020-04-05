import test from 'ava'
import nock = require('nock')
import jsonAdapter from 'integreat-adapter-json'
import defs from '../helpers/defs'
import entry1Data from '../helpers/data/entry1'
import entry2Data from '../helpers/data/entry2'
import entry3Data from '../helpers/data/entry3'

import Integreat from '../..'

// Setup

const json = jsonAdapter()

const entries1 = [entry1Data, entry2Data]
const entries2 = [entry3Data]

// Tests

test('should get first and second page of entries from service', async t => {
  const adapters = { json }
  nock('http://some.api')
    .get('/entries')
    .reply(200, { data: entries1, offset: 'page2' })
    .get('/entries?offset=page2')
    .reply(200, { data: entries2, offset: null })
  const action1 = {
    type: 'GET',
    payload: { type: 'entry' }
  }

  const great = Integreat.create(defs, { adapters })
  const ret1 = await great.dispatch(action1)
  const action2 = { type: 'GET', payload: ret1.paging.next }
  const ret2 = await great.dispatch(action2)

  t.is(ret1.status, 'ok', ret1.error)
  t.is(ret1.data.length, 2)
  t.is(ret1.data[0].id, 'ent1')
  t.is(ret1.data[1].id, 'ent2')
  t.is(ret2.status, 'ok', ret2.error)
  t.is(ret2.data.length, 1)
  t.is(ret2.data[0].id, 'ent3')

  nock.restore()
})
