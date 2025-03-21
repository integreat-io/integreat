import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import mapTransform from 'map-transform'
import Schedule from './Schedule.js'
import integreatTransformers from 'integreat-transformers'
import uriTransformer from 'integreat-adapter-uri/transformer.js'

import Job from './Job.js'

// Setup

const action = { type: 'GET', payload: { type: 'entry', id: 'ent1' } }

const mapOptions = {
  transformers: {
    size: integreatTransformers.size,
    uri: uriTransformer,
  },
}

const setProgress = () => {
  return undefined
}

// Tests

test('should create Job instance', () => {
  const jobDef = {
    id: 'action1',
    action,
  }
  const ret = new Job(jobDef, mapTransform, mapOptions)

  assert.equal(ret.id, 'action1')
  assert.equal(ret.schedule, undefined)
  assert.equal(typeof ret.run, 'function')
})

test('should create Job instance with Schedule', () => {
  const jobDef = {
    id: 'action1',
    cron: '* */1 * * *',
    tz: 'Europe/Oslo',
    action,
  }
  const ret = new Job(jobDef, mapTransform, mapOptions)

  assert.equal(ret.schedule instanceof Schedule, true)
  assert.equal(ret.schedule?.cron, '* */1 * * *')
  assert.equal(ret.schedule?.tz, 'Europe/Oslo')
})

test('should not create Schedule when no action or flow', () => {
  const jobDef = {
    id: 'action1',
    cron: '* */1 * * *',
    tz: 'Europe/Oslo',
  }
  const ret = new Job(jobDef, mapTransform, mapOptions)

  assert.equal(ret.schedule, undefined)
})

test('should generate a job id when none is given', () => {
  const jobDef = {
    // No id
    action,
  }
  const ret = new Job(jobDef, mapTransform, mapOptions)

  assert.equal(typeof ret.id, 'string')
  assert.equal(ret.id.length, 21)
})

test('should create Schedule when no id is given', () => {
  const jobDef = {
    // No id
    cron: '* */1 * * *',
    action,
  }
  const ret = new Job(jobDef, mapTransform, mapOptions)

  assert.notEqual(ret.schedule, undefined)
})

// Tests -- run

test('should run a simple action', async () => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    data: [{ id: 'ent1', $type: 'entry' }],
  })
  const jobDef = {
    id: 'action1',
    action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action1',
    },
    meta: {
      ident: { id: 'johnf' },
      id: '12345',
      cid: '23456',
      project: 'test',
      queue: true, // Should not be passed on to job steps
    },
  }
  const expectedAction = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' },
    meta: {
      ident: { id: 'johnf' },
      project: 'test',
      cid: '23456',
      jobId: 'action1',
    },
  }
  const expected = {
    status: 'ok',
    data: [{ id: 'ent1', $type: 'entry' }],
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 1)
  assert.deepEqual(dispatch.args[0][0], expectedAction)
  assert.deepEqual(ret, expected)
})

test('should return noaction response from a simple action', async () => {
  const dispatch = sinon.stub().resolves({
    status: 'noaction',
    error: 'Nothing to get',
  })
  const jobDef = {
    id: 'action1',
    action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action1',
    },
    meta: {
      ident: { id: 'johnf' },
      id: 'tVxTISDelftVBZSb8uWac',
      cid: 'tVxTISDelftVBZSb8uWac',
      dispatchedAt: 1699813027963,
      queuedAt: 1699813027963,
    },
  }
  const expectedAction = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' },
    meta: {
      ident: { id: 'johnf' },
      cid: 'tVxTISDelftVBZSb8uWac',
      jobId: 'action1',
    },
  }
  const expected = {
    status: 'noaction',
    error: 'Nothing to get',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 1)
  assert.deepEqual(dispatch.args[0][0], expectedAction)
})

test('should run a simple flow with one action', async () => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    data: [{ id: 'ent1', $type: 'entry' }],
  })
  const jobDef = {
    id: 'action1',
    flow: [
      {
        id: 'getEntry',
        action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
      },
    ],
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action1',
    },
    meta: { ident: { id: 'johnf' }, id: '12345', cid: '23456' },
  }
  const expectedAction = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' },
    meta: {
      ident: { id: 'johnf' },
      cid: '23456',
      jobId: 'action1',
      stepId: 'getEntry',
    },
  }
  const expected = {
    status: 'ok',
    data: [{ id: 'ent1', $type: 'entry' }],
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 1)
  assert.deepEqual(dispatch.args[0][0], expectedAction)
  assert.deepEqual(ret, expected)
})

test('should run two actions in sequence', async () => {
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const jobDef = {
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action2',
    },
    meta: {
      ident: { id: 'johnf' },
      id: '12345',
      cid: '23456',
      queue: true, // Should not be passed on to job steps
    },
  }
  const expectedAction1 = {
    type: 'SET',
    payload: {
      type: 'entry',
      id: 'ent1',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    meta: {
      ident: { id: 'johnf' },
      cid: '23456',
      jobId: 'action2',
      stepId: 'setEntry',
    },
  }
  const expectedAction2 = {
    type: 'SET',
    payload: {
      type: 'date',
      id: 'updatedAt',
    },
    meta: {
      ident: { id: 'johnf' },
      cid: '23456',
      jobId: 'action2',
      stepId: 'setDate',
    },
  }
  const expected = { status: 'ok' } // Won't return data unless specified

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 2)
  assert.deepEqual(dispatch.args[0][0], expectedAction1)
  assert.deepEqual(dispatch.args[1][0], expectedAction2)
  assert.deepEqual(ret, expected)
})

test('should not run second action when first in sequence fails', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'timeout', error: 'Too slow' })
  const jobDef = {
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action2',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'timeout',
    error: 'Too slow',
    responses: [
      {
        status: 'timeout',
        error: 'Too slow',
        origin: 'job:action2:step:setEntry',
      },
    ],
    origin: 'job:action2:step:setEntry',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(dispatch.callCount, 1) // Should break after first step
  assert.deepEqual(ret, expected)
})

test('should continue when action is queued', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'queued' })
  const jobDef = {
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action2',
    },
    meta: { ident: { id: 'johnf' } },
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(dispatch.callCount, 2)
  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(ret.error, undefined)
})

test('should not treat noaction as error', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'noaction', error: 'Nothing to set' })
  const jobDef = {
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action2',
    },
    meta: { ident: { id: 'johnf' } },
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(dispatch.callCount, 2) // Both actions should run
  assert.equal(ret.status, 'ok', ret.error)
})

test('should run two actions in parallel', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onCall(0)
    .resolves({ status: 'ok', data: { id: 'ent1', $type: 'entry' } })
    .onCall(1)
    .resolves({ status: 'ok', data: { id: 'date1', $type: 'date' } })
  const jobDef = {
    id: 'action3',
    flow: [
      [
        {
          id: 'getEntry',
          action: {
            type: 'GET',
            payload: {
              type: 'entry',
              id: 'ent1',
            },
          },
        },
        {
          id: 'getDate',
          action: {
            type: 'GET',
            payload: {
              type: 'date',
              id: 'updatedAt',
            },
          },
        },
      ],
      {
        id: 'setEntry',
        action: {
          type: 'SET',
          payload: {
            type: 'entry',
          },
        },
        premutation: {
          payload: {
            $modify: 'payload',
            data: '^^getEntry.response.data', // Verify that we can access the response from parallel steps
          },
        },
      },
      {
        id: 'setDate',
        action: {
          type: 'SET',
          payload: {
            type: 'date',
          },
        },
        premutation: {
          payload: {
            $modify: 'payload',
            data: '^^getDate.response.data', // Verify that we can access the response from parallel steps
          },
        },
      },
    ],
    postmutation: {
      response: '^^getEntry.response', // Verify that we can access the response from parallel steps here too
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action3',
    },
    meta: { ident: { id: 'johnf' }, id: '12345', cid: '23456' },
  }
  const expectedAction1 = {
    type: 'GET',
    payload: {
      type: 'entry',
      id: 'ent1',
    },
    meta: {
      ident: { id: 'johnf' },
      cid: '23456',
      jobId: 'action3',
      stepId: 'getEntry',
    },
  }
  const expectedAction2 = {
    type: 'GET',
    payload: {
      type: 'date',
      id: 'updatedAt',
    },
    meta: {
      ident: { id: 'johnf' },
      cid: '23456',
      jobId: 'action3',
      stepId: 'getDate',
    },
  }
  const expectedAction3 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: { id: 'ent1', $type: 'entry' },
    },
    meta: {
      ident: { id: 'johnf' },
      cid: '23456',
      jobId: 'action3',
      stepId: 'setEntry',
    },
  }
  const expectedAction4 = {
    type: 'SET',
    payload: {
      type: 'date',
      data: { id: 'date1', $type: 'date' },
    },
    meta: {
      ident: { id: 'johnf' },
      cid: '23456',
      jobId: 'action3',
      stepId: 'setDate',
    },
  }
  const expected = { status: 'ok', data: { id: 'ent1', $type: 'entry' } }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 4)
  assert.deepEqual(dispatch.args[0][0], expectedAction1)
  assert.deepEqual(dispatch.args[1][0], expectedAction2)
  assert.deepEqual(dispatch.args[2][0], expectedAction3)
  assert.deepEqual(dispatch.args[3][0], expectedAction4)
})

test('should run one action in "parallel"', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onCall(0)
    .resolves({ status: 'ok', data: { id: 'ent1', $type: 'entry' } })
  const jobDef = {
    id: 'action3',
    flow: [
      [
        {
          id: 'getEntry',
          action: {
            type: 'GET',
            payload: {
              type: 'entry',
              id: 'ent1',
            },
          },
        },
      ],
      {
        id: 'setEntry',
        action: {
          type: 'SET',
          payload: {
            type: 'entry',
          },
        },
        premutation: {
          payload: {
            $modify: 'payload',
            data: '^^getEntry.response.data', // Verify that we can access the response from parallel steps
          },
        },
      },
    ],
    postmutation: {
      response: '^^getEntry.response', // Verify that we can access the response from parallel steps here too
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action3',
    },
    meta: { ident: { id: 'johnf' }, id: '12345', cid: '23456' },
  }
  const expectedAction1 = {
    type: 'GET',
    payload: {
      type: 'entry',
      id: 'ent1',
    },
    meta: {
      ident: { id: 'johnf' },
      cid: '23456',
      jobId: 'action3',
      stepId: 'getEntry',
    },
  }
  const expectedAction2 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: { id: 'ent1', $type: 'entry' },
    },
    meta: {
      ident: { id: 'johnf' },
      cid: '23456',
      jobId: 'action3',
      stepId: 'setEntry',
    },
  }
  const expected = { status: 'ok', data: { id: 'ent1', $type: 'entry' } }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 2)
  assert.deepEqual(dispatch.args[0][0], expectedAction1)
  assert.deepEqual(dispatch.args[1][0], expectedAction2)
})

test('should run all actions in parallel even if one of them fails', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'timeout', error: 'Too slow' })
  const jobDef = {
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action3',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'timeout',
    error: 'Too slow',
    responses: [
      {
        status: 'timeout',
        error: 'Too slow',
        origin: 'job:action3:step:setEntry',
      },
    ],
    origin: 'job:action3:step:setEntry',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 2)
})

test('should not run next step after any parallel steps failed', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onCall(0)
    .resolves({ status: 'timeout', error: 'Too slow' })
  const jobDef = {
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action6',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'timeout',
    error: 'Too slow',
    responses: [
      {
        status: 'timeout',
        error: 'Too slow',
        origin: 'job:action6:step:getEntries',
      },
    ],
    origin: 'job:action6:step:getEntries',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(dispatch.callCount, 2) // Only the two parallel steps should run
  assert.deepEqual(ret, expected)
})

test('should return error from all parallel actions', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'timeout', error: 'Too slow' })
  const jobDef = {
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action3',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'timeout',
    error:
      "Steps failed:\n- 'setEntry': Too slow (timeout)\n- 'setDate': Too slow (timeout)",
    responses: [
      {
        status: 'timeout',
        error: 'Too slow',
        origin: 'job:action3:step:setEntry',
      },
      {
        status: 'timeout',
        error: 'Too slow',
        origin: 'job:action3:step:setDate',
      },
    ],

    origin: 'job:action3',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 2)
})

test('should return different errors from parallel actions', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'timeout', error: 'Too slow' })
    .onFirstCall()
    .resolves({ status: 'badrequest', error: 'What?' })
  const jobDef = {
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action3',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'error',
    error:
      "Steps failed:\n- 'setEntry': What? (badrequest)\n- 'setDate': Too slow (timeout)",
    responses: [
      {
        status: 'badrequest',
        error: 'What?',
        origin: 'job:action3:step:setEntry',
      },
      {
        status: 'timeout',
        error: 'Too slow',
        origin: 'job:action3:step:setDate',
      },
    ],

    origin: 'job:action3',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 2)
})

test('should not treat noaction as error in parallel actions', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'noaction', error: 'Nothing to set' })
  const jobDef = {
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action3',
    },
    meta: { ident: { id: 'johnf' } },
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 2)
})

test('should report progress when running steps', async () => {
  const setProgress = sinon.stub()
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const jobDef = {
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action2',
    },
    meta: {
      ident: { id: 'johnf' },
      id: '12345',
      cid: '23456',
    },
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(setProgress.callCount, 2)
  assert.equal(setProgress.args[0][0], 1 / 3)
  assert.equal(setProgress.args[1][0], 2 / 3)
})

test('should set gid on all actions dispatched by the job', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onCall(0)
    .resolves({ status: 'ok', data: { id: 'ent1', $type: 'entry' } })
  const jobDef = {
    id: 'action3',
    flow: [
      [
        {
          id: 'getEntry',
          action: {
            type: 'GET',
            payload: {
              type: 'entry',
              id: 'ent1',
            },
          },
        },
        {
          id: 'getDate',
          action: {
            type: 'GET',
            payload: {
              type: 'date',
              id: 'updatedAt',
            },
          },
        },
      ],
      {
        id: 'setEntry',
        action: {
          type: 'SET',
          payload: {
            type: 'entry',
          },
        },
        premutation: {
          payload: {
            $modify: 'payload',
            data: '^^getEntry.response.data', // Verify that we can access the response from parallel steps
          },
        },
      },
    ],
    postmutation: {
      response: '^^getEntry.response', // Verify that we can access the response from parallel steps here too
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action3',
    },
    meta: { ident: { id: 'johnf' }, id: '12345', cid: '23456' },
  }
  const gid = '34567'
  const expected = { status: 'ok', data: { id: 'ent1', $type: 'entry' } }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress, gid)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 3)
  assert.deepEqual(dispatch.args[0][0].meta.gid, gid)
  assert.deepEqual(dispatch.args[1][0].meta.gid, gid)
  assert.deepEqual(dispatch.args[2][0].meta.gid, gid)
})

test('should return noaction when job has an empty flow', async () => {
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const jobDef = {
    id: 'action1',
    flow: [],
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action1',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'noaction',
    warning: "Job 'action1' has no action or flow",
    origin: 'job:action1',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 0)
})

test('should return error when job has no action or flow', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] })
  const jobDef = {
    id: 'action0',
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action0',
    },
    meta: { ident: { id: 'johnf' }, id: '12345', project: 'test' },
  }
  const expected = {
    status: 'noaction',
    warning: "Job 'action0' has no action or flow",
    origin: 'job:action0',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 0)
})

// Tests -- conditions

test('should not run step where preconditions fail', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'ok', data: [] })
  const jobDef = {
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
        preconditions: [
          {
            condition: {
              $transform: 'compare',
              path: 'getEntries.response.status',
              match: 'ok',
            },
            failResponse: 'Response must be ok',
          },
          {
            condition: {
              $transform: 'compare',
              path: ['getEntries.response.data', { $transform: 'size' }],
              operator: '>',
              match: 1,
            },
            failResponse: {
              warning: 'No data to set',
              status: 'noaction',
            },
          },
        ],
        action: {
          type: 'SET',
          payload: { type: 'entry' },
        },
      },
    ],
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action6',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'noaction',
    warning: 'No data to set',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 1) // Only the first step should run
})

test('should not continue flow when failing step is marked with break', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'ok', data: [] })
  const jobDef = {
    id: 'action6',
    flow: [
      {
        id: 'getEntries',
        preconditions: [
          {
            condition: {
              $transform: 'compare',
              path: 'action.payload.id',
              operator: 'exists',
            },
            failResponse: {
              status: 'badrequest',
              error: 'Must be called with an id',
            },
            break: true,
          },
        ],
        action: {
          type: 'GET',
          payload: { type: 'entry' },
        },
      },
      {
        id: 'setEntries',
        preconditions: [
          {
            condition: {
              $transform: 'compare',
              path: 'action.payload.type',
              operator: 'exists',
            },
          },
        ],
        action: {
          type: 'SET',
          payload: { type: 'entry' },
        },
      },
    ],
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action6',
      type: 'entry',
      id: undefined,
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'badrequest',
    error: 'Must be called with an id',
    responses: [
      {
        status: 'badrequest',
        error: 'Must be called with an id',
        origin: 'job:action6:step:getEntries',
      },
    ],
    origin: 'job:action6:step:getEntries',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(dispatch.callCount, 0) // No steps should be run
  assert.deepEqual(ret, expected)
})

test('should continue flow when failing step is _not_ marked with break', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'ok', data: [] })
  const jobDef = {
    id: 'action6',
    flow: [
      {
        id: 'getEntries',
        preconditions: [
          {
            condition: {
              $transform: 'compare',
              path: 'action.payload.id',
              operator: 'exists',
            },
            failResponse: {
              status: 'badrequest',
              error: 'Must be called with an id',
            },
            // break: false, -- the default
          },
        ],
        action: {
          type: 'GET',
          payload: { type: 'entry' },
        },
      },
      {
        id: 'setEntries',
        preconditions: [
          {
            condition: {
              $transform: 'compare',
              path: 'action.payload.type',
              operator: 'exists',
            },
          },
        ],
        action: {
          type: 'SET',
          payload: { type: 'entry' },
        },
      },
    ],
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action6',
      type: 'entry',
      id: undefined,
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'ok',
    data: [],
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(dispatch.callCount, 1) // Next step should run
  assert.deepEqual(ret, expected)
})

test('should run second action when its preconditions are fulfilled', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] })
  const jobDef = {
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
        preconditions: [
          {
            condition: {
              $transform: 'compare',
              path: ['getEntries.response.data', { $transform: 'size' }],
              operator: '>',
              match: 0,
            },
          },
        ],
        action: {
          type: 'SET',
          payload: { type: 'entry' },
        },
      },
    ],
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action6',
    },
    meta: { ident: { id: 'johnf' } },
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(dispatch.callCount, 2) // Both steps run
  assert.equal(ret.status, 'ok', ret.error)
})

test('should return warnings from parallel steps', async () => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    warning: 'Should not get here',
  })
  const jobDef = {
    id: 'action3',
    flow: [
      [
        {
          id: 'setEntry',
          preconditions: [
            {
              condition: 'action.payload.doSetEntry',
              failResponse: 'Do not set entry',
            },
          ],
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
          preconditions: [
            {
              condition: 'action.payload.doSetDate',
              failResponse: 'Do not set date',
            },
          ],
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action3',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'ok',
    warning:
      "Message from steps:\n- 'setEntry': Do not set entry (noaction)\n- 'setDate': Do not set date (noaction)",
    responses: [
      {
        status: 'noaction',
        warning: 'Do not set entry',
        origin: 'job:action3:step:setEntry',
      },
      {
        status: 'noaction',
        warning: 'Do not set date',
        origin: 'job:action3:step:setDate',
      },
    ],
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 0)
})

test('should support truthy condition results', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] })
  const jobDef = {
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
        preconditions: [
          {
            condition: ['getEntries.response.data', { $transform: 'size' }], // This works, as anything but 0 is a truthy value
          },
        ],
        action: {
          type: 'SET',
          payload: { type: 'entry' },
        },
      },
    ],
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action6',
    },
    meta: { ident: { id: 'johnf' } },
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(dispatch.callCount, 2) // Both steps run
  assert.equal(ret.status, 'ok', ret.error)
})

test('should validate preconditions in parallel actions', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'ok', data: [] })
  const jobDef = {
    id: 'action3',
    flow: [
      [
        {
          id: 'setEntry',
          preconditions: [
            {
              condition: {
                $transform: 'compare',
                path: 'action.payload.id',
                operator: 'exists',
              },
              failResponse: { status: 'error', error: 'Needs an id' },
            },
          ],
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action3',
      id: undefined,
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'error',
    error: 'Needs an id',
    responses: [
      {
        status: 'error',
        error: 'Needs an id',
        origin: 'job:action3:step:setEntry',
      },
    ],
    origin: 'job:action3:step:setEntry',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(dispatch.callCount, 1) // Only the first step should run
  assert.deepEqual(ret, expected)
})

test('should return error from preconditions in parallel actions even though others give noaction', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'ok', data: [] })
  const jobDef = {
    id: 'action3',
    flow: [
      [
        {
          id: 'setEntry',
          preconditions: [
            {
              condition: {
                $transform: 'compare',
                path: 'action.payload.id',
                operator: 'exists',
              },
              failResponse: { status: 'error', error: 'Needs an id' },
            },
          ],
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
          preconditions: [
            {
              condition: {
                $transform: 'compare',
                path: 'action.payload.id',
                operator: 'exists',
              },
            },
          ],
          action: {
            type: 'SET',
            payload: { type: 'date', id: 'updatedAt' },
          },
        },
      ],
    ],
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action3',
      id: undefined,
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'error',
    error: 'Needs an id',
    responses: [
      {
        status: 'error',
        error: 'Needs an id',
        origin: 'job:action3:step:setEntry',
      },
      {
        status: 'noaction',
        warning: 'Did not satisfy condition',
        origin: 'job:action3:step:setDate',
      },
    ],
    origin: 'job:action3:step:setEntry',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(dispatch.callCount, 0) // None should run
  assert.deepEqual(ret, expected)
})

test('should return several errors from preconditions in parallel actions', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'ok', data: [] })
  const jobDef = {
    id: 'action3',
    flow: [
      [
        {
          id: 'setEntry',
          preconditions: [
            {
              condition: {
                $transform: 'compare',
                path: 'action.payload.id',
                operator: 'exists',
              },
              failResponse: { status: 'error', error: 'No id' },
            },
          ],
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
          preconditions: [
            {
              condition: {
                $transform: 'compare',
                path: 'action.payload.type',
                operator: 'exists',
              },
              failResponse: { status: 'error', error: 'No type' },
            },
          ],
          action: {
            type: 'SET',
            payload: { type: 'date', id: 'updatedAt' },
          },
        },
      ],
    ],
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action3',
      id: undefined,
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'error',
    error:
      "Steps failed:\n- 'setEntry': No id (error)\n- 'setDate': No type (error)",
    responses: [
      {
        status: 'error',
        error: 'No id',
        origin: 'job:action3:step:setEntry',
      },
      {
        status: 'error',
        error: 'No type',
        origin: 'job:action3:step:setDate',
      },
    ],
    origin: 'job:action3',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(dispatch.callCount, 0) // None should run
  assert.deepEqual(ret, expected)
})

test('should not run job with action when preconditions does not hold', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] })
  const jobDef = {
    id: 'action1',
    preconditions: [{ condition: 'payload.type' }],
    action: {
      type: 'GET',
      payload: { type: 'entry', id: 'ent1' },
      meta: { queue: true },
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action1',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'noaction',
    warning: 'Did not satisfy condition',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 0)
})

test('should not run job with flow when preconditions does not hold', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'ok', data: [] })
  const jobDef = {
    id: 'action3',
    preconditions: [{ condition: 'payload.type' }],
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action3',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'noaction',
    warning: 'Did not satisfy condition',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(dispatch.callCount, 0) // None should run
  assert.deepEqual(ret, expected)
})

test('should treat a step as failed when postconditions fail', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'ok', data: [] })
  const jobDef = {
    id: 'action6',
    flow: [
      {
        id: 'getEntries',
        action: {
          type: 'GET',
          payload: { type: 'entry' },
        },
        postconditions: [
          {
            condition: ['response.data', { $transform: 'size' }],
            failResponse: 'Must return data',
          },
        ],
      },
      {
        id: 'setEntries',
        action: {
          type: 'SET',
          payload: { type: 'entry' },
        },
      },
    ],
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action6',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'error',
    error: 'Must return data',
    responses: [
      {
        error: 'Must return data',
        origin: 'job:action6:step:getEntries',
        status: 'error',
      },
    ],
    origin: 'job:action6:step:getEntries',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 1) // Only the first step should run
})

test('should continue flow when postconditions pass', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] })
  const jobDef = {
    id: 'action6',
    flow: [
      {
        id: 'getEntries',
        action: {
          type: 'GET',
          payload: { type: 'entry' },
        },
        postconditions: [
          {
            condition: ['response.data', { $transform: 'size' }],
            failResponse: 'Must return data',
          },
        ],
      },
      {
        id: 'setEntries',
        action: {
          type: 'SET',
          payload: { type: 'entry' },
        },
      },
    ],
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action6',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'ok',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 2)
})

test('should always respond with ok status when postconditions passes', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'notfound', error: 'The value was not in the cache' })
  const jobDef = {
    id: 'action6',
    flow: [
      {
        id: 'getEntries',
        action: {
          type: 'GET',
          payload: { type: 'entry' },
        },
        postconditions: [
          {
            condition: {
              $transform: 'compare',
              path: 'response.status',
              match: 'notfound',
            },
            failResponse: 'Value is already in cache',
          },
        ],
      },
      {
        id: 'setEntries',
        action: {
          type: 'SET',
          payload: { type: 'entry' },
        },
      },
    ],
    postmutation: {
      response: '^^.getEntries.response', // To see what this step responded with
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action6',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'ok',
    warning: 'The value was not in the cache',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 2)
})

test('should run postconditions on action job', async () => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: null })
  const jobDef = {
    id: 'action10',
    action: {
      type: 'GET',
      payload: { type: 'entry' },
    },
    postconditions: [
      {
        condition: 'response.data',
        failResponse: { status: 'notfound', error: 'Not found' },
      },
    ],
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action10',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'notfound',
    error: 'Not found',
    origin: 'job:action10:step:action10',
    responses: [
      {
        error: 'Not found',
        origin: 'job:action10:step:action10',
        status: 'notfound',
      },
    ],
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 1)
})

test('should run postmutation before postconditions on action job', async () => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: null })
  const jobDef = {
    id: 'action10',
    action: {
      type: 'GET',
      payload: { type: 'entry' },
    },
    postmutation: {
      response: {
        $modify: 'response',
        data: { id: { $value: 'ent1' } }, // Just to check that we run this first
      },
    },
    postconditions: [
      {
        condition: 'response.data',
        failResponse: { status: 'notfound', error: 'Not found' },
      },
    ],
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action10',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'ok',
    data: { id: 'ent1' },
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 1)
})

test('should make original action available to postmutation on action job', async () => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: null })
  const jobDef = {
    id: 'action10',
    action: {
      type: 'GET',
      payload: { type: 'entry' },
    },
    postmutation: {
      response: {
        $modify: 'response',
        data: { id: { $value: 'ent1' }, title: '^^.action.payload.title' }, // Just to check that we run this first
      },
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action10',
      title: 'Entry 1',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'ok',
    data: { id: 'ent1', title: 'Entry 1' },
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 1)
})

test('should support json schema validation in conditions', async () => {
  // Note: We'll remove this in the future
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'ok', data: [] })
  const jobDef = {
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action6',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'noaction',
    warning: 'No data to set',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(dispatch.callCount, 1) // Only the first step should run
  assert.deepEqual(ret, expected)
})

// Tests -- conditions with `failOnErrorInPostconditions`

test('should not override fail-on-error behavior of previous step when failOnErrorInPostconditions is true', async () => {
  const failOnErrorInPostconditions = true
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'timeout', error: 'Too slow' })
  const jobDef = {
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
        preconditions: [
          {
            condition: {
              $transform: 'compare',
              path: 'action.type',
              match: 'RUN',
            },
            failResponse: {
              status: 'badrequest',
              error: 'Must only be called from a RUN action',
            },
          },
        ],
        action: {
          type: 'SET',
          payload: {
            type: 'date',
            id: 'updatedAt',
          },
        },
      },
    ],
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action2',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'timeout',
    error: 'Too slow',
    responses: [
      {
        status: 'timeout',
        error: 'Too slow',
        origin: 'job:action2:step:setEntry',
      },
    ],
    origin: 'job:action2:step:setEntry',
  }

  const job = new Job(
    jobDef,
    mapTransform,
    mapOptions,
    failOnErrorInPostconditions,
  )
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 1) // Should break after first step
})

test('should override fail-on-error behavior in postconditions when failOnErrorInPostconditions is true', async () => {
  const failOnErrorInPostconditions = true
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'timeout', error: 'Too slow' })
  const jobDef = {
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
        postconditions: [
          {
            condition: {
              $transform: 'compare',
              path: 'response.status',
              match: 'timeout', // Will only succeed on timeout :S
            },
            failResponse: 'This is not a timeout',
          },
        ],
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action2',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'ok',
  }

  const job = new Job(
    jobDef,
    mapTransform,
    mapOptions,
    failOnErrorInPostconditions,
  )
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 2) // Should run both steps
})

test('should override fail-on-error behavior in postconditions when failOnErrorInPostconditions is true and break on ok', async () => {
  const failOnErrorInPostconditions = true
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const jobDef = {
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
        postconditions: [
          {
            condition: {
              $transform: 'compare',
              path: 'response.status',
              match: 'timeout', // Will only succeed on timeout :S
            },
            failResponse: 'This is not a timeout',
          },
        ],
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action2',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'error',
    error: 'This is not a timeout',
    origin: 'job:action2:step:setEntry',
    responses: [
      {
        error: 'This is not a timeout',
        origin: 'job:action2:step:setEntry',
        status: 'error',
      },
    ],
  }

  const job = new Job(
    jobDef,
    mapTransform,
    mapOptions,
    failOnErrorInPostconditions,
  )
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 1) // Should run both steps
})

test('should not break by default for preconditions', async () => {
  const failOnErrorInPostconditions = true
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'ok', data: [] })
  const jobDef = {
    id: 'action6',
    flow: [
      {
        id: 'getEntries',
        preconditions: [
          {
            condition: {
              $transform: 'compare',
              path: 'action.payload.id',
              operator: 'exists',
            },
            failResponse: {
              status: 'badrequest',
              error: 'Must be called with an id',
            },
            // No break specified,
          },
        ],
        action: {
          type: 'GET',
          payload: { type: 'entry' },
        },
      },
      {
        id: 'setEntries',
        preconditions: [
          {
            condition: {
              $transform: 'compare',
              path: 'action.payload.type',
              operator: 'exists',
            },
          },
        ],
        action: {
          type: 'SET',
          payload: { type: 'entry' },
        },
      },
    ],
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action6',
      type: 'entry',
      id: undefined,
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'ok',
    data: [],
  }

  const job = new Job(
    jobDef,
    mapTransform,
    mapOptions,
    failOnErrorInPostconditions,
  )
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(dispatch.callCount, 1) // Step number two was still run
  assert.deepEqual(ret, expected)
})

test('should not break on fail when break is false', async () => {
  const failOnErrorInPostconditions = true
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'ok', data: [] })
  const jobDef = {
    id: 'action6',
    flow: [
      {
        id: 'getEntries',
        preconditions: [
          {
            condition: {
              $transform: 'compare',
              path: 'action.payload.id',
              operator: 'exists',
            },
            failResponse: {
              status: 'badrequest',
              error: 'Must be called with an id',
            },
            break: false,
          },
        ],
        action: {
          type: 'GET',
          payload: { type: 'entry' },
        },
      },
      {
        id: 'setEntries',
        preconditions: [
          {
            condition: {
              $transform: 'compare',
              path: 'action.payload.type',
              operator: 'exists',
            },
          },
        ],
        action: {
          type: 'SET',
          payload: { type: 'entry' },
        },
      },
    ],
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action6',
      type: 'entry',
      id: undefined,
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'ok',
    data: [],
  }

  const job = new Job(
    jobDef,
    mapTransform,
    mapOptions,
    failOnErrorInPostconditions,
  )
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(dispatch.callCount, 1) // Only the second steps should be run
  assert.deepEqual(ret, expected)
})

// Tests -- mutations

test('should return data from simple action based on response postmutation', async () => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    data: [{ id: 'ent1', $type: 'entry' }],
    params: { keep: true },
  })
  const jobDef = {
    id: 'action1',
    action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
    postmutation: {
      response: {
        $modify: 'response',
        data: 'response.data[0]',
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
  const expected = {
    status: 'ok',
    data: { id: 'ent1', $type: 'entry' },
    params: { keep: true },
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 1)
})

test('should not use "magic" for postmutation', async () => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    data: [{ id: 'ent1', $type: 'entry' }],
    params: { keep: true },
  })
  const jobDef = {
    id: 'action1',
    action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
    postmutation: {
      'response.data': 'response.data[0]',
    },
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action1',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'ok',
    data: { id: 'ent1', $type: 'entry' },
    // With "magic", we would have gotten `params: { keep: true }` here
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 1)
})

test('should return data from simple action based on responseMutation', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] })
  const jobDef = {
    id: 'action1',
    action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
    responseMutation: {
      'response.data': 'response.data[0]',
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

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(ret.status, 'ok', ret.error)
  assert.deepEqual(ret.data, expected)
  assert.equal(dispatch.callCount, 1)
})

test('should return data from flow based on mutation', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onCall(0)
    .resolves({ status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] })
    .onCall(1)
    .resolves({ status: 'ok', data: [{ id: 'johnf', $type: 'user' }] })
  const jobDef = {
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action6',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 3)
})

test('should return data based on mutation from original action', async () => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const jobDef = {
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

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(ret.status, 'ok', ret.error)
  assert.deepEqual(ret.data, expected)
})

test('should return response with root in responseMutation', async () => {
  const dispatch = sinon
    .stub()
    .onCall(0)
    .resolves({
      status: 'ok',
      data: [{ id: 'ent1', $type: 'entry' }],
    })
    .onCall(1)
    .resolves({
      status: 'ok',
      data: {
        id: 'date1',
        $type: 'date',
        date: new Date('2022-09-14T00:43:44Z'),
      },
      params: { queue: true },
    })
  const jobDef = {
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

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
})

test('should run responseMutation pipeline on response from step', async () => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const jobDef = {
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
            'response.error': { $value: 'Error from step' },
          },
        ],
      },
      {
        id: 'setDate',
        action: { type: 'SET', payload: { type: 'date', id: 'updatedAt' } },
      },
    ],
  }
  const action = {
    type: 'RUN',
    payload: { jobId: 'action8' },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'error',
    error: 'Error from step',
    responses: [
      {
        status: 'error',
        error: 'Error from step',
        origin: 'job:action8:step:getEntries',
      },
    ],
    origin: 'job:action8:step:getEntries',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
})

test('should report error status from mutation without an error message as "unnown error"', async () => {
  const dispatch = sinon.stub().resolves({ status: 'ok', data: [] })
  const jobDef = {
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
  }
  const action = {
    type: 'RUN',
    payload: { jobId: 'action8' },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'error',
    error: 'Unknown error',
    responses: [
      {
        status: 'error',
        origin: 'job:action8:step:getEntries',
      },
    ],
    origin: 'job:action8:step:getEntries',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
})

test('should have the original action available on each step in a flow', async () => {
  const dispatch = sinon.stub().onCall(0).resolves({ status: 'ok', data: [] })
  const jobDef = {
    id: 'action9',
    flow: [
      {
        id: 'getEntries',
        action: { type: 'GET', payload: { type: 'entry' } },
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
        mutation: {
          'payload.date': '^^action.payload.nextDate', // Verify that we have access to the original action here
        },
        responseMutation: {
          'response.data': {
            date: '^^action.payload.nextDate', // Verify that we have access to the original action here
          },
        },
      },
    ],
    responseMutation: {
      'response.data': '^^setDate.response.data',
      'response.date': '^^action.payload.nextDate', // Verify that we have access to the original action here
    },
  }
  const date = new Date()
  const action = {
    type: 'RUN',
    payload: { jobId: 'action9', nextDate: date },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'ok',
    data: { date },
    date,
  }
  const expectedAction = {
    type: 'SET',
    payload: {
      type: 'date',
      id: 'updatedAt',
      date,
    },
    meta: { ident: { id: 'johnf' }, jobId: 'action9', stepId: 'setDate' },
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 2)
  assert.deepEqual(dispatch.args[1][0], expectedAction)
})

test('should return mutated response with error message', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: { errorMessage: 'No data' } })
  const jobDef = {
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action7',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'error',
    error: 'No data',
    data: { errorMessage: 'No data' },
    origin: 'job:action7',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
})

// TODO: Verify if this is already done in `dispatch()`
test('should join array of error messsages', async () => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    data: { errorMessages: ['No data', 'And no fun either'] },
  })
  const jobDef = {
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action7',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'error',
    error: 'No data | And no fun either',
    data: { errorMessages: ['No data', 'And no fun either'] },
    origin: 'job:action7',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
})

test('should mutate simple action', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] })
  const jobDef = {
    id: 'action1',
    action: {
      type: 'GET',
      payload: { type: 'entry', id: 'ent1' },
      meta: { queue: true },
    },
    premutation: { payload: { $modify: 'payload', flag: { $value: true } } },
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
    meta: { ident: { id: 'johnf' }, jobId: 'action1', queue: true },
  }
  const expected = { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 1)
  assert.deepEqual(dispatch.args[0][0], expectedAction)
  assert.deepEqual(ret, expected)
})

test('should mutate simple action with depricated mutation prop', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] })
  const jobDef = {
    id: 'action1',
    action: {
      type: 'GET',
      payload: { type: 'entry', id: 'ent1' },
      meta: { queue: true },
    },
    mutation: { 'payload.flag': { $value: true } },
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
    meta: { ident: { id: 'johnf' }, jobId: 'action1', queue: true },
  }
  const expected = { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 1)
  assert.deepEqual(dispatch.args[0][0], expectedAction)
  assert.deepEqual(ret, expected)
})

test('should mutate action with result from previous action', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({
      status: 'ok',
      data: [
        { id: 'ent1', $type: 'entry', section: 'news' },
        { id: 'ent2', $type: 'entry', section: 'sports' },
      ],
    })
  const jobDef = {
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
    meta: { ident: { id: 'johnf' }, jobId: 'action3', stepId: 'setEntries' },
  }
  const expected = { status: 'ok' } // Won't return data unless specified

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 2)
  assert.deepEqual(dispatch.args[1][0], expectedAction2)
  assert.deepEqual(ret, expected)
})

test('should mutate action with payload from original action', async () => {
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const jobDef = {
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
              $transform: 'uri',
              template: 'section-{.}',
              $iterate: true,
            },
          ],
        },
      },
    ],
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
    meta: { ident: { id: 'johnf' }, jobId: 'action3', stepId: 'setEntries' },
  }
  const expected = { status: 'ok' } // Won't return data unless specified

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 1)
  assert.deepEqual(dispatch.args[0][0], expectedAction)
  assert.deepEqual(ret, expected)
})

test('should mutate action with result from previous and parallel actions', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({
      status: 'ok',
      data: {
        id: 'date1',
        $type: 'date',
        date: new Date('2022-06-14T18:43:11Z'),
      },
    })
    .onCall(1)
    .resolves({ status: 'ok', data: { id: 'johnf', name: 'John F.' } })
    .onCall(2)
    .resolves({
      status: 'ok',
      data: [
        { id: 'ent1', $type: 'entry', section: 'news' },
        { id: 'ent2', $type: 'entry', section: 'sports' },
      ],
    })
  const jobDef = {
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
    meta: { ident: { id: 'johnf' }, jobId: 'action3', stepId: 'getEntries' },
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
    meta: { ident: { id: 'johnf' }, jobId: 'action3', stepId: 'setEntries' },
  }
  const expected = { status: 'ok' } // Won't return data unless specified

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 4)
  assert.deepEqual(dispatch.args[2][0], expectedAction2)
  assert.deepEqual(dispatch.args[3][0], expectedAction4)
  assert.deepEqual(ret, expected)
})

test('should mutate action with data from the original action', async () => {
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const jobDef = {
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
    meta: { ident: { id: 'johnf' }, jobId: 'action5', stepId: 'setData' },
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 1)
  assert.deepEqual(dispatch.args[0][0], expectedAction)
})

test('should mutate with transformers and pipelines', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] })
  const nowDate = new Date()
  const mapOptions = {
    transformers: {
      now: () => () => () => nowDate,
    },
    pipelines: {
      userInfo: [{ $value: { id: 'johnf', name: 'John F.' } }],
    },
  }
  const jobDef = {
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
    meta: { ident: { id: 'johnf' }, jobId: 'action1', stepId: 'getEntry' },
  }
  const expected = { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 1)
  assert.deepEqual(dispatch.args[0][0], expectedAction)
  assert.deepEqual(ret, expected)
})

test('should mutate simple action with pipeline', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] })
  const jobDef = {
    id: 'action1',
    action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
    mutation: [
      { payload: 'payload', 'payload.flag': { $value: true } }, // `$modify: true` is added
    ],
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
    meta: { ident: { id: 'johnf' }, jobId: 'action1' },
  }
  const expected = { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(ret.status, 'ok', ret.error)
  assert.equal(dispatch.callCount, 1)
  assert.deepEqual(dispatch.args[0][0], expectedAction)
  assert.deepEqual(ret, expected)
})

test('should handle several root paths in one pipeline', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'ok', data: { id: 'johnf', name: 'John F.' } })
    .onCall(1)
    .resolves({
      status: 'ok',
      data: [
        { id: 'ent1', $type: 'entry', section: 'news' },
        { id: 'ent2', $type: 'entry', section: 'sports' },
      ],
    })
  const jobDef = {
    id: 'action3',
    flow: [
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
        responseMutation: {
          'response.data': [
            '^^getEntries.response.data',
            {
              entries: '.',
              user: '^^getUser.response.data',
            },
          ],
        },
      },
    ],
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action3',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'ok',
    data: {
      entries: [
        { id: 'ent1', $type: 'entry', section: 'news' },
        { id: 'ent2', $type: 'entry', section: 'sports' },
      ],
      user: { id: 'johnf', name: 'John F.' },
    },
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
})

test('should return response with error from data', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: { errorMessage: 'No data' } })
  const jobDef = {
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
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action7',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'error',
    error: 'No data',
    origin: 'job:action7',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
})

test('should make action response available to mutations as response on the initial action', async () => {
  const dispatch = sinon.stub().resolves({ status: 'error', error: 'No data' })
  const jobDef = {
    id: 'action7',
    action: {
      type: 'SET',
      payload: { type: 'date', id: 'updatedAt' },
    },
    responseMutation: [{ 'response.error': '^^action.response.error' }],
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action7',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'error',
    error: 'No data',
    origin: 'job:action7:step:action7',
    responses: [
      {
        error: 'No data',
        origin: 'job:action7:step:action7',
        status: 'error',
      },
    ],
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
})

test('should make flow response available to mutations as response on the initial action', async () => {
  const dispatch = sinon.stub().resolves({ status: 'error', error: 'No data' })
  const jobDef = {
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
    responseMutation: [{ 'response.error': '^^action.response.error' }],
  }
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action7',
      data: [{ id: 'ent1', $type: 'entry' }],
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'error',
    error: 'No data',
    origin: 'job:action7',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
})

// Tests -- iterate

test('should mutate action on a job into several actions based on iterate pipeline', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onCall(1)
    .resolves({ status: 'ok', data: [{ id: 'ent3', title: 'Entry 3' }] })
  const jobDef = {
    id: 'action14',
    action: { type: 'SET', payload: { type: 'entry' } },
    iterate: [
      'action.payload.data.items[]',
      { $filter: 'compare', path: 'include', match: true },
    ],
    mutation: { 'payload.key': 'payload.data.id' },
    responseMutation: {
      response: {
        $modify: 'response',
        data: '^^action14_1.response.data', // To verify that the actions get postfixed with index
      },
    },
  }
  const data = {
    items: [
      { id: 'ent1', include: true },
      { id: 'ent2', include: false },
      { id: 'ent3', include: true },
    ],
  }
  const action = {
    type: 'RUN',
    payload: { jobId: 'action14', data },
    meta: { ident: { id: 'johnf' } },
  }
  const gid = '34567'
  const expectedAction0 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: { id: 'ent1', include: true },
      key: 'ent1',
    },
    meta: {
      ident: { id: 'johnf' },
      jobId: 'action14',
      stepId: 'action14_0',
      gid,
    },
  }
  const expectedAction1 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: { id: 'ent3', include: true },
      key: 'ent3',
    },
    meta: {
      ident: { id: 'johnf' },
      jobId: 'action14',
      stepId: 'action14_1',
      gid,
    },
  }
  const expected = { status: 'ok', data: [{ id: 'ent3', title: 'Entry 3' }] }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress, gid)

  assert.equal(dispatch.callCount, 2)
  assert.deepEqual(dispatch.args[0][0], expectedAction0)
  assert.deepEqual(dispatch.args[1][0], expectedAction1)
  assert.deepEqual(ret, expected)
})

test('should mutate action in a step into several actions based on iterate pipeline', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onCall(1)
    .resolves({ status: 'ok', data: [{ id: 'ent3', title: 'Entry 3' }] })
  const jobDef = {
    id: 'action11',
    flow: [
      {
        id: 'setItem',
        action: { type: 'SET', payload: { type: 'entry' } },
        iterate: [
          'action.payload.data.items[]',
          { $filter: 'compare', path: 'include', match: true },
        ],
        mutation: { 'payload.key': 'payload.data.id' },
      },
    ],
    responseMutation: {
      response: {
        $modify: 'response',
        data: '^^setItem_1.response.data', // To verify that the actions get postfixed with index
      },
    },
  }
  const data = {
    items: [
      { id: 'ent1', include: true },
      { id: 'ent2', include: false },
      { id: 'ent3', include: true },
    ],
  }
  const action = {
    type: 'RUN',
    payload: { jobId: 'action11', data },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction0 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: { id: 'ent1', include: true },
      key: 'ent1',
    },
    meta: { ident: { id: 'johnf' }, jobId: 'action11', stepId: 'setItem_0' },
  }
  const expectedAction1 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: { id: 'ent3', include: true },
      key: 'ent3',
    },
    meta: { ident: { id: 'johnf' }, jobId: 'action11', stepId: 'setItem_1' },
  }
  const expected = { status: 'ok', data: [{ id: 'ent3', title: 'Entry 3' }] }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(dispatch.callCount, 2)
  assert.deepEqual(dispatch.args[0][0], expectedAction0)
  assert.deepEqual(dispatch.args[1][0], expectedAction1)
  assert.deepEqual(ret, expected)
})

test('should mutate top level action into several actions based on iterate path', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onCall(2)
    .resolves({ status: 'ok', data: [{ id: 'ent3', title: 'Entry 3' }] })
  const jobDef = {
    id: 'action13',
    action: { type: 'SET', payload: { type: 'entry' } },
    iteratePath: 'action.payload.data.items',
    mutation: { 'payload.key': 'payload.data.id' },
  }
  const data = { items: [{ id: 'ent1' }, { id: 'ent2' }, { id: 'ent3' }] }
  const action = {
    type: 'RUN',
    payload: { jobId: 'action13', data },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction0 = {
    type: 'SET',
    payload: { type: 'entry', data: { id: 'ent1' }, key: 'ent1' },
    meta: { ident: { id: 'johnf' }, jobId: 'action13', stepId: 'action13_0' },
  }
  const expectedAction1 = {
    type: 'SET',
    payload: { type: 'entry', data: { id: 'ent2' }, key: 'ent2' },
    meta: { ident: { id: 'johnf' }, jobId: 'action13', stepId: 'action13_1' },
  }
  const expectedAction2 = {
    type: 'SET',
    payload: { type: 'entry', data: { id: 'ent3' }, key: 'ent3' },
    meta: { ident: { id: 'johnf' }, jobId: 'action13', stepId: 'action13_2' },
  }
  const expected = { status: 'ok', data: [{ id: 'ent3', title: 'Entry 3' }] }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(dispatch.callCount, 3)
  assert.deepEqual(dispatch.args[0][0], expectedAction0)
  assert.deepEqual(dispatch.args[1][0], expectedAction1)
  assert.deepEqual(dispatch.args[2][0], expectedAction2)
  assert.deepEqual(ret, expected)
})

test('should combine response data from several actions based on iterate path', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: ['ent1', 'ent2', 'ent3'] })
    .onCall(1)
    .resolves({ status: 'ok', data: { id: 'ent1' } })
    .onCall(2)
    .resolves({ status: 'ok', data: { id: 'ent2' } })
    .onCall(3)
    .resolves({ status: 'ok', data: { id: 'ent3' } })
  const jobDef = {
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
  }
  const action = {
    type: 'RUN',
    payload: { jobId: 'action12', ids: ['ent1', 'ent2', 'ent3'] },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction0 = {
    type: 'GET',
    payload: { type: 'entry' },
    meta: { ident: { id: 'johnf' }, jobId: 'action12', stepId: 'getIds' },
  }
  const expectedAction1 = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' },
    meta: { ident: { id: 'johnf' }, jobId: 'action12', stepId: 'getItems_0' },
  }
  const expectedAction2 = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent2' },
    meta: { ident: { id: 'johnf' }, jobId: 'action12', stepId: 'getItems_1' },
  }
  const expectedAction3 = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent3' },
    meta: { ident: { id: 'johnf' }, jobId: 'action12', stepId: 'getItems_2' },
  }
  const expected = {
    status: 'ok',
    data: [{ id: 'ent1' }, { id: 'ent2' }, { id: 'ent3' }],
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.deepEqual(ret, expected)
  assert.equal(dispatch.callCount, 4)
  assert.deepEqual(dispatch.args[0][0], expectedAction0)
  assert.deepEqual(dispatch.args[1][0], expectedAction1)
  assert.deepEqual(dispatch.args[2][0], expectedAction2)
  assert.deepEqual(dispatch.args[3][0], expectedAction3)
})

test('should mutate action into several actions based on iterate path in parallel steps', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onCall(2)
    .resolves({ status: 'ok', data: [{ id: 'ent3', title: 'Entry 3' }] })
  const jobDef = {
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
    meta: { ident: { id: 'johnf' }, jobId: 'action11', stepId: 'setItem_0' },
  }
  const expected = { status: 'ok', data: [{ id: 'ent3', title: 'Entry 3' }] }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(dispatch.callCount, 3)
  assert.deepEqual(dispatch.args[0][0], expectedAction0)
  assert.deepEqual(dispatch.args[1][0].payload.data.id, 'ent2')
  assert.deepEqual(dispatch.args[2][0].payload.data.id, 'ent3')
  assert.deepEqual(ret, expected)
})

test('should run all steps even if an iteration step fails', async () => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onCall(0)
    .resolves({ status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] })
    .onCall(1)
    .resolves({ status: 'badrequest', error: 'Too cool' })
  const jobDef = {
    id: 'action11',
    flow: [
      {
        id: 'setItem',
        action: { type: 'SET', payload: { type: 'entry' } },
        iterate: 'action.payload.data.items',
        mutation: { 'payload.key': 'payload.data.id' },
      },
    ],
  }
  const data = { items: [{ id: 'ent1' }, { id: 'ent2' }, { id: 'ent3' }] }
  const action = {
    type: 'RUN',
    payload: { jobId: 'action11', data },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'badrequest',
    error: 'Too cool',
    data: [{ id: 'ent1', $type: 'entry' }, undefined],
    responses: [
      {
        status: 'badrequest',
        error: 'Too cool',
        origin: 'job:action11:step:setItem_1',
      },
    ],
    origin: 'job:action11:step:setItem_1',
  }

  const job = new Job(jobDef, mapTransform, mapOptions)
  const ret = await job.run(action, dispatch, setProgress)

  assert.equal(dispatch.callCount, 3)
  assert.deepEqual(ret, expected)
})
