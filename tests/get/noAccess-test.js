import test from 'ava'
import nock from 'nock'
import json from 'integreat-adapter-json'
import defs from '../helpers/defs'
import johnfData from '../helpers/data/userJohnf'
import bettyData from '../helpers/data/userBetty'

import integreat from '../..'

test.after.always(() => {
  nock.restore()
})

test('should respond with noaccess when no ident', async (t) => {
  const createdAt = '2017-11-18T18:43:01Z'
  const updatedAt = '2017-11-24T07:11:43Z'
  const adapters = { json: json() }
  const transformers = integreat.transformers()
  nock('http://some.api')
    .get('/users/johnf')
    .reply(200, { data: { ...johnfData, createdAt, updatedAt } })
  const action = {
    type: 'GET',
    payload: { id: 'johnf', type: 'user' }
  }

  const great = integreat(defs, { adapters, transformers })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'noaccess', ret.error)
  t.is(typeof ret.error, 'string')
  t.falsy(ret.data)
})

test('should respond with only authorized data', async (t) => {
  const createdAt = '2017-11-18T18:43:01Z'
  const updatedAt = '2017-11-24T07:11:43Z'
  const adapters = { json: json() }
  const transformers = integreat.transformers()
  nock('http://some.api')
    .get('/users/')
    .reply(200, {
      data: [
        { ...johnfData, createdAt, updatedAt },
        { ...bettyData, createdAt, updatedAt }
      ]
    })
  const action = {
    type: 'GET',
    payload: { type: 'user' },
    meta: { ident: { id: 'johnf' } }
  }
  const expectedAccess = {
    status: 'partially',
    ident: { id: 'johnf' },
    scheme: 'data'
  }

  const great = integreat(defs, { adapters, transformers })
  const ret = await great.dispatch(action)

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.access, expectedAccess)
  t.is(ret.data.length, 1)
  t.is(ret.data[0].id, 'johnf')
})
