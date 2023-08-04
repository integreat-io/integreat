import test from 'ava'
import sinon from 'sinon'
import integreatTransformers from 'integreat-transformers'

import Step from './Step.js'

// Setup

const mapOptions = {
  transformers: { size: integreatTransformers.size },
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
  },
}
const meta = {
  ident: { id: 'johnf' },
  project: 'test',
  cid: '23456',
  jobId: 'action1',
}

// Tests

test('should create Step instance', (t) => {
  const stepDef = {
    id: 'getEntry',
    action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
  }

  const ret = new Step(stepDef, mapOptions)

  t.is(ret.id, 'getEntry')
  t.is(typeof ret.run, 'function')
})

// Tests -- run

test('should run action step', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    data: [{ id: 'ent1', $type: 'entry' }],
  })
  const stepDef = {
    id: 'action1',
    action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
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
  const expected = [
    {
      action1: {
        ...expectedAction,
        response: {
          status: 'ok',
          data: [{ id: 'ent1', $type: 'entry' }],
        },
      },
    },
    false,
  ]

  const step = new Step(stepDef, mapOptions)
  const ret = await step.run(meta, { action }, dispatch)

  t.deepEqual(ret, expected)
  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
})

test('should run several action steps', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok' })
    .onCall(0)
    .resolves({
      status: 'ok',
      data: [{ id: 'ent1', $type: 'entry' }],
    })
    .onCall(1)
    .resolves({
      status: 'ok',
      data: [{ id: 'updatedAt', $type: 'date' }],
    })
  const stepDef = [
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
  ]
  const expectedAction0 = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1' },
    meta: {
      ident: { id: 'johnf' },
      project: 'test',
      cid: '23456',
      jobId: 'action1',
    },
  }
  const expectedAction1 = {
    type: 'GET',
    payload: { type: 'date', id: 'updatedAt' },
    meta: {
      ident: { id: 'johnf' },
      project: 'test',
      cid: '23456',
      jobId: 'action1',
    },
  }
  const expected = [
    {
      'getEntry:getDate': {
        response: {
          status: 'ok',
        },
      },
      getEntry: {
        ...expectedAction0,
        response: {
          status: 'ok',
          data: [{ id: 'ent1', $type: 'entry' }],
        },
      },
      getDate: {
        ...expectedAction1,
        response: {
          status: 'ok',
          data: [{ id: 'updatedAt', $type: 'date' }],
        },
      },
    },
    false,
  ]

  const step = new Step(stepDef, mapOptions)
  const ret = await step.run(meta, { action }, dispatch)

  t.deepEqual(ret, expected)
  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expectedAction0)
  t.deepEqual(dispatch.args[1][0], expectedAction1)
  t.is(step.id, 'getEntry:getDate')
})

test('should return error from failing parallel steps', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] })
    .onCall(0)
    .resolves({ status: 'timeout', error: 'Too slow' })
  const stepDef = [
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
  ]
  const expected = [
    {
      'setEntry:setDate': {
        response: {
          status: 'error',
          responses: [
            {
              status: 'timeout',
              error: 'Too slow',
              origin: 'setEntry',
            },
          ],
        },
      },
      setEntry: {
        ...stepDef[0].action,
        response: { status: 'timeout', error: 'Too slow', origin: 'setEntry' },
        meta,
      },
      setDate: {
        ...stepDef[1].action,
        response: {
          status: 'ok',
          data: [{ id: 'ent1', $type: 'entry' }],
        },
        meta,
      },
    },
    false,
  ]
  const step = new Step(stepDef, mapOptions)
  const ret = await step.run(meta, { action }, dispatch)

  t.deepEqual(ret, expected)
  t.is(dispatch.callCount, 2)
})

test('should handle rejection when running steps', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] })
    .onCall(0)
    .rejects(new Error('Failure!'))
  const stepDef = [
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
  ]
  const expected = [
    {
      'setEntry:setDate': {
        response: {
          status: 'error',
          responses: [
            {
              status: 'error',
              error: 'Failure!',
              origin: 'setEntry',
            },
          ],
        },
      },
      setEntry: {
        ...stepDef[0].action,
        response: { status: 'error', error: 'Failure!', origin: 'setEntry' },
        meta,
      },
      setDate: {
        ...stepDef[1].action,
        response: {
          status: 'ok',
          data: [{ id: 'ent1', $type: 'entry' }],
        },
        meta,
      },
    },
    false,
  ]

  const step = new Step(stepDef, mapOptions)
  const ret = await step.run(meta, { action }, dispatch)

  t.deepEqual(ret, expected)
  t.is(dispatch.callCount, 2)
})

test('should not run action when its preconditions fail', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const stepDef = {
    id: 'setEntries',
    preconditions: [
      {
        condition: {
          $transform: 'compare',
          path: ['getEntries.response.data', { $transform: 'size' }],
          operator: '>',
          match: 1,
        },
      },
    ],
    action: {
      type: 'SET',
      payload: { type: 'entry' },
    },
  }
  const expected = [
    {
      setEntries: {
        response: {
          status: 'noaction',
          error: 'Did not satisfy condition',
          origin: 'setEntries',
        },
      },
    },
    false,
  ]

  const step = new Step(stepDef, mapOptions)
  const ret = await step.run(meta, { action }, dispatch)

  t.is(dispatch.callCount, 0) // Should not run action
  t.deepEqual(ret, expected)
})

test('should return error from several failing conditions in preconditions', async (t) => {
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const stepDef = {
    id: 'setEntries',
    preconditions: [
      {
        condition: {
          $transform: 'compare',
          path: ['getEntries.response.data', { $transform: 'size' }],
          operator: '>',
          match: 1,
        },
      },
      {
        condition: {
          $transform: 'compare',
          path: 'action.payload.id',
          operator: 'exists',
        },
        failResponse: { status: 'badrequest', error: 'Missing id' },
      },
    ],
    action: {
      type: 'SET',
      payload: { type: 'entry' },
    },
  }
  const expected = [
    {
      setEntries: {
        response: {
          status: 'error',
          error:
            '[noaction] Did not satisfy condition | [badrequest] Missing id',
          origin: 'setEntries',
        },
      },
    },
    false,
  ]

  const step = new Step(stepDef, mapOptions)
  const ret = await step.run(meta, { action }, dispatch)

  t.is(dispatch.callCount, 0) // Should not run action
  t.deepEqual(ret, expected)
})

test('should support json schema validation form as conditions', async (t) => {
  // Note: We'll remove this in the future
  const dispatch = sinon.stub().resolves({ status: 'ok' })
  const stepDef = {
    id: 'setEntries',
    conditions: {
      'getEntries.response.data': { type: 'array', minItems: 1 },
    },
    action: {
      type: 'SET',
      payload: { type: 'entry' },
    },
  }
  const expected = [
    {
      setEntries: {
        response: {
          status: 'noaction',
          warning:
            "'getEntries.response.data' did not pass { type: 'array', minItems: 1 }",
          origin: 'setEntries',
        },
      },
    },
    false,
  ]

  const step = new Step(stepDef, mapOptions)
  const ret = await step.run(meta, { action }, dispatch)

  t.is(dispatch.callCount, 0) // Should not run action
  t.deepEqual(ret, expected)
})

test('should return data from simple action based on postmutation', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    data: [{ id: 'ent1', $type: 'entry' }],
    params: { keep: true },
  })
  const stepDef = {
    id: 'action1',
    action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
    postmutation: {
      response: 'response',
      'response.data': 'response.data[0]',
    },
  }
  const expected = [
    {
      action1: {
        ...stepDef.action,
        response: {
          status: 'ok',
          data: { id: 'ent1', $type: 'entry' },
          params: { keep: true },
        },
        meta,
      },
    },
    false,
  ]

  const step = new Step(stepDef, mapOptions)
  const ret = await step.run(meta, { action }, dispatch)

  t.deepEqual(ret, expected)
  t.is(dispatch.callCount, 1)
})

test('should not use depricated "magic" from responseMutation for postmutation', async (t) => {
  const dispatch = sinon.stub().resolves({
    status: 'ok',
    data: [{ id: 'ent1', $type: 'entry' }],
    params: { keep: true },
  })
  const stepDef = {
    id: 'action1',
    action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
    postmutation: {
      'response.data': 'response.data[0]',
    },
  }
  const expected = [
    {
      action1: {
        ...stepDef.action,
        response: {
          status: 'ok',
          data: { id: 'ent1', $type: 'entry' },
          // With the "magic", we should have gotten `params: { keep: true }` here
        },
        meta,
      },
    },
    false,
  ]

  const step = new Step(stepDef, mapOptions)
  const ret = await step.run(meta, { action }, dispatch)

  t.deepEqual(ret, expected)
  t.is(dispatch.callCount, 1)
})

test('should return data from simple action based on responseMutation', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] })
  const stepDef = {
    id: 'action1',
    action: { type: 'GET', payload: { type: 'entry', id: 'ent1' } },
    responseMutation: {
      'response.data': 'response.data[0]',
    },
  }
  const expected = [
    {
      action1: {
        ...stepDef.action,
        response: { status: 'ok', data: { id: 'ent1', $type: 'entry' } },
        meta,
      },
    },
    false,
  ]

  const step = new Step(stepDef, mapOptions)
  const ret = await step.run(meta, { action }, dispatch)

  t.deepEqual(ret, expected)
  t.is(dispatch.callCount, 1)
})

test('should mutate simple action', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] })
  const stepDef = {
    id: 'action1',
    action: {
      type: 'GET',
      payload: { type: 'entry', id: 'ent1' },
      meta: { queue: true },
    },
    premutation: { payload: { $modify: 'payload', flag: { $value: true } } },
  }
  const expectedAction = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1', flag: true },
    meta: { ...meta, queue: true },
  }
  const expected = [
    {
      action1: {
        ...expectedAction,
        response: { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] },
      },
    },
    false,
  ]

  const step = new Step(stepDef, mapOptions)
  const ret = await step.run(meta, { action }, dispatch)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.deepEqual(ret, expected)
})

test('should mutate simple action without "magic"', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] })
  const stepDef = {
    id: 'action1',
    action: {
      type: 'GET',
      payload: { type: 'entry', id: 'ent1' },
      meta: { queue: true },
    },
    premutation: { 'payload.flag': { $value: true } },
  }
  const expectedAction = {
    type: 'GET',
    payload: { flag: true }, // With "magic", we would have gotten `type: 'entry', id: 'ent1'` here too
    meta: { ...meta, queue: true },
  }
  const expected = [
    {
      action1: {
        ...expectedAction,
        response: { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] },
      },
    },
    false,
  ]

  const step = new Step(stepDef, mapOptions)
  const ret = await step.run(meta, { action }, dispatch)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.deepEqual(ret, expected)
})

test('should mutate simple action with depricated `muation` property', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] })
  const stepDef = {
    id: 'action1',
    action: {
      type: 'GET',
      payload: { type: 'entry', id: 'ent1' },
      meta: { queue: true },
    },
    mutation: { 'payload.flag': { $value: true } },
  }
  const expectedAction = {
    type: 'GET',
    payload: { type: 'entry', id: 'ent1', flag: true },
    meta: { ...meta, queue: true },
  }
  const expected = [
    {
      action1: {
        ...expectedAction,
        response: { status: 'ok', data: [{ id: 'ent1', $type: 'entry' }] },
      },
    },
    false,
  ]

  const step = new Step(stepDef, mapOptions)
  const ret = await step.run(meta, { action }, dispatch)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], expectedAction)
  t.deepEqual(ret, expected)
})

test('should mutate action into several actions based on iterate pipeline', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onCall(1)
    .resolves({ status: 'ok', data: [{ id: 'ent3', title: 'Entry 3' }] })
  const stepDef = {
    id: 'setItem',
    action: { type: 'SET', payload: { type: 'entry' } },
    iterate: [
      'action.payload.data.items[]',
      { $filter: 'compare', path: 'include', match: true },
    ],
    mutation: { 'payload.key': 'payload.data.id' },
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
    payload: { jobId: 'action1', data },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction0 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: { id: 'ent1', include: true },
      key: 'ent1',
    },
    meta,
  }
  const expectedAction1 = {
    type: 'SET',
    payload: {
      type: 'entry',
      data: { id: 'ent3', include: true },
      key: 'ent3',
    },
    meta,
  }
  const expected = [
    {
      setItem: {
        response: { status: 'ok', data: [{ id: 'ent3', title: 'Entry 3' }] },
      },
      setItem_0: {
        ...expectedAction0,
        response: { status: 'ok', data: [] },
      },
      setItem_1: {
        ...expectedAction1,
        response: { status: 'ok', data: [{ id: 'ent3', title: 'Entry 3' }] },
      },
    },
    false,
  ]

  const step = new Step(stepDef, mapOptions)
  const ret = await step.run(meta, { action }, dispatch)

  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[0][0], expectedAction0)
  t.deepEqual(dispatch.args[1][0], expectedAction1)
  t.deepEqual(ret, expected)
})

test('should mutate action into several actions based on iterate path', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves({ status: 'ok', data: [] })
    .onCall(0)
    .resolves({ status: 'ok', data: [{ id: 'ent1', title: 'Entry 1' }] })
    .onCall(2)
    .resolves({ status: 'ok', data: [{ id: 'ent3', title: 'Entry 3' }] })
  const stepDef = {
    id: 'setItem',
    action: { type: 'SET', payload: { type: 'entry' } },
    iteratePath: 'action.payload.data.items',
    mutation: { 'payload.key': 'payload.data.id' },
  }
  const data = { items: [{ id: 'ent1' }, { id: 'ent2' }, { id: 'ent3' }] }
  const action = {
    type: 'RUN',
    payload: { jobId: 'action1', data },
    meta: { ident: { id: 'johnf' } },
  }
  const expectedAction0 = {
    type: 'SET',
    payload: { type: 'entry', data: { id: 'ent1' }, key: 'ent1' },
    meta,
  }
  const expectedAction1 = {
    type: 'SET',
    payload: { type: 'entry', data: { id: 'ent2' }, key: 'ent2' },
    meta,
  }
  const expectedAction2 = {
    type: 'SET',
    payload: { type: 'entry', data: { id: 'ent3' }, key: 'ent3' },
    meta,
  }
  const expected = [
    {
      setItem: {
        response: {
          status: 'ok',
          data: [
            { id: 'ent1', title: 'Entry 1' },
            { id: 'ent3', title: 'Entry 3' },
          ],
        },
      },
      setItem_0: {
        ...expectedAction0,
        response: { status: 'ok', data: [{ id: 'ent1', title: 'Entry 1' }] },
      },
      setItem_1: {
        ...expectedAction1,
        response: { status: 'ok', data: [] },
      },
      setItem_2: {
        ...expectedAction2,
        response: { status: 'ok', data: [{ id: 'ent3', title: 'Entry 3' }] },
      },
    },
    false,
  ]

  const step = new Step(stepDef, mapOptions)
  const ret = await step.run(meta, { action }, dispatch)

  t.is(dispatch.callCount, 3)
  t.deepEqual(dispatch.args[0][0], expectedAction0)
  t.deepEqual(dispatch.args[1][0], expectedAction1)
  t.deepEqual(dispatch.args[2][0], expectedAction2)
  t.deepEqual(ret, expected)
})
