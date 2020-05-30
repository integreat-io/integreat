import test from 'ava'
import nock = require('nock')
import defs from '../helpers/defs'
import resources from '../helpers/resources'
import johnfData from '../helpers/data/userJohnf'
import bettyData from '../helpers/data/userBetty'
import { TypedData } from '../../types'

import Integreat from '../..'

// Setups

test.after.always(() => {
  nock.restore()
})

// Tests

test('should respond with noaccess when no ident', async (t) => {
  const createdAt = '2017-11-18T18:43:01Z'
  const updatedAt = '2017-11-24T07:11:43Z'
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, { data: { ...johnfData, createdAt, updatedAt } })
  const action = {
    type: 'GET',
    payload: { id: 'johnf', type: 'user' },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'noaccess', ret.error)
  t.is(typeof ret.error, 'string')
  t.falsy(ret.data)
})

test('should respond with only authorized data', async (t) => {
  const createdAt = '2017-11-18T18:43:01Z'
  const updatedAt = '2017-11-24T07:11:43Z'
  nock('http://some.api')
    .get('/users')
    .reply(200, {
      data: [
        { ...johnfData, createdAt, updatedAt },
        { ...bettyData, createdAt, updatedAt },
      ],
    })
  const action = {
    type: 'GET',
    payload: { type: 'user' },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAccess = {
    ident: { id: 'johnf' },
  }

  const great = Integreat.create(defs, resources)
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.access, expectedAccess)
  const data = ret.data as TypedData[]
  t.is(data.length, 1)
  t.is(data[0].id, 'johnf')
})
