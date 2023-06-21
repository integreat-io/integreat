import test from 'ava'
import sinon from 'sinon'
import handlerResources from '../tests/helpers/handlerResources.js'

import expire from './expire.js'

// Helpers

let clock: sinon.SinonFakeTimers | null = null
const theTime = Date.now()

test.before(() => {
  clock = sinon.useFakeTimers(theTime)
})

test.after.always(() => {
  clock?.restore()
})

const ident = { id: 'johnf' }

// Tests

test('should dispatch GET to expired endpoint', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const action = {
    type: 'EXPIRE',
    payload: { type: 'entry', targetService: 'store', endpoint: 'getExpired' },
    meta: { ident, id: '11004', cid: '11005' },
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
    meta: { ident, cid: '11005' },
  }

  await expire(action, { ...handlerResources, dispatch })

  t.deepEqual(dispatch.args[0][0], expected)
})

test('should add msFromNow to current timestamp', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
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
  const dispatch = sinon.stub().resolves({ status: 'ok', data })
  dispatch
    .withArgs(sinon.match({ type: 'DELETE' }))
    .resolves({ status: 'queued' })
  const action = {
    type: 'EXPIRE',
    payload: { type: 'entry', targetService: 'store', endpoint: 'getExpired' },
    meta: { ident, id: '11004', cid: '11005' },
  }
  const expectedDeleteAction = {
    type: 'DELETE',
    payload: { data, targetService: 'store' },
    meta: { ident, cid: '11005' },
  }
  const expected = { status: 'queued' }

  const ret = await expire(action, { ...handlerResources, dispatch })

  t.deepEqual(ret, expected)
  t.true(dispatch.calledWithMatch(expectedDeleteAction))
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
  const dispatch = sinon.stub().resolves({ status: 'ok', data })
  dispatch
    .withArgs(sinon.match({ type: 'DELETE' }))
    .resolves({ status: 'queued' })
  const action = {
    type: 'EXPIRE',
    payload: { type: 'entry', targetService: 'store', endpoint: 'getExpired' },
  }
  const expected = { payload: { data: [{ id: 'ent1', $type: 'entry' }] } }

  const ret = await expire(action, { ...handlerResources, dispatch })

  t.is(ret.status, 'queued', ret.error)
  t.true(dispatch.calledWithMatch(expected))
})

test('should not queue when no expired entries', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  dispatch
    .withArgs(sinon.match({ type: 'DELETE' }))
    .resolves({ status: 'queued' })
  const action = {
    type: 'EXPIRE',
    payload: { type: 'entry', targetService: 'store', endpoint: 'getExpired' },
  }
  const expected = {
    status: 'noaction',
    error: "No items to expire from service 'store'",
    origin: 'handler:EXPIRE',
  }

  const ret = await expire(action, { ...handlerResources, dispatch })

  t.false(dispatch.calledWithMatch({ type: 'DELETE' }))
  t.deepEqual(ret, expected)
})

test('should not queue when GET returns error', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'notfound' })
  dispatch
    .withArgs(sinon.match({ type: 'DELETE' }))
    .resolves({ status: 'queued' })
  const action = {
    type: 'EXPIRE',
    payload: { type: 'entry', targetService: 'store', endpoint: 'getExpired' },
  }
  const expected = {
    status: 'error',
    error:
      "Could not get items from service 'store'. Reason: notfound undefined",
    origin: 'handler:EXPIRE',
  }

  const ret = await expire(action, { ...handlerResources, dispatch })

  t.false(dispatch.calledWithMatch({ type: 'DELETE' }))
  t.deepEqual(ret, expected)
})

test('should return error when no service', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const action = {
    type: 'EXPIRE',
    payload: { type: 'entry', endpoint: 'getExpired' },
  }
  const expected = {
    status: 'error',
    error: "Can't delete expired without a specified service",
    origin: 'handler:EXPIRE',
  }

  const ret = await expire(action, { ...handlerResources, dispatch })

  t.deepEqual(ret, expected)
})

test('should return error when no endpoint', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const action = {
    type: 'EXPIRE',
    payload: { type: 'entry', targetService: 'store' },
  }
  const expected = {
    status: 'error',
    error: "Can't delete expired from service 'store' without an endpoint",
    origin: 'handler:EXPIRE',
  }

  const ret = await expire(action, { ...handlerResources, dispatch })

  t.deepEqual(ret, expected)
})

test('should return error when no type', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const action = {
    type: 'EXPIRE',
    payload: { targetService: 'store', endpoint: 'getExpired' },
  }
  const expected = {
    status: 'badrequest',
    error:
      "Can't delete expired from service 'store' without one or more specified types",
    origin: 'handler:EXPIRE',
  }

  const ret = await expire(action, { ...handlerResources, dispatch })

  t.deepEqual(ret, expected)
})
