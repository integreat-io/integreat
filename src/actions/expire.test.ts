import test from 'ava'
import sinon = require('sinon')

import expire from './expire'

// Helpers

let clock = null
const theTime = Date.now()

test.before(() => {
  clock = sinon.useFakeTimers(theTime)
})

test.after.always(() => {
  clock.restore()
})

const ident = { id: 'johnf' }

// Tests

test('should exist', (t) => {
  t.is(typeof expire, 'function')
})

test('should dispatch GET to expired endpoint', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const payload = { service: 'store', type: 'entry', endpoint: 'getExpired' }
  const expected = {
    type: 'GET',
    payload: {
      service: 'store',
      type: 'entry',
      endpoint: 'getExpired',
      onlyMappedValues: true,
      timestamp: theTime,
      isodate: new Date(theTime).toISOString()
    },
    meta: { ident }
  }

  await expire({ type: 'EXPIRE', payload, meta: { ident } }, { dispatch })

  t.true(dispatch.calledWithMatch(expected))
})

test('should add msFromNow to current timestamp', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const payload = { service: 'store', type: 'entry', endpoint: 'getExpired', msFromNow: 3600000 }
  const expected = {
    payload: {
      timestamp: theTime + 3600000,
      isodate: new Date(theTime + 3600000).toISOString()
    }
  }

  await expire({ type: 'EXPIRE', payload }, { dispatch })

  t.true(dispatch.calledWithMatch(expected))
})

test('should queue DELETE for expired entries', async (t) => {
  const data = [{ id: 'ent1', type: 'entry' }, { id: 'ent2', type: 'entry' }]
  const dispatch = sinon.stub().resolves({ status: 'ok', data })
  dispatch.withArgs(sinon.match({ type: 'DELETE' })).resolves({ status: 'queued' })
  const payload = { service: 'store', type: 'entry', endpoint: 'getExpired' }
  const expected = { type: 'DELETE', payload: { service: 'store', data }, meta: { ident } }

  const ret = await expire({ type: 'EXPIRE', payload, meta: { ident } }, { dispatch })

  t.true(dispatch.calledWithMatch(expected))
  t.truthy(ret)
  t.is(ret.status, 'queued')
})

test('should queue DELETE with id and type only', async (t) => {
  const data = [{
    id: 'ent1',
    type: 'entry',
    title: 'Entry 1',
    author: { id: 'johnf', type: 'user' }
  }]
  const dispatch = sinon.stub().resolves({ status: 'ok', data })
  dispatch.withArgs(sinon.match({ type: 'DELETE' })).resolves({ status: 'queued' })
  const payload = { service: 'store', type: 'entry', endpoint: 'getExpired' }
  const expected = { payload: { data: [{ id: 'ent1', type: 'entry' }] } }

  await expire({ type: 'EXPIRE', payload }, { dispatch })

  t.true(dispatch.calledWithMatch(expected))
})

test('should not queue when no expired entries', async (t) => {
  const data = []
  const dispatch = sinon.stub().resolves({ status: 'ok', data })
  dispatch.withArgs(sinon.match({ type: 'DELETE' })).resolves({ status: 'queued' })
  const payload = { service: 'store', type: 'entry', endpoint: 'getExpired' }

  const ret = await expire({ type: 'EXPIRE', payload }, { dispatch })

  t.false(dispatch.calledWithMatch({ type: 'DELETE' }))
  t.truthy(ret)
  t.is(ret.status, 'noaction')
})

test('should not queue when GET returns error', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'notfound' })
  dispatch.withArgs(sinon.match({ type: 'DELETE' })).resolves({ status: 'queued' })
  const payload = { service: 'store', type: 'entry', endpoint: 'getExpired' }

  const ret = await expire({ type: 'EXPIRE', payload }, { dispatch })

  t.false(dispatch.calledWithMatch({ type: 'DELETE' }))
  t.truthy(ret)
  t.is(ret.status, 'noaction')
})

test('should return error when no service', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const payload = { endpoint: 'getExpired', type: 'entry' }

  const ret = await expire({ type: 'EXPIRE', payload }, { dispatch })

  t.is(ret.status, 'error')
})

test('should return error when no endpoint', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const payload = { service: 'store', type: 'entry' }

  const ret = await expire({ type: 'EXPIRE', payload }, { dispatch })

  t.is(ret.status, 'error')
})

test('should return error when no type', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const payload = { service: 'store', endpoint: 'getExpired' }

  const ret = await expire({ type: 'EXPIRE', payload }, { dispatch })

  t.is(ret.status, 'error')
})
