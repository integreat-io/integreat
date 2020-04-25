import test from 'ava'
import nock = require('nock')
import jsonAdapter from 'integreat-adapter-json'
import defs from '../helpers/defs'
import { TypedData } from '../../types'

import Integreat from '../..'

// Setup

const json = jsonAdapter()

const johnfItem = {
  $type: 'user',
  id: 'johnf',
  username: 'johnf',
}
const bettyItem = {
  $type: 'user',
  id: 'betty',
  username: 'betty',
}

// Tests

// Waiting for authentication to service and a solution on how to treat return from SET
test.failing(
  'should refuse to set entries where ident has no access',
  async (t) => {
    const adapters = { json }
    nock('http://some.api').post('/users').reply(201, { ok: true })
    const action = {
      type: 'SET',
      payload: { type: 'user', data: [johnfItem, bettyItem] },
      meta: { ident: { id: 'johnf' } },
    }

    const great = Integreat.create(defs, { adapters })
    const ret = await great.dispatch(action)

    t.is(ret.status, 'ok', ret.error)
    const data = ret.data as TypedData[]
    t.is(data.length, 1)
    t.is(data[0].id, 'johnf')

    nock.restore()
  }
)
