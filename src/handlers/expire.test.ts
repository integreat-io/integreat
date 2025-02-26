import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import handlerResources from '../tests/helpers/handlerResources.js'

import expire from './expire.js'

// Helpers

let clock: sinon.SinonFakeTimers | null = null
const theTime = Date.now()

const ident = { id: 'johnf' }

test('expire handler', async (t) => {
  t.before(() => {
    clock = sinon.useFakeTimers(theTime)
  })
  t.after(() => {
    clock?.restore()
  })

  // Tests

  await t.test('should dispatch GET with timestamp and isodate', async () => {
    const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
    const action = {
      type: 'EXPIRE',
      payload: { type: 'entry' },
      meta: { ident, id: '11004', cid: '11005', gid: '11004' },
    }
    const expected = {
      type: 'GET',
      payload: {
        type: 'entry',
        timestamp: theTime,
        isodate: new Date(theTime).toISOString(),
      },
      meta: { ident, cid: '11005', gid: '11004' },
    }

    const ret = await expire(action, { ...handlerResources, dispatch })

    assert.equal(ret.status, 'noaction', ret.error)
    assert.equal(dispatch.callCount, 1) // We're not deleting because there's no data
    assert.deepEqual(dispatch.args[0][0], expected)
  })

  await t.test('should dispatch GET with target service', async () => {
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

    assert.equal(dispatch.callCount, 1) // We're not deleting because there's no data
    assert.deepEqual(dispatch.args[0][0], expected)
  })

  await t.test('should dispatch GET to specified endpoint', async () => {
    const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
    const action = {
      type: 'EXPIRE',
      payload: {
        type: 'entry',
        targetService: 'store',
        endpoint: 'getExpired',
      },
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

    assert.equal(dispatch.callCount, 1) // We're not deleting because there's no data
    assert.deepEqual(dispatch.args[0][0], expected)
  })

  await t.test('should include other parameters in delete action', async () => {
    const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
    const action = {
      type: 'EXPIRE',
      payload: { type: 'entry', projectId: 'proj1' },
      meta: { ident, id: '11004', cid: '11005' },
    }
    const expected = {
      type: 'GET',
      payload: {
        type: 'entry',
        timestamp: theTime,
        isodate: new Date(theTime).toISOString(),
        projectId: 'proj1',
      },
      meta: { ident, cid: '11005' },
    }

    const ret = await expire(action, { ...handlerResources, dispatch })

    assert.equal(ret.status, 'noaction', ret.error)
    assert.equal(dispatch.callCount, 1) // We're not deleting because there's no data
    assert.deepEqual(dispatch.args[0][0], expected)
  })

  await t.test('should add msFromNow to current timestamp', async () => {
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

    assert.equal(dispatch.callCount, 1) // We're not deleting because there's no data
    assert.deepEqual(dispatch.args[0][0], expected)
  })

  await t.test('should queue DELETE for expired entries', async () => {
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
      payload: {
        type: 'entry',
        targetService: 'store',
        endpoint: 'getExpired',
        projectId: 'proj1',
      },
      meta: { ident, id: '11004', cid: '11005' },
    }
    const expectedDeleteAction = {
      type: 'DELETE',
      payload: {
        type: 'entry',
        data,
        targetService: 'store',
        projectId: 'proj1',
      },
      meta: { ident, cid: '11005', queue: true },
    }
    const expected = { status: 'queued' }

    const ret = await expire(action, { ...handlerResources, dispatch })

    assert.deepEqual(ret, expected)
    assert.equal(dispatch.callCount, 2)
    assert.deepEqual(dispatch.args[1][0], expectedDeleteAction)
  })

  await t.test('should queue DELETE with id and type only', async () => {
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
      payload: {
        type: 'entry',
        targetService: 'store',
        endpoint: 'getExpired',
      },
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

    assert.equal(ret.status, 'queued', ret.error)
    assert.equal(dispatch.callCount, 2)
    assert.deepEqual(dispatch.args[1][0], expectedDeleteAction)
  })

  await t.test('should not queue when no expired entries', async () => {
    const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
    dispatch
      .withArgs(sinon.match({ type: 'DELETE' }))
      .resolves({ status: 'queued' })
    const action = {
      type: 'EXPIRE',
      payload: {
        type: 'entry',
        targetService: 'store',
        endpoint: 'getExpired',
      },
    }
    const expected = {
      status: 'noaction',
      warning: "No items to expire from service 'store'",
      origin: 'handler:EXPIRE',
    }

    const ret = await expire(action, { ...handlerResources, dispatch })

    assert.equal(dispatch.calledWithMatch({ type: 'DELETE' }), false)
    assert.deepEqual(ret, expected)
  })

  await t.test('should not queue when GET returns error', async () => {
    const dispatch = sinon.stub().resolves({ status: 'notfound' })
    dispatch
      .withArgs(sinon.match({ type: 'DELETE' }))
      .resolves({ status: 'queued' })
    const action = {
      type: 'EXPIRE',
      payload: {
        type: 'entry',
        targetService: 'store',
        endpoint: 'getExpired',
      },
    }
    const expected = {
      status: 'error',
      error:
        "Could not get items from service 'store'. Reason: notfound undefined",
      origin: 'handler:EXPIRE',
    }

    const ret = await expire(action, { ...handlerResources, dispatch })

    assert.equal(dispatch.calledWithMatch({ type: 'DELETE' }), false)
    assert.deepEqual(ret, expected)
  })

  await t.test(
    'should DELETE with params and no GET when deleteWithParams is true',
    async () => {
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
          projectId: 'proj1',
        },
        meta: { ident, id: '11004', cid: '11005', gid: '11004' },
      }
      const expectedDeleteAction = {
        type: 'DELETE',
        payload: {
          type: 'entry',
          timestamp: theTime,
          isodate: new Date(theTime).toISOString(),
          targetService: 'store',
          projectId: 'proj1',
        },
        meta: { ident, cid: '11005', gid: '11004', queue: true },
      }
      const expected = { status: 'queued' }

      const ret = await expire(action, { ...handlerResources, dispatch })

      assert.deepEqual(ret, expected)
      assert.equal(dispatch.callCount, 1)
      assert.deepEqual(dispatch.args[0][0], expectedDeleteAction)
    },
  )

  await t.test(
    'should DELETE with params and no GET with specified endpoint',
    async () => {
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

      assert.deepEqual(ret, expected)
      assert.equal(dispatch.callCount, 1)
      assert.deepEqual(dispatch.args[0][0], expectedDeleteAction)
    },
  )

  await t.test('should return error when no type', async () => {
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

    assert.deepEqual(ret, expected)
  })
})
