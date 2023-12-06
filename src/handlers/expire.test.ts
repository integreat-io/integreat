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

test('should dispatch GET with timestamp and isodate', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const action = {
    type: 'EXPIRE',
    payload: { type: 'entry' },
    meta: { ident, id: '11004', cid: '11005' },
  }
  const expected = {
    type: 'GET',
    payload: {
      type: 'entry',
      timestamp: theTime,
      isodate: new Date(theTime).toISOString(),
    },
    meta: { ident, cid: '11005' },
  }

  const ret = await expire(action, { ...handlerResources, dispatch })

  t.is(ret.status, 'noaction', ret.error)
  t.is(dispatch.callCount, 1) // We're not deleting because there's no data
  t.deepEqual(dispatch.args[0][0], expected)
})

test('should dispatch GET with target service', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const action = {
    type: 'EXPIRE',
    payload: { type: 'entry', targetService: 'store' },
    meta: { ident, id: '11004', cid: '11005' },
  }
  const expected = {
    type: 'GET',
    payload: {
      type: 'entry',
      timestamp: theTime,
      isodate: new Date(theTime).toISOString(),
      targetService: 'store',
    },
    meta: { ident, cid: '11005' },
  }

  await expire(action, { ...handlerResources, dispatch })

  t.is(dispatch.callCount, 1) // We're not deleting because there's no data
  t.deepEqual(dispatch.args[0][0], expected)
})

test('should dispatch GET to specified endpoint', async (t) => {
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

  t.is(dispatch.callCount, 1) // We're not deleting because there's no data
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
    meta: { ident, id: '11004', cid: '11005' },
  }
  const expected = {
    type: 'GET',
    payload: {
      type: 'entry',
      timestamp: theTime + 3600000,
      isodate: new Date(theTime + 3600000).toISOString(),
      targetService: 'store',
      endpoint: 'getExpired',
    },
    meta: { ident, cid: '11005' },
  }

  await expire(action, { ...handlerResources, dispatch })

  t.is(dispatch.callCount, 1) // We're not deleting because there's no data
  t.deepEqual(dispatch.args[0][0], expected)
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
    payload: { type: 'entry', data, targetService: 'store' },
    meta: { ident, cid: '11005', queue: true },
  }
  const expected = { status: 'queued' }

  const ret = await expire(action, { ...handlerResources, dispatch })

  t.deepEqual(ret, expected)
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[1][0], expectedDeleteAction)
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
    meta: { ident, id: '11004', cid: '11005' },
  }
  const expectedDeleteAction = {
    type: 'DELETE',
    payload: {
      type: 'entry',
      data: [{ id: 'ent1', $type: 'entry' }],
      targetService: 'store',
    },
    meta: { ident, cid: '11005', queue: true },
  }

  const ret = await expire(action, { ...handlerResources, dispatch })

  t.is(ret.status, 'queued', ret.error)
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[1][0], expectedDeleteAction)
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

test('should DELETE with params and no GET when deleteWithParams is true', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  dispatch
    .withArgs(sinon.match({ type: 'DELETE' }))
    .resolves({ status: 'queued' })
  const action = {
    type: 'EXPIRE',
    payload: {
      type: 'entry',
      targetService: 'store',
      deleteWithParams: true,
    },
    meta: { ident, id: '11004', cid: '11005' },
  }
  const expectedDeleteAction = {
    type: 'DELETE',
    payload: {
      type: 'entry',
      timestamp: theTime,
      isodate: new Date(theTime).toISOString(),
      targetService: 'store',
    },
    meta: { ident, cid: '11005', queue: true },
  }
  const expected = { status: 'queued' }

  const ret = await expire(action, { ...handlerResources, dispatch })

  t.deepEqual(ret, expected)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedDeleteAction)
})

test('should DELETE with params and no GET with specified endpoint', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  dispatch
    .withArgs(sinon.match({ type: 'DELETE' }))
    .resolves({ status: 'queued' })
  const action = {
    type: 'EXPIRE',
    payload: {
      type: 'entry',
      targetService: 'store',
      deleteWithParams: true,
      endpoint: 'deleteExpired',
    },
    meta: { ident, id: '11004', cid: '11005' },
  }
  const expectedDeleteAction = {
    type: 'DELETE',
    payload: {
      type: 'entry',
      timestamp: theTime,
      isodate: new Date(theTime).toISOString(),
      targetService: 'store',
      endpoint: 'deleteExpired',
    },
    meta: { ident, cid: '11005', queue: true },
  }
  const expected = { status: 'queued' }

  const ret = await expire(action, { ...handlerResources, dispatch })

  t.deepEqual(ret, expected)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedDeleteAction)
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
