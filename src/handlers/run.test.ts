import test from 'ava'
import sinon from 'sinon'
import mapTransform from 'map-transform'
import integreatTransformers from 'integreat-transformers'
import handlerResources from '../tests/helpers/handlerResources.js'
import Job from '../jobs/Job.js'
import type { JobDef } from '../jobs/types.js'

import run from './run.js'

// Setup

const defaultResources = {
  getService: () => undefined,
  setProgress: () => undefined,
  options: {},
}

const mapOptions = {
  transformers: { size: integreatTransformers.size },
}

const createJobsMap = (jobDef: JobDef, mo = mapOptions) => {
  const jobs = new Map()
  jobs.set(jobDef.id, new Job(jobDef, mapTransform, mo))
  return jobs
}

// Tests

test('should run a simple action', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    data: [{ id: 'ent1', $type: 'entry' }],
  })
  const jobs = createJobsMap({
    id: 'action1',
    action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
  })
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
    },
  }
  const expectedAction = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' },
    meta: {
      ident: { id: 'johnf' },
      project: 'test',
      cid: '23456',
      gid: '12345', // The id of the `RUN` action should be used as `gid` for all following actions
      jobId: 'action1',
    },
  }
  const expected = {
    status: 'ok',
    data: [{ id: 'ent1', $type: 'entry' }],
  }

  const ret = await run(jobs)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.deepEqual(ret, expected)
})

test('should override gid from original action', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    data: [{ id: 'ent1', $type: 'entry' }],
  })
  const jobs = createJobsMap({
    id: 'action1',
    action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
  })
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action1',
    },
    meta: {
      ident: { id: 'johnf' },
      id: '12345',
      cid: '23456',
      gid: '12340', // Override this
      project: 'test',
    },
  }

  const ret = await run(jobs)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0].meta.gid, '12345')
})

test('should run flow', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const jobs = createJobsMap({
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
  })
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action2',
    },
    meta: { ident: { id: 'johnf' }, id: '12345', cid: '23456' },
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
      gid: '12345',
      jobId: 'action2',
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
      gid: '12345',
      jobId: 'action2',
    },
  }
  const expected = { status: 'ok' } // Won't return data unless specified

  const ret = await run(jobs)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(ret.status, 'ok', ret.error)
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expectedAction1)
  t.deepEqual(dispatch.args[1][0], expectedAction2)
  t.deepEqual(ret, expected)
})

test('should handle failure in flow', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({ status: 'timeout', error: 'Too slow' })
  const jobs = createJobsMap({
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
  })
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action2',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const ret = await run(jobs)(action, {
    ...handlerResources,
    dispatch,
  })
  const expectedErrorResponses = [
    {
      status: 'timeout',
      error: 'Too slow',
      origin: 'job:action2:step:setEntry',
    },
  ]

  t.is(dispatch.callCount, 1) // Should break after first step
  t.is(ret.status, 'error', ret.error)
  t.is(
    ret.error,
    "Could not finish job 'action2', the following steps failed: 'setEntry' (timeout: Too slow)",
  )
  t.deepEqual(ret.responses, expectedErrorResponses)
})

test('should run flow with mutations and iteration', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onCall(1)
    .resolves({ status: 'ok', data: [{ id: 'ent3', title: 'Entry 3' }] })
  const jobs = createJobsMap({
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
  })
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
    meta: { ident: { id: 'johnf' }, jobId: 'action11' },
  }
  const expectedAction1 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: { id: 'ent3', include: true },
      key: 'ent3',
    },
    meta: { ident: { id: 'johnf' }, jobId: 'action11' },
  }
  const expected = { status: 'ok', data: [{ id: 'ent3', title: 'Entry 3' }] }

  const ret = await run(jobs)(action, {
    ...handlerResources,
    dispatch,
  })

  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expectedAction0)
  t.deepEqual(dispatch.args[1][0], expectedAction1)
  t.deepEqual(ret, expected)
  t.is(ret.status, 'ok', ret.error)
})

test('should return noaction when job has an empty flow', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const jobs = createJobsMap({
    id: 'action1',
    flow: [],
  })
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

  const ret = await run(jobs)(action, {
    ...handlerResources,
    dispatch,
  })

  t.deepEqual(ret, expected)
  t.is(dispatch.callCount, 0)
})

test('should return notfound for unknown job', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const jobs = createJobsMap({
    id: 'action1',
    action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
  })
  const action = {
    type: 'RUN',
    payload: {
      jobId: 'action0', // Unknown id
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'notfound',
    error: "No valid job with id 'action0'",
    origin: 'handler:RUN',
  }

  const ret = await run(jobs)(action, {
    ...handlerResources,
    dispatch,
  })

  t.deepEqual(ret, expected)
  t.is(dispatch.callCount, 0)
})

test('should return error when job has no action or flow', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] })
  const jobs = createJobsMap({
    id: 'action0',
  })
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

  const ret = await run(jobs)(action, {
    ...handlerResources,
    dispatch,
  })

  t.deepEqual(ret, expected)
  t.is(dispatch.callCount, 0)
})

test('should return error from a sub-flow started with RUN and make it available in mutations on action.response', async (t) => {
  const jobs = createJobsMap({
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
  })
  jobs.set(
    'action10',
    new Job(
      {
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
      mapTransform,
      mapOptions,
    ),
  )
  const runFn = run(jobs)
  const dispatch = sinon
    .stub()
    .onCall(0)
    .resolves({ status: 'ok', data: [] })
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
      "Could not finish job 'action9', the following steps failed: 'job:action10:step:setEntries' (error: Need at least one data item)",
    responses: [
      {
        status: 'error',
        error: 'Need at least one data item',
        origin: 'job:action9:step:job:action10:step:setEntries',
      },
    ],
    origin: 'job:action9',
  }

  const ret = await runFn(action, { ...handlerResources, dispatch })

  t.deepEqual(ret, expected)
  t.is(dispatch.callCount, 2)
  // t.deepEqual(dispatch.args[1][0], {})
})
