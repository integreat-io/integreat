import test from 'ava'
import sinon = require('sinon')
import handlerResources from '../tests/helpers/handlerResources'

import expire from './expire'

// Helpers

let clock: sinon.SinonFakeTimers | null = null
const theTime = Date.now()

test.before(() => {
  clock = sinon.useFakeTimers(theTime)
})

test.after.always(() => {
  clock?.restore()
})

const responseAction = {
  type: 'GET',
  payload: { type: 'entry' },
  response: { status: 'ok', data: [] },
}

const ident = { id: 'johnf' }

// Tests

test('should dispatch GET to expired endpoint', async (t) => {
  const dispatch = sinon.stub().resolves(responseAction)
  const action = {
    type: 'EXPIRE',
    payload: { type: 'entry', targetService: 'store', endpoint: 'getExpired' },
    meta: { ident },
  }
  const expected = {
    type: 'GET',
    payload: {
      type: 'entry',
      timestamp: theTime,
      isodate: new Date(theTime).toISOString(),
      targetService: 'store',
      endpoint: 'getExpired',
    },
    response: {
      status: null,
      returnNoDefaults: true,
    },
    meta: { ident },
  }

  await expire(action, { ...handlerResources, dispatch })

  t.deepEqual(dispatch.args[0][0], expected)
})

test('should add msFromNow to current timestamp', async (t) => {
  const dispatch = sinon.stub().resolves(responseAction)
  const action = {
    type: 'EXPIRE',
    payload: {
      type: 'entry',
      msFromNow: 3600000,
      targetService: 'store',
      endpoint: 'getExpired',
    },
  }
  const expected = {
    payload: {
      timestamp: theTime + 3600000,
      isodate: new Date(theTime + 3600000).toISOString(),
    },
  }

  await expire(action, { ...handlerResources, dispatch })

  t.true(dispatch.calledWithMatch(expected))
})

test('should queue DELETE for expired entries', async (t) => {
  const data = [
    { id: 'ent1', $type: 'entry' },
    { id: 'ent2', $type: 'entry' },
  ]
  const dispatch = sinon.stub().resolves({
    type: 'GET',
    payload: { type: 'entry' },
    response: { status: 'ok', data },
  })
  dispatch
    .withArgs(sinon.match({ type: 'DELETE' }))
    .resolves({ type: 'DELETE', payload: {}, response: { status: 'queued' } })
  const action = {
    type: 'EXPIRE',
    payload: { type: 'entry', targetService: 'store', endpoint: 'getExpired' },
    meta: { ident },
  }
  const expected = {
    type: 'DELETE',
    payload: { data, targetService: 'store' },
    meta: { ident },
  }

  const ret = await expire(action, { ...handlerResources, dispatch })

  t.truthy(ret)
  t.is(ret.response?.status, 'queued', ret.response?.error)
  t.true(dispatch.calledWithMatch(expected))
})

test('should queue DELETE with id and type only', async (t) => {
  const data = [
    {
      id: 'ent1',
      $type: 'entry',
      title: 'Entry 1',
      author: { id: 'johnf', $type: 'user' },
    },
  ]
  const dispatch = sinon.stub().resolves({
    type: 'GET',
    payload: { type: 'entry' },
    response: { status: 'ok', data },
  })
  dispatch
    .withArgs(sinon.match({ type: 'DELETE' }))
    .resolves({ type: 'DELETE', payload: {}, response: { status: 'queued' } })
  const action = {
    type: 'EXPIRE',
    payload: { type: 'entry', targetService: 'store', endpoint: 'getExpired' },
  }
  const expected = { payload: { data: [{ id: 'ent1', $type: 'entry' }] } }

  const ret = await expire(action, { ...handlerResources, dispatch })

  t.is(ret.response?.status, 'queued', ret.response?.error)
  t.true(dispatch.calledWithMatch(expected))
})

test('should not queue when no expired entries', async (t) => {
  const dispatch = sinon.stub().resolves(responseAction)
  dispatch
    .withArgs(sinon.match({ type: 'DELETE' }))
    .resolves({ status: 'queued' })
  const action = {
    type: 'EXPIRE',
    payload: { type: 'entry', targetService: 'store', endpoint: 'getExpired' },
  }

  const ret = await expire(action, { ...handlerResources, dispatch })

  t.false(dispatch.calledWithMatch({ type: 'DELETE' }))
  t.truthy(ret)
  t.is(ret.response?.status, 'noaction')
})

test('should not queue when GET returns error', async (t) => {
  const dispatch = sinon.stub().resolves({
    type: 'GET',
    payload: { type: 'entry' },
    response: { status: 'notfound' },
  })
  dispatch
    .withArgs(sinon.match({ type: 'DELETE' }))
    .resolves({ status: 'queued' })
  const action = {
    type: 'EXPIRE',
    payload: { type: 'entry', targetService: 'store', endpoint: 'getExpired' },
  }

  const ret = await expire(action, { ...handlerResources, dispatch })

  t.false(dispatch.calledWithMatch({ type: 'DELETE' }))
  t.truthy(ret)
  t.is(ret.response?.status, 'noaction')
})

test('should return error when no service', async (t) => {
  const dispatch = sinon.stub().resolves(responseAction)
  const action = {
    type: 'EXPIRE',
    payload: { type: 'entry', endpoint: 'getExpired' },
  }

  const ret = await expire(action, { ...handlerResources, dispatch })

  t.is(ret.response?.status, 'error')
})

test('should return error when no endpoint', async (t) => {
  const dispatch = sinon.stub().resolves(responseAction)
  const action = {
    type: 'EXPIRE',
    payload: { type: 'entry', targetService: 'store' },
  }

  const ret = await expire(action, { ...handlerResources, dispatch })

  t.is(ret.response?.status, 'error')
})

test('should return error when no type', async (t) => {
  const dispatch = sinon.stub().resolves(responseAction)
  const action = {
    type: 'EXPIRE',
    payload: { targetService: 'store', endpoint: 'getExpired' },
  }

  const ret = await expire(action, { ...handlerResources, dispatch })

  t.is(ret.response?.status, 'error')
})
