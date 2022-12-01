import test from 'ava'
import sinon = require('sinon')
import handlerResources from '../tests/helpers/handlerResources'

import run from './run'

// Setup

const defaultResources = {
  getService: () => undefined,
  setProgress: () => undefined,
  options: {},
}

const mapOptions = {}

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
    meta: { ident: { id: 'johnf' }, id: '12345', project: 'test' },
  }
  const expectedAction = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' },
    meta: { ident: { id: 'johnf' }, project: 'test' },
  }
  const expectedResponse = {
    ...action,
    response: { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] },
  }

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

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
      flow: [
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

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

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
      flow: [
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

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

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
      flow: [
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
  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(dispatch.callCount, 1) // Only the first action should run
  t.is(ret.response?.status, 'error', ret.response?.error)
  t.is(
    ret.response?.error,
    "Could not finish job 'action2', the following steps failed: 'setEntry' (timeout: Too slow)"
  )
})

test('should continue when action is queued', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({
      response: { status: 'ok' },
    })
    .onCall(0)
    .resolves({ response: { status: 'queued' } })
  const jobs = {
    action2: {
      id: 'action2',
      flow: [
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
  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(dispatch.callCount, 2)
  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(ret.response?.error, undefined)
})

test('should not treat noaction as error', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({
      response: { status: 'ok' },
    })
    .onCall(0)
    .resolves({ response: { status: 'noaction', error: 'Nothing to set' } })
  const jobs = {
    action2: {
      id: 'action2',
      flow: [
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
  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(dispatch.callCount, 2) // Both actions should run
  t.is(ret.response?.status, 'ok', ret.response?.error)
})

test('should run two actions in parallel', async (t) => {
  const dispatch = sinon.stub().resolves({
    response: { status: 'ok' },
  })
  const jobs = {
    action3: {
      id: 'action3',
      flow: [
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

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

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
      flow: [
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

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'error', ret.response?.error)
  t.is(
    ret.response?.error,
    "Could not finish job 'action3', the following steps failed: 'setEntry' (timeout: Too slow)"
  )
  t.is(dispatch.callCount, 2)
})

test('should not run next step after any parallel steps failed', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ response: { status: 'ok', data: [] } })
    .onCall(0)
    .resolves({ response: { status: 'timeout', error: 'Too slow' } })
  const jobs = {
    action6: {
      id: 'action6',
      flow: [
        [
          {
            id: 'getEntries',
            action: {
              type: 'GET',
              payload: { type: 'entry' },
            },
          },
          {
            id: 'getUsers',
            action: {
              type: 'GET',
              payload: { type: 'user' },
            },
          },
        ],
        {
          id: 'setDate',
          action: {
            type: 'SET',
            payload: { type: 'date', id: 'updatedAt' },
          },
        },
      ],
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action6',
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(dispatch.callCount, 2) // Only the two parallel steps should run
  t.is(ret.response?.status, 'error', ret.response?.error)
})

test('should return error from all parallel actions', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ response: { status: 'timeout', error: 'Too slow' } })
  const jobs = {
    action3: {
      id: 'action3',
      flow: [
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

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'error', ret.response?.error)
  t.is(
    ret.response?.error,
    "Could not finish job 'action3', the following steps failed: 'setEntry' (timeout: Too slow), 'setDate' (timeout: Too slow)"
  )
  t.is(dispatch.callCount, 2)
})

test('should not treat noaction as error in parallel actions', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ response: { status: 'noaction', error: 'Nothing to set' } })
  const jobs = {
    action3: {
      id: 'action3',
      flow: [
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
              payload: { type: 'date', id: 'updatedAt' },
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

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(dispatch.callCount, 2)
})

test('should handle rejections in parallel steps', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ response: { status: 'ok', data: [] } })
    .onCall(0)
    .rejects(new Error('Failure!'))
  const jobs = {
    action3: {
      id: 'action3',
      flow: [
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
              payload: { type: 'date', id: 'updatedAt' },
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

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'error', ret.response?.error)
  t.is(
    ret.response?.error,
    "Could not finish job 'action3', the following steps failed: 'setEntry' (rejected: Failure!)"
  )
  t.is(dispatch.callCount, 2)
})

test('should not run second action when its conditions fail', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({
      response: { status: 'ok' },
    })
    .onCall(0)
    .resolves({ response: { status: 'ok', data: [] } })
  const jobs = {
    action6: {
      id: 'action6',
      flow: [
        {
          id: 'getEntries',
          action: {
            type: 'GET',
            payload: { type: 'entry' },
          },
        },
        {
          id: 'setEntries',
          conditions: {
            'getEntries.response.data': { type: 'array', minItems: 1 },
          },
          action: {
            type: 'SET',
            payload: { type: 'entry' },
          },
        },
      ],
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action6',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(dispatch.callCount, 1) // Only the first step should run
  t.is(ret.response?.status, 'error', ret.response?.error)
  t.is(
    ret.response?.error,
    "Could not finish job 'action6', the following steps failed: 'setEntries' (error: 'getEntries.response.data' did not pass { type: 'array', minItems: 1 })"
  )
})

test('should use fail message and status from failed condition', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({
      response: { status: 'ok' },
    })
    .onCall(0)
    .resolves({ response: { status: 'ok', data: [] } })
  const jobs = {
    action6: {
      id: 'action6',
      flow: [
        {
          id: 'getEntries',
          action: {
            type: 'GET',
            payload: { type: 'entry' },
          },
        },
        {
          id: 'setEntries',
          conditions: {
            'getEntries.response.status': {
              const: 'ok',
              onFail: { message: 'Response must be ok' },
            },
            'getEntries.response.data': {
              type: 'array',
              minItems: 1,
              onFail: {
                message: 'No data to set',
                status: 'noaction',
              },
            },
          },
          action: {
            type: 'SET',
            payload: { type: 'entry' },
          },
        },
      ],
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action6',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(dispatch.callCount, 1) // Only the first step should run
  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(
    ret.response?.warning,
    "Message from steps: 'setEntries' (noaction: No data to set)"
  )
})

test('should not continue flow when condition marked with break fails', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({
      response: { status: 'ok' },
    })
    .onCall(0)
    .resolves({ response: { status: 'ok', data: [] } })
  const jobs = {
    action6: {
      id: 'action6',
      flow: [
        {
          id: 'getEntries',
          conditions: {
            'action.payload.id': {
              type: 'string',
              onFail: {
                status: 'badrequest',
                message: 'Must be called with an id',
                break: true,
              },
            },
          },
          action: {
            type: 'GET',
            payload: { type: 'entry' },
          },
        },
        {
          id: 'setEntries',
          conditions: {
            'getEntries.response.data': {
              type: 'array',
              minItems: 1,
            },
          },
          action: {
            type: 'SET',
            payload: { type: 'entry' },
          },
        },
      ],
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action6',
      id: undefined,
    },
    meta: { ident: { id: 'johnf' } },
  }
  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(dispatch.callCount, 0) // No steps should be run
  t.is(ret.response?.status, 'error', ret.response?.error)
  t.is(
    ret.response?.error,
    "Could not finish job 'action6', the following steps failed: 'getEntries' (badrequest: Must be called with an id)"
  )
})

test('should run second action when its conditions are fulfilled', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({
      response: { status: 'ok' },
    })
    .onCall(0)
    .resolves({
      response: { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] },
    })
  const jobs = {
    action6: {
      id: 'action6',
      flow: [
        {
          id: 'getEntries',
          action: {
            type: 'GET',
            payload: { type: 'entry' },
          },
        },
        {
          id: 'setEntries',
          conditions: {
            'getEntries.response.data': { type: 'array', minItems: 1 },
          },
          action: {
            type: 'SET',
            payload: { type: 'entry' },
          },
        },
      ],
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action6',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(dispatch.callCount, 2) // Both steps run
  t.is(ret.response?.status, 'ok', ret.response?.error)
})

test('should validate conditions in parallel actions too', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({
      response: { status: 'ok' },
    })
    .onCall(0)
    .resolves({ response: { status: 'ok', data: [] } })
  const jobs = {
    action3: {
      id: 'action3',
      flow: [
        [
          {
            id: 'setEntry',
            conditions: {
              'action.payload.id': { type: 'string' },
            },
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
              payload: { type: 'date', id: 'updatedAt' },
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
      id: undefined,
    },
    meta: { ident: { id: 'johnf' } },
  }
  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(dispatch.callCount, 1) // Only the first step should run
  t.is(ret.response?.status, 'error', ret.response?.error)
  t.is(
    ret.response?.error,
    "Could not finish job 'action3', the following steps failed: 'setEntry' (error: 'action.payload.id' did not pass { type: 'string' })"
  )
})

test('should return noaction when job has an empty flow', async (t) => {
  const dispatch = sinon.stub().resolves({ response: { status: 'ok' } })
  const jobs = {
    action1: {
      id: 'action1',
      flow: [],
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action1',
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

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

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'notfound', ret.response?.error)
  t.is(ret.response?.error, "No job with id 'action0'")
  t.is(dispatch.callCount, 0)
})

test('should mutate simple action', async (t) => {
  const dispatch = sinon.stub().resolves({
    response: { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] },
  })
  const jobs = {
    action1: {
      id: 'action1',
      action: {
        type: 'GET',
        payload: { type: 'entry', id: 'ent1' },
        meta: { queue: true },
      },
      mutation: { 'payload.flag': { $value: true } },
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
    payload: { type: 'entry', id: 'ent1', flag: true },
    meta: { ident: { id: 'johnf' }, queue: true },
  }
  const expectedResponse = {
    ...action,
    response: { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] },
  }

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.deepEqual(ret, expectedResponse)
})

test('should mutate action with result from previous action', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({
      response: { status: 'ok' },
    })
    .onCall(0)
    .resolves({
      response: {
        status: 'ok',
        data: [
          { id: 'ent1', $type: 'entry', section: 'news' },
          { id: 'ent2', $type: 'entry', section: 'sports' },
        ],
      },
    })
  const jobs = {
    action3: {
      id: 'action3',
      flow: [
        {
          id: 'getEntries',
          action: {
            type: 'GET',
            payload: { type: 'entry' },
          },
        },
        {
          id: 'setEntries',
          action: {
            type: 'SET',
            payload: { type: 'entry' },
          },
          mutation: {
            'payload.data': '^^getEntries.response.data',
            'payload.sections': '^^getEntries.response.data.section',
          },
        },
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
  const expectedAction2 = {
    type: 'SET',
    payload: {
      type: 'entry',
      sections: ['news', 'sports'],
      data: [
        { id: 'ent1', $type: 'entry', section: 'news' },
        { id: 'ent2', $type: 'entry', section: 'sports' },
      ],
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedResponse = {
    ...action,
    response: { status: 'ok' }, // Won't return data unless specified
  }

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[1][0], expectedAction2)
  t.deepEqual(ret, expectedResponse)
})

test('should mutate action with payload from original action', async (t) => {
  const dispatch = sinon.stub().resolves({
    response: { status: 'ok' },
  })
  const jobs = {
    action3: {
      id: 'action3',
      flow: [
        {
          id: 'setEntries',
          action: {
            type: 'SET',
            payload: { type: 'entry' },
          },
          mutation: {
            'payload.data': '^^action.payload.data',
            'payload.sections': [
              '^^action.payload',
              {
                $alt: ['section', 'data.section[]'],
              },
              {
                $transform: 'template',
                template: 'section-{{.}}',
                $iterate: true,
              },
            ],
          },
        },
      ],
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action3',
      data: [
        { id: 'ent1', $type: 'entry', section: 'news' },
        { id: 'ent2', $type: 'entry', section: 'sports' },
      ],
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction = {
    type: 'SET',
    payload: {
      type: 'entry',
      sections: ['section-news', 'section-sports'],
      data: [
        { id: 'ent1', $type: 'entry', section: 'news' },
        { id: 'ent2', $type: 'entry', section: 'sports' },
      ],
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedResponse = {
    ...action,
    response: { status: 'ok' }, // Won't return data unless specified
  }

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.deepEqual(ret, expectedResponse)
})

test('should mutate action with result from previous and parallel actions', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({
      response: { status: 'ok' },
    })
    .onCall(0)
    .resolves({
      response: {
        status: 'ok',
        data: {
          id: 'date1',
          $type: 'date',
          date: new Date('2022-06-14T18:43:11Z'),
        },
      },
    })
    .onCall(1)
    .resolves({
      response: {
        status: 'ok',
        data: [
          { id: 'ent1', $type: 'entry', section: 'news' },
          { id: 'ent2', $type: 'entry', section: 'sports' },
        ],
      },
    })
    .onCall(2)
    .resolves({
      response: { status: 'ok', data: { id: 'johnf', name: 'John F.' } },
    })
  const jobs = {
    action3: {
      id: 'action3',
      flow: [
        {
          id: 'getLastSyncedDate',
          action: {
            type: 'GET',
            payload: { type: 'date' },
          },
        },
        [
          {
            id: 'getEntries',
            action: {
              type: 'GET',
              payload: { type: 'entry' },
            },
            mutation: {
              'payload.since': '^^getLastSyncedDate.response.data.date',
            },
          },
          {
            id: 'getUser',
            action: {
              type: 'GET',
              payload: { type: 'user', id: 'johnf' },
            },
          },
        ],
        {
          id: 'setEntries',
          action: {
            type: 'SET',
            payload: { type: 'entry' },
          },
          mutation: {
            'payload.data': '^^getEntries.response.data',
            'payload.sections': '^^getEntries.response.data.section',
            'payload.user': '^^getUser.response.data.name',
            'payload.entriesSince': '^^getLastSyncedDate.response.data.date',
          },
        },
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
  const expectedAction2 = {
    type: 'GET',
    payload: {
      type: 'entry',
      since: new Date('2022-06-14T18:43:11Z'),
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction4 = {
    type: 'SET',
    payload: {
      type: 'entry',
      sections: ['news', 'sports'],
      data: [
        { id: 'ent1', $type: 'entry', section: 'news' },
        { id: 'ent2', $type: 'entry', section: 'sports' },
      ],
      user: 'John F.',
      entriesSince: new Date('2022-06-14T18:43:11Z'),
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedResponse = {
    ...action,
    response: { status: 'ok' }, // Won't return data unless specified
  }

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(dispatch.callCount, 4)
  t.deepEqual(dispatch.args[1][0], expectedAction2)
  t.deepEqual(dispatch.args[3][0], expectedAction4)
  t.deepEqual(ret, expectedResponse)
})

test('should mutate action with data from the original action', async (t) => {
  const dispatch = sinon.stub().resolves({
    response: { status: 'ok' },
  })
  const jobs = {
    action5: {
      id: 'action5',
      flow: [
        {
          id: 'setData',
          action: {
            type: 'SET',
            payload: { type: 'entry' },
          },
          mutation: {
            'payload.toSection': '^^action.payload.section',
            'payload.data': '^^action.payload.data',
          },
        },
      ],
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action5',
      section: 'news',
      data: [
        { id: 'ent1', $type: 'entry' },
        { id: 'ent5', $type: 'entry' },
      ],
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction = {
    type: 'SET',
    payload: {
      type: 'entry',
      toSection: 'news',
      data: [
        { id: 'ent1', $type: 'entry' },
        { id: 'ent5', $type: 'entry' },
      ],
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
})

test('should mutate with transformers and pipelines', async (t) => {
  const dispatch = sinon.stub().resolves({
    response: { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] },
  })
  const nowDate = new Date()
  const mapOptions = {
    functions: {
      now: () => () => nowDate,
    },
    pipelines: {
      userInfo: [{ $value: { id: 'johnf', name: 'John F.' } }],
    },
  }
  const jobs = {
    action1: {
      id: 'action1',
      flow: [
        {
          id: 'getEntry',
          action: { type: 'GET', payload: { type: 'entry' } },
          mutation: {
            'payload.until': { $transform: 'now' },
            'payload.user': [{ $apply: 'userInfo' }, 'id'],
          },
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
    payload: { type: 'entry', until: nowDate, user: 'johnf' },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedResponse = {
    ...action,
    response: { status: 'ok' }, // We don't return data in flows by default
  }

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.deepEqual(ret, expectedResponse)
})

test('should mutate simple action with pipeline', async (t) => {
  const dispatch = sinon.stub().resolves({
    response: { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] },
  })
  const jobs = {
    action1: {
      id: 'action1',
      action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
      mutation: [
        { payload: 'payload', 'payload.flag': { $value: true } }, // `$modify: true` is added
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
    payload: { type: 'entry', id: 'ent1', flag: true },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedResponse = {
    ...action,
    response: { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] },
  }

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.deepEqual(ret, expectedResponse)
})

test('should mutate action into several actions based on iterate path', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({
      response: { status: 'ok', data: [] },
    })
    .onCall(2)
    .resolves({
      response: { status: 'ok', data: [{ id: 'ent3', title: 'Entry 3' }] },
    })
  const jobs = {
    action11: {
      id: 'action11',
      flow: [
        {
          id: 'setItem',
          action: { type: 'SET', payload: { type: 'entry' } },
          iteratePath: 'action.payload.data.items',
          mutation: { 'payload.key': 'payload.data.id' },
        },
      ],
      responseMutation: {
        response: {
          $modify: 'response',
          data: '^^setItem_2.response.data', // To verify that the actions get postfixed with index
        },
      },
    },
  }
  const data = { items: [{ id: 'ent1' }, { id: 'ent2' }, { id: 'ent3' }] }
  const action = {
    type: 'RUN',
    payload: { jobId: 'action11', data },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction0 = {
    type: 'SET',
    payload: { type: 'entry', data: { id: 'ent1' }, key: 'ent1' },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction1 = {
    type: 'SET',
    payload: { type: 'entry', data: { id: 'ent2' }, key: 'ent2' },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction2 = {
    type: 'SET',
    payload: { type: 'entry', data: { id: 'ent3' }, key: 'ent3' },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedResponse = {
    ...action,
    response: { status: 'ok', data: [{ id: 'ent3', title: 'Entry 3' }] },
  }

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(dispatch.callCount, 3)
  t.deepEqual(dispatch.args[0][0], expectedAction0)
  t.deepEqual(dispatch.args[1][0], expectedAction1)
  t.deepEqual(dispatch.args[2][0], expectedAction2)
  t.deepEqual(ret, expectedResponse)
  t.is(ret.response?.status, 'ok', ret.response?.error)
})

test('should combine response data from several actions based on iterate path', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ response: { status: 'ok', data: ['ent1', 'ent2', 'ent3'] } })
    .onCall(1)
    .resolves({ response: { status: 'ok', data: { id: 'ent1' } } })
    .onCall(2)
    .resolves({ response: { status: 'ok', data: { id: 'ent2' } } })
    .onCall(3)
    .resolves({ response: { status: 'ok', data: { id: 'ent3' } } })
  const jobs = {
    action12: {
      id: 'action12',
      flow: [
        {
          id: 'getIds',
          action: { type: 'GET', payload: { type: 'entry' } },
        },
        {
          id: 'getItems',
          action: { type: 'GET', payload: {} },
          iteratePath: 'getIds.response.data',
          mutation: {
            payload: { type: { $value: 'entry' }, id: 'payload.data' },
          },
        },
      ],
      responseMutation: {
        response: {
          $modify: 'response',
          data: '^^getItems.response.data', // Will be the combined response data from all individual actions
        },
      },
    },
  }
  const action = {
    type: 'RUN',
    payload: { jobId: 'action12', ids: ['ent1', 'ent2', 'ent3'] },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction0 = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction1 = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction2 = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent2' },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction3 = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent3' },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedResponse = {
    ...action,
    response: {
      status: 'ok',
      data: [{ id: 'ent1' }, { id: 'ent2' }, { id: 'ent3' }],
    },
  }

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(dispatch.callCount, 4)
  t.deepEqual(dispatch.args[0][0], expectedAction0)
  t.deepEqual(dispatch.args[1][0], expectedAction1)
  t.deepEqual(dispatch.args[2][0], expectedAction2)
  t.deepEqual(dispatch.args[3][0], expectedAction3)
  t.deepEqual(ret, expectedResponse)
})

test('should mutate action into several actions based on iterate path in parallell steps', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({
      response: { status: 'ok', data: [] },
    })
    .onCall(2)
    .resolves({
      response: { status: 'ok', data: [{ id: 'ent3', title: 'Entry 3' }] },
    })
  const jobs = {
    action11: {
      id: 'action11',
      flow: [
        [
          {
            id: 'setItem',
            action: { type: 'SET', payload: { type: 'entry' } },
            iteratePath: 'action.payload.data.items',
            mutation: { 'payload.flag': { $value: true } }, // `$modify: true` is added
          },
        ],
      ],
      responseMutation: {
        response: {
          $modify: 'response',
          data: '^^setItem_2.response.data', // To verify that the actions get postfixed with index
        },
      },
    },
  }
  const data = { items: [{ id: 'ent1' }, { id: 'ent2' }, { id: 'ent3' }] }
  const action = {
    type: 'RUN',
    payload: { jobId: 'action11', data },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction0 = {
    type: 'SET',
    payload: { type: 'entry', data: { id: 'ent1' }, flag: true },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedResponse = {
    ...action,
    response: { status: 'ok', data: [{ id: 'ent3', title: 'Entry 3' }] },
  }

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.is(dispatch.callCount, 3)
  t.deepEqual(dispatch.args[0][0], expectedAction0)
  t.deepEqual(dispatch.args[1][0].payload.data.id, 'ent2')
  t.deepEqual(dispatch.args[2][0].payload.data.id, 'ent3')
  t.deepEqual(ret, expectedResponse)
})

test('should return data from simple action based on mutation', async (t) => {
  const dispatch = sinon.stub().resolves({
    response: { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] },
  })
  const jobs = {
    action1: {
      id: 'action1',
      action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
      responseMutation: {
        'response.data': 'response.data[0]',
      },
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action1',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = { id: 'ent1', $type: 'entry' }

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.deepEqual(ret.response?.data, expected)
  t.is(dispatch.callCount, 1)
})

test('should return data from flow based on mutation', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ response: { status: 'ok', data: [] } })
    .onCall(0)
    .resolves({
      response: { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] },
    })
    .onCall(1)
    .resolves({
      response: { status: 'ok', data: [{ id: 'johnf', $type: 'user' }] },
    })
  const jobs = {
    action6: {
      id: 'action6',
      flow: [
        [
          {
            id: 'getEntries',
            action: {
              type: 'GET',
              payload: { type: 'entry' },
            },
          },
          {
            id: 'getUsers',
            action: {
              type: 'GET',
              payload: { type: 'user' },
            },
          },
        ],
        {
          id: 'setDate',
          action: {
            type: 'SET',
            payload: { type: 'date', id: 'updatedAt' },
          },
        },
      ],
      responseMutation: {
        'response.data': '^^getEntries.response.data',
      },
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action6',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = [{ id: 'ent1', $type: 'entry' }]

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.deepEqual(ret.response?.data, expected)
  t.is(dispatch.callCount, 3)
})

test('should return data based on mutation from original action', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ response: { status: 'ok', data: [] } })
  const jobs = {
    action7: {
      id: 'action7',
      flow: [
        {
          id: 'setDate',
          action: {
            type: 'SET',
            payload: { type: 'date', id: 'updatedAt' },
          },
        },
      ],
      responseMutation: {
        'response.data': 'payload.data',
      },
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action7',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = [{ id: 'ent1', $type: 'entry' }]

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'ok', ret.response?.error)
  t.deepEqual(ret.response?.data, expected)
})

test('should return response with error message', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ response: { status: 'ok', data: { errorMessage: 'No data' } } })
  const jobs = {
    action7: {
      id: 'action7',
      flow: [
        {
          id: 'setDate',
          action: {
            type: 'SET',
            payload: { type: 'date', id: 'updatedAt' },
          },
        },
      ],
      responseMutation: {
        'response.error': '^^setDate.response.data.errorMessage',
      },
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action7',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'error', ret.response?.error)
  t.deepEqual(ret.response?.error, 'No data')
})

test('should join array of error messsages', async (t) => {
  const dispatch = sinon.stub().resolves({
    response: {
      status: 'ok',
      data: { errorMessages: ['No data', 'And no fun either'] },
    },
  })
  const jobs = {
    action7: {
      id: 'action7',
      flow: [
        {
          id: 'setDate',
          action: {
            type: 'SET',
            payload: { type: 'date', id: 'updatedAt' },
          },
        },
      ],
      responseMutation: {
        'response.error': '^^setDate.response.data.errorMessages',
      },
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action7',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'error', ret.response?.error)
  t.deepEqual(ret.response?.error, 'No data | And no fun either')
})

test('should return response with responseMutation pipeline', async (t) => {
  const dispatch = sinon
    .stub()
    .onCall(0)
    .resolves({
      response: {
        status: 'ok',
        data: [{ id: 'ent1', $type: 'entry' }],
      },
    })
    .onCall(1)
    .resolves({
      response: {
        status: 'ok',
        data: {
          id: 'date1',
          $type: 'date',
          date: new Date('2022-09-14T00:43:44Z'),
        },
        params: { queue: true },
      },
    })
  const jobs = {
    action8: {
      id: 'action8',
      flow: [
        {
          id: 'getEntries',
          action: { type: 'GET', payload: { type: 'entries' } },
        },
        {
          id: 'setDate',
          action: { type: 'SET', payload: { type: 'date', id: 'updatedAt' } },
        },
      ],
      responseMutation: [
        {
          'response.data': '^^getEntries.response.data',
        },
      ],
    },
  }
  const action = {
    type: 'RUN',
    payload: { jobId: 'action8' },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'ok',
    data: [{ id: 'ent1', $type: 'entry' }],
  }

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.deepEqual(ret.response, expected)
})

test('should run responseMutation pipeline on response from step', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ response: { status: 'ok', data: [] } })
  const jobs = {
    action8: {
      id: 'action8',
      flow: [
        {
          id: 'getEntries',
          action: { type: 'GET', payload: { type: 'entries' } },
          responseMutation: [
            {
              'response.status': {
                $if: {
                  $transform: 'compare',
                  path: 'response.status',
                  match: 'ok',
                },
                then: { $value: 'error' },
                else: 'response.status',
              },
            },
          ],
        },
        {
          id: 'setDate',
          action: { type: 'SET', payload: { type: 'date', id: 'updatedAt' } },
        },
      ],
    },
  }
  const action = {
    type: 'RUN',
    payload: { jobId: 'action8' },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'error',
    error: '',
  }

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.deepEqual(ret.response, expected)
})

test('should return error from a sub-flow started with RUN and make it available on action.response', async (t) => {
  const jobs = {
    action9: {
      id: 'action9',
      flow: [
        {
          id: 'getEntries',
          action: { type: 'GET', payload: { type: 'entry' } },
        },
        {
          id: 'setEntriesInOtherFlow',
          action: { type: 'RUN', payload: { jobId: 'action10' } },
          mutation: {
            'payload.data': '^^getEntries.response.data',
          },
        },
        {
          id: 'setDate',
          action: { type: 'SET', payload: { type: 'date', id: 'updatedAt' } },
        },
      ],
      responseMutation: {
        response: {
          $if: {
            $transform: 'compare',
            path: '^^getEntries.status',
            match: 'notfound',
          },
          then: { status: 'ok' },
          else: '^^action.response',
        },
      },
    },
    action10: {
      id: 'action10',
      flow: [
        {
          id: 'setEntries',
          conditions: {
            'action.payload.data': {
              type: 'array',
              minItems: 1,
              onFail: 'Need at least one data item',
            },
          },
          action: { type: 'SET', payload: { type: 'entry' } },
          mutation: {
            'payload.data': '^^action.payload.data',
          },
        },
      ],
    },
  }
  const runFn = run(jobs, mapOptions)
  const dispatch = sinon
    .stub()
    .onCall(0)
    .resolves({ response: { status: 'ok', data: [] } })
    .onCall(1)
    .callsFake((action) => runFn(action, { ...defaultResources, dispatch }))
  const action = {
    type: 'RUN',
    payload: { jobId: 'action9' },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'error',
    error:
      "Could not finish job 'action9', the following steps failed: 'setEntriesInOtherFlow' (error: Could not finish job 'action10', the following steps failed: 'setEntries' (error: Need at least one data item))",
  }

  const ret = await runFn(action, { ...handlerResources, dispatch })

  t.deepEqual(ret.response, expected)
  t.is(dispatch.callCount, 2)
  // t.deepEqual(dispatch.args[1][0], {})
})

test('should return response with error from data', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ response: { status: 'ok', data: { errorMessage: 'No data' } } })
  const jobs = {
    action7: {
      id: 'action7',
      flow: [
        {
          id: 'setDate',
          action: {
            type: 'SET',
            payload: { type: 'date', id: 'updatedAt' },
          },
        },
      ],
      responseMutation: [
        {
          'response.error': '^^setDate.response.data.errorMessage',
        },
      ],
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action7',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    meta: { ident: { id: 'johnf' } },
  }

  const ret = await run(jobs, mapOptions)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.response?.status, 'error', ret.response?.error)
  t.deepEqual(ret.response?.error, 'No data')
})

test.todo('should support sub-flow')
test.todo('should run responseMutation pipeline on response from sub-flow')
test.todo('should return error for invalid job (missing action and flow)')
