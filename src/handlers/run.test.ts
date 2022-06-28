import test from 'ava'
import sinon = require('sinon')
import handlerResources from '../tests/helpers/handlerResources'

import run from './run'

// Tests

test('should run a simple action', async (t) => {
  const dispatch = sinon.stub().resolves({
    response: { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] },
  })
  const jobs = {
    action1: {
      id: 'action1',
      action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action1',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedResponse = {
    ...action,
    response: { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] },
  }

  const ret = await run(jobs)(action, { ...handlerResources, dispatch })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.deepEqual(ret, expectedResponse)
})

test('should run a simple flow with one action', async (t) => {
  const dispatch = sinon.stub().resolves({
    response: { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] },
  })
  const jobs = {
    action1: {
      id: 'action1',
      action: [
        {
          id: 'getEntry',
          action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
        },
      ],
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action1',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedResponse = {
    ...action,
    response: { status: 'ok' }, // We don't return data in flows by default
  }

  const ret = await run(jobs)(action, { ...handlerResources, dispatch })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.deepEqual(ret, expectedResponse)
})

test('should run two actions in sequence', async (t) => {
  const dispatch = sinon.stub().resolves({
    response: { status: 'ok' },
  })
  const jobs = {
    action2: {
      id: 'action2',
      action: [
        {
          id: 'setEntry',
          action: {
            type: 'SET',
            payload: {
              type: 'entry',
              id: 'ent1',
              data: [{ id: 'ent1', $type: 'entry' }],
            },
          },
        },
        {
          id: 'setDate',
          action: {
            type: 'SET',
            payload: {
              type: 'date',
              id: 'updatedAt',
            },
          },
        },
      ],
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action2',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction1 = {
    type: 'SET',
    payload: {
      type: 'entry',
      id: 'ent1',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction2 = {
    type: 'SET',
    payload: {
      type: 'date',
      id: 'updatedAt',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedResponse = {
    ...action,
    response: { status: 'ok' }, // Won't return data unless specified
  }

  const ret = await run(jobs)(action, { ...handlerResources, dispatch })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expectedAction1)
  t.deepEqual(dispatch.args[1][0], expectedAction2)
  t.deepEqual(ret, expectedResponse)
})

test('should not run second action when first in sequence fails', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({
      response: { status: 'ok' },
    })
    .onCall(0)
    .resolves({ response: { status: 'timeout', error: 'Too slow' } })
  const jobs = {
    action2: {
      id: 'action2',
      action: [
        {
          id: 'setEntry',
          action: {
            type: 'SET',
            payload: {
              type: 'entry',
              id: 'ent1',
              data: [{ id: 'ent1', $type: 'entry' }],
            },
          },
        },
        {
          id: 'setDate',
          action: {
            type: 'SET',
            payload: {
              type: 'date',
              id: 'updatedAt',
            },
          },
        },
      ],
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action2',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const ret = await run(jobs)(action, { ...handlerResources, dispatch })

  t.is(dispatch.callCount, 1) // Only the first action should run
  t.is(ret.response?.status, 'error', ret.response?.error)
  t.is(
    ret.response?.error,
    "Could not finish job 'action2', the following steps failed: 'setEntry' (timeout: Too slow)"
  )
})

test('should run two actions in parallel', async (t) => {
  const dispatch = sinon.stub().resolves({
    response: { status: 'ok' },
  })
  const jobs = {
    action3: {
      id: 'action3',
      action: [
        [
          {
            id: 'setEntry',
            action: {
              type: 'SET',
              payload: {
                type: 'entry',
                id: 'ent1',
                data: [{ id: 'ent1', $type: 'entry' }],
              },
            },
          },
          {
            id: 'setDate',
            action: {
              type: 'SET',
              payload: {
                type: 'date',
                id: 'updatedAt',
              },
            },
          },
        ],
      ],
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action3',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction1 = {
    type: 'SET',
    payload: {
      type: 'entry',
      id: 'ent1',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction2 = {
    type: 'SET',
    payload: {
      type: 'date',
      id: 'updatedAt',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedResponse = {
    ...action,
    response: { status: 'ok' }, // Won't return data unless specified
  }

  const ret = await run(jobs)(action, { ...handlerResources, dispatch })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expectedAction1)
  t.deepEqual(dispatch.args[1][0], expectedAction2)
  t.deepEqual(ret, expectedResponse)
})

test('should run all actions in parallel even if one of them fails', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({
      response: { status: 'ok' },
    })
    .onCall(0)
    .resolves({ response: { status: 'timeout', error: 'Too slow' } })
  const jobs = {
    action3: {
      id: 'action3',
      action: [
        [
          {
            id: 'setEntry',
            action: {
              type: 'SET',
              payload: {
                type: 'entry',
                id: 'ent1',
                data: [{ id: 'ent1', $type: 'entry' }],
              },
            },
          },
          {
            id: 'setDate',
            action: {
              type: 'SET',
              payload: {
                type: 'date',
                id: 'updatedAt',
              },
            },
          },
        ],
      ],
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action3',
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await run(jobs)(action, { ...handlerResources, dispatch })

  t.is(ret.response?.status, 'error', ret.response?.error)
  t.is(
    ret.response?.error,
    "Could not finish job 'action3', the following steps failed: 'setEntry' (timeout: Too slow)"
  )
  t.is(dispatch.callCount, 2)
})

test('should return error from all parallel actions', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ response: { status: 'timeout', error: 'Too slow' } })
  const jobs = {
    action3: {
      id: 'action3',
      action: [
        [
          {
            id: 'setEntry',
            action: {
              type: 'SET',
              payload: {
                type: 'entry',
                id: 'ent1',
                data: [{ id: 'ent1', $type: 'entry' }],
              },
            },
          },
          {
            id: 'setDate',
            action: {
              type: 'SET',
              payload: {
                type: 'date',
                id: 'updatedAt',
              },
            },
          },
        ],
      ],
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action3',
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await run(jobs)(action, { ...handlerResources, dispatch })

  t.is(ret.response?.status, 'error', ret.response?.error)
  t.is(
    ret.response?.error,
    "Could not finish job 'action3', the following steps failed: 'setEntry' (timeout: Too slow), 'setDate' (timeout: Too slow)"
  )
  t.is(dispatch.callCount, 2)
})

test('should return noaction when job has no action', async (t) => {
  const dispatch = sinon.stub().resolves({ response: { status: 'ok' } })
  const jobs = {
    action1: {
      id: 'action1',
      action: [],
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action1',
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await run(jobs)(action, { ...handlerResources, dispatch })

  t.is(ret.response?.status, 'noaction', ret.response?.error)
  t.is(dispatch.callCount, 0)
})

test('should return notfound for unknown job', async (t) => {
  const dispatch = sinon.stub().resolves({ response: { status: 'ok' } })
  const jobs = {
    action1: {
      id: 'action1',
      action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action0', // Unknown id
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await run(jobs)(action, { ...handlerResources, dispatch })

  t.is(ret.response?.status, 'notfound', ret.response?.error)
  t.is(ret.response?.error, "No job with id 'action0'")
  t.is(dispatch.callCount, 0)
})
