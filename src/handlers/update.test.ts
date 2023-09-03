import test from 'ava'
import nock from 'nock'
import transformers from 'integreat-transformers'
import Service from '../service/Service.js'
import jsonServiceDef from '../tests/helpers/jsonServiceDef.js'
import Schema from '../schema/Schema.js'
import handlerResources from '../tests/helpers/handlerResources.js'
import createMapOptions from '../utils/createMapOptions.js'
import type { ValidateObject } from '../types.js'

import update from './update.js'

// Setup

const commonSchemas = new Map()
commonSchemas.set(
  'entry',
  new Schema({
    id: 'entry',
    shape: {
      title: { $type: 'string', default: 'A title' },
      author: 'string',
      createdAt: 'date',
    },
    access: { allow: 'auth' },
  }),
)

const schemasWithUpdatedAt = new Map()
schemasWithUpdatedAt.set(
  'entry',
  new Schema({
    id: 'entry',
    shape: {
      title: { $type: 'string', default: 'A title' },
      author: 'string',
      createdAt: 'date',
      updatedAt: 'date',
    },
    access: { allow: 'auth' },
  }),
)

const pipelines = {
  'entries-entry': [
    {
      $iterate: true,
      id: 'id',
      title: 'header',
      author: 'author',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
    { $cast: 'entry' },
  ],
}

const setupService = (
  uri: string,
  getUri?: string,
  validate?: ValidateObject[],
  schemas: Map<string, Schema> = commonSchemas,
  matchMoreThanUpdate = false,
) =>
  new Service(
    {
      id: 'entries',
      ...jsonServiceDef,
      endpoints: getUri
        ? [
            // Use for GET and SET version
            {
              match: {
                action: 'GET',
                type: 'entry',
              },
              validate,
              mutation: [
                {
                  $direction: 'to',
                  $flip: true,
                  payload: {
                    id: [
                      { $alt: ['payload.id', 'payload.data[].id'] },
                      { $transform: 'split', sep: ',' },
                    ],
                  },
                },
                {
                  $direction: 'from',
                  response: {
                    $modify: 'response',
                    data: ['response.data', { $apply: 'entries-entry' }],
                  },
                },
              ],
              options: { uri: getUri, method: 'GET' },
            },
            {
              match: {
                action: 'SET',
                type: 'entry',
              },
              mutation: [
                {
                  $direction: 'to',
                  $flip: true,
                  payload: {
                    id: 'payload.id',
                    data: ['payload.data', { $apply: 'entries-entry' }],
                  },
                },
                {
                  $direction: 'from',
                  response: {
                    $modify: 'response',
                    data: ['response.data', { $apply: 'entries-entry' }],
                  },
                },
              ],
              options: { uri, method: 'POST' },
            },
          ]
        : [
            // Used for UPDATE version
            {
              // Should not match this
              match: {
                action: 'SET',
                type: 'entry',
              },
            },
            {
              match: {
                action: matchMoreThanUpdate ? ['SET', 'UPDATE'] : 'UPDATE',
                type: 'entry',
              },
              validate,
              mutation: [
                {
                  $direction: 'to',
                  payload: {
                    id: 'payload.id',
                    data: ['payload.data.doc', { $apply: 'entries-entry' }],
                  },
                },
                {
                  $direction: 'from',
                  response: {
                    $modify: 'response',
                    data: ['response.data', { $apply: 'entries-entry' }],
                  },
                },
              ],
              options: { uri, method: 'POST' },
            },
          ],
    },
    {
      schemas,
      mapOptions: createMapOptions(schemas, pipelines, transformers),
    },
  )

test.after(() => {
  nock.restore()
})

// Tests -- with UPDATE endpoint

test('should send UPDATE action to UPDATE endpoint', async (t) => {
  const createdAt = new Date()
  const scope = nock('http://api1.test')
    .post('/database/update/ent1', {
      doc: {
        id: 'ent1',
        header: 'Entry 1',
        createdAt: createdAt.toISOString(),
      },
    })
    .reply(201, [{ ok: true }])
  const action = {
    type: 'UPDATE',
    payload: {
      type: 'entry',
      data: { $type: 'entry', id: 'ent1', title: 'Entry 1', createdAt },
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const src = setupService('http://api1.test/database/update/{payload.id}')
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? src : undefined

  const ret = await update(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.headers, { 'content-type': 'application/json' })
  t.true(scope.isDone())
})

test('should send UPDATE action to UPDATE endpoint when endpoint matches several actions', async (t) => {
  const createdAt = new Date()
  const scope = nock('http://api1.test')
    .post('/database/update/ent1', {
      doc: {
        id: 'ent1',
        header: 'Entry 1',
        createdAt: createdAt.toISOString(),
      },
    })
    .reply(201, [{ ok: true }])
  const action = {
    type: 'UPDATE',
    payload: {
      type: 'entry',
      data: { $type: 'entry', id: 'ent1', title: 'Entry 1', createdAt },
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const matchMoreThanUpdate = true
  const src = setupService(
    'http://api1.test/database/update/{payload.id}',
    undefined,
    undefined,
    undefined,
    matchMoreThanUpdate,
  )
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? src : undefined

  const ret = await update(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.headers, { 'content-type': 'application/json' })
  t.true(scope.isDone())
})

test('should send UPDATE action to UPDATE endpoint with several items', async (t) => {
  const createdAt = new Date()
  const scope = nock('http://api2.test')
    .post('/database/update', {
      doc: [
        {
          id: 'ent1',
          header: 'Entry 1',
          createdAt: createdAt.toISOString(),
        },
        {
          id: 'ent2',
          header: 'Entry 2',
          createdAt: createdAt.toISOString(),
        },
      ],
    })
    .reply(201, [{ ok: true }, { ok: true }])
  const action = {
    type: 'UPDATE',
    payload: {
      type: 'entry',
      data: [
        { $type: 'entry', id: 'ent1', title: 'Entry 1', createdAt },
        { $type: 'entry', id: 'ent2', title: 'Entry 2', createdAt },
      ],
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const src = setupService('http://api2.test/database/update')
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? src : undefined

  const ret = await update(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.headers, { 'content-type': 'application/json' })
  t.true(scope.isDone())
})

test('should send UPDATE action to UPDATE endpoint with id and no data', async (t) => {
  const scope = nock('http://api3.test')
    .post('/database/update/ent1', {})
    .reply(201, [{ ok: true }, { ok: true }])
  const action = {
    type: 'UPDATE',
    payload: {
      type: 'entry',
      id: 'ent1',
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const src = setupService('http://api3.test/database/update/{payload.id}')
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? src : undefined

  const ret = await update(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.headers, { 'content-type': 'application/json' })
  t.true(Array.isArray(ret.data))
  t.is((ret.data as unknown[]).length, 2)
  t.true(scope.isDone())
})

test('should mutate response data', async (t) => {
  const createdAt = new Date()
  const scope = nock('http://api4.test')
    .post('/database/update/ent1', {
      doc: {
        id: 'ent1',
        header: 'Entry 1',
        createdAt: createdAt.toISOString(),
      },
    })
    .reply(201, [
      { id: 'ent1', header: 'Entry 1 - updated', author: 'johnf', createdAt },
    ])
  const action = {
    type: 'UPDATE',
    payload: {
      type: 'entry',
      data: { $type: 'entry', id: 'ent1', title: 'Entry 1', createdAt },
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const src = setupService('http://api4.test/database/update/{payload.id}')
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? src : undefined
  const expectedData = [
    {
      id: 'ent1',
      $type: 'entry',
      title: 'Entry 1 - updated',
      author: 'johnf',
      createdAt,
    },
  ]

  const ret = await update(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.headers, { 'content-type': 'application/json' })
  t.deepEqual(ret.data, expectedData)
  t.true(scope.isDone())
})

test('should return failResponse when validation fails', async (t) => {
  const scope = nock('http://api5.test').post('/database/update').reply(201, [])
  const action = {
    type: 'UPDATE',
    payload: {
      type: 'entry',
      // No data
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const src = setupService('http://api5.test/database/update', undefined, [
    {
      condition: 'payload.data',
      failResponse: { status: 'error', error: 'We need data!' },
    },
  ])
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? src : undefined
  const expected = {
    status: 'error',
    error: 'We need data!',
    data: undefined,
    origin: 'validate:service:entries:endpoint',
  }

  const ret = await update(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
  t.false(scope.isDone())
})

test('should return error when service fails', async (t) => {
  nock('http://api6.test').post('/database/update/ent1').reply(404)
  const action = {
    type: 'UPDATE',
    payload: {
      data: { id: 'ent1', $type: 'entry' },
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const src = setupService('http://api6.test/database/update/{payload.id}')
  const getService = () => src
  const expected = {
    status: 'notfound',
    error: 'Could not find the url http://api6.test/database/update/ent1',
    origin: 'service:entries',
    data: undefined,
  }

  const ret = await update(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
  t.falsy(ret.data)
})

test('should return error when no service exists for a type', async (t) => {
  const getService = () => undefined
  const action = {
    type: 'UPDATE',
    payload: {
      type: 'entry',
      data: { id: 'ent1', $type: 'entry' },
    },
    meta: { ident: { id: 'johnf' } },
  }
  const expected = {
    status: 'error',
    error: "No service exists for type 'entry'",
    origin: 'handler:UPDATE',
  }

  const ret = await update(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
})

test('should return badrequest when no endpoint matches', async (t) => {
  const action = {
    type: 'UPDATE',
    payload: {
      // Won't match endpoint because we have not type
      data: [],
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const src = setupService('http://api99.test/database/update')
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? src : undefined
  const expected = {
    status: 'badrequest',
    error: "No endpoint matching UPDATE request to service 'entries'.",
    origin: 'handler:UPDATE',
  }

  const ret = await update(action, { ...handlerResources, getService })

  t.deepEqual(ret, expected)
})

// Tests -- with GET and SET endpoints

test('should send UPDATE action to GET and SET endpoints', async (t) => {
  const createdAt = new Date()
  const scope = nock('http://api50.test')
    .get('/database/get/ent1')
    .reply(200, {
      id: 'ent1',
      header: 'Entry 1',
      author: 'johnf',
      createdAt: createdAt.toISOString(),
    })
    .post('/database/update/ent1', {
      id: 'ent1',
      header: 'Entry 1 - updated',
      author: 'johnf',
      createdAt: createdAt.toISOString(),
    })
    .reply(201, [{ ok: true }])
  const action = {
    type: 'UPDATE',
    payload: {
      type: 'entry',
      data: {
        $type: 'entry',
        id: 'ent1',
        title: 'Entry 1 - updated',
        createdAt,
      },
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const src = setupService(
    'http://api50.test/database/update/{payload.id}',
    'http://api50.test/database/get/{payload.id}',
  )
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? src : undefined

  const ret = await update(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.headers, { 'content-type': 'application/json' })
  t.true(scope.isDone())
})

test('should send UPDATE action to GET and SET endpoints with several items', async (t) => {
  const createdAt = new Date()
  const scope = nock('http://api51.test')
    .get('/database/get?ids=ent1,ent2')
    .reply(200, [
      {
        id: 'ent1',
        header: 'Entry 1',
        author: 'johnf',
        createdAt: createdAt.toISOString(),
      },
      {
        id: 'ent2',
        header: 'Entry 2',
        author: 'katef',
        createdAt: createdAt.toISOString(),
      },
    ])
    .post('/database/update', [
      {
        id: 'ent1',
        header: 'Entry 1 - updated',
        author: 'johnf',
        createdAt: createdAt.toISOString(),
      },
      {
        id: 'ent2',
        header: 'Entry 2 - updated',
        author: 'katef',
        createdAt: createdAt.toISOString(),
      },
    ])
    .reply(201, [{ ok: true }])
  const action = {
    type: 'UPDATE',
    payload: {
      type: 'entry',
      data: [
        { $type: 'entry', id: 'ent1', title: 'Entry 1 - updated', createdAt },
        { $type: 'entry', id: 'ent2', title: 'Entry 2 - updated', createdAt },
      ],
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const src = setupService(
    'http://api51.test/database/update',
    'http://api51.test/database/get?ids={payload.id}',
  )
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? src : undefined

  const ret = await update(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.headers, { 'content-type': 'application/json' })
  t.true(scope.isDone())
})

test('should not override createdAt in fetched data', async (t) => {
  const createdAt = new Date()
  const scope = nock('http://api52.test')
    .get('/database/get/ent1')
    .reply(200, {
      id: 'ent1',
      header: 'Entry 1',
      author: 'johnf',
      createdAt: '2023-01-14T17:43:11.000Z',
    })
    .post('/database/update/ent1', {
      id: 'ent1',
      header: 'Entry 1 - updated',
      author: 'johnf',
      createdAt: '2023-01-14T17:43:11.000Z',
    })
    .reply(201, [{ ok: true }])
  const action = {
    type: 'UPDATE',
    payload: {
      type: 'entry',
      data: {
        $type: 'entry',
        id: 'ent1',
        title: 'Entry 1 - updated',
        createdAt,
      },
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const src = setupService(
    'http://api52.test/database/update/{payload.id}',
    'http://api52.test/database/get/{payload.id}',
  )
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? src : undefined

  const ret = await update(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.headers, { 'content-type': 'application/json' })
  t.true(scope.isDone())
})

test('should not override createdAt in array of fetched data', async (t) => {
  const createdAt = new Date()
  const scope = nock('http://api53.test')
    .get('/database/get?ids=ent1,ent2')
    .reply(200, [
      {
        id: 'ent1',
        header: 'Entry 1',
        author: 'johnf',
        createdAt: '2023-01-14T17:43:11.000Z',
      },
      {
        id: 'ent2',
        header: 'Entry 2',
        author: 'katef',
        createdAt: '2023-01-14T17:57:09.000Z',
      },
    ])
    .post('/database/update', [
      {
        id: 'ent1',
        header: 'Entry 1 - updated',
        author: 'johnf',
        createdAt: '2023-01-14T17:43:11.000Z',
      },
      {
        id: 'ent2',
        header: 'Entry 2 - updated',
        author: 'katef',
        createdAt: '2023-01-14T17:57:09.000Z',
      },
    ])
    .reply(201, [{ ok: true }])
  const action = {
    type: 'UPDATE',
    payload: {
      type: 'entry',
      data: [
        { $type: 'entry', id: 'ent1', title: 'Entry 1 - updated', createdAt },
        { $type: 'entry', id: 'ent2', title: 'Entry 2 - updated', createdAt },
      ],
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const src = setupService(
    'http://api53.test/database/update',
    'http://api53.test/database/get?ids={payload.id}',
  )
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? src : undefined

  const ret = await update(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.headers, { 'content-type': 'application/json' })
  t.true(scope.isDone())
})

test('should set updatedAt to now when found in merged data', async (t) => {
  const before = Date.now()
  const createdAt = new Date('2023-08-18T14:27:54.000Z')
  const scope = nock('http://api54.test')
    .get('/database/get/ent1')
    .reply(200, {
      id: 'ent1',
      header: 'Entry 1',
      author: 'johnf',
      createdAt: '2023-01-14T17:43:11.000Z',
      updatedAt: '2023-01-14T17:43:11.000Z',
    })
    .post(
      '/database/update/ent1',
      (item) => new Date(item.updatedAt).getTime() >= before,
    )
    .reply(201, [{ ok: true }])
  const action = {
    type: 'UPDATE',
    payload: {
      type: 'entry',
      data: {
        $type: 'entry',
        id: 'ent1',
        title: 'Entry 1 - updated',
        createdAt,
        updatedAt: createdAt,
      },
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const src = setupService(
    'http://api54.test/database/update/{payload.id}',
    'http://api54.test/database/get/{payload.id}',
    undefined,
    schemasWithUpdatedAt,
  )
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? src : undefined

  const ret = await update(action, { ...handlerResources, getService })

  t.is(ret.status, 'ok', ret.error)
  t.deepEqual(ret.headers, { 'content-type': 'application/json' })
  t.true(scope.isDone())
})

test('should respond with error when the original data and the gotten data is not both array or non-array', async (t) => {
  const scope = nock('http://api55.test')
    .get('/database/get?ids=ent1,ent2')
    .reply(200, { id: 'ent1', header: 'Entry 1', author: 'johnf' })
  const action = {
    type: 'UPDATE',
    payload: {
      type: 'entry',
      data: [
        { $type: 'entry', id: 'ent1', title: 'Entry 1 - updated' },
        { $type: 'entry', id: 'ent2', title: 'Entry 2 - updated' },
      ],
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const src = setupService(
    'http://api55.test/database/update',
    'http://api55.test/database/get?ids={payload.id}',
  )
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? src : undefined

  const ret = await update(action, { ...handlerResources, getService })

  t.is(ret.status, 'error', ret.error)
  t.is(ret.error, 'Cannot merge array with non-array')
  t.true(scope.isDone())
})

test('should return error from GET', async (t) => {
  const scope = nock('http://api56.test').get('/database/get/ent1').reply(404)
  const action = {
    type: 'UPDATE',
    payload: {
      type: 'entry',
      data: { $type: 'entry', id: 'ent1', title: 'Entry 1 - updated' },
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const src = setupService(
    'http://api56.test/database/update/{payload.id}',
    'http://api56.test/database/get/{payload.id}',
  )
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? src : undefined

  const ret = await update(action, { ...handlerResources, getService })

  t.is(ret.status, 'notfound', ret.error)
  t.is(
    ret.error,
    'UPDATE failed: Could not find the url http://api56.test/database/get/ent1',
  )
  // t.deepEqual(ret.headers, { 'content-type': 'application/json' })
  t.true(scope.isDone())
})

test('should return error from SET', async (t) => {
  const scope = nock('http://api57.test')
    .get('/database/get/ent1')
    .reply(200, { id: 'ent1', header: 'Entry 1', author: 'johnf' })
    .post('/database/update/ent1')
    .reply(408)
  const action = {
    type: 'UPDATE',
    payload: {
      type: 'entry',
      data: { $type: 'entry', id: 'ent1', title: 'Entry 1 - updated' },
      targetService: 'entries',
    },
    meta: { ident: { id: 'johnf' } },
  }
  const src = setupService(
    'http://api57.test/database/update/{payload.id}',
    'http://api57.test/database/get/{payload.id}',
  )
  const getService = (_type?: string | string[], service?: string) =>
    service === 'entries' ? src : undefined

  const ret = await update(action, { ...handlerResources, getService })

  t.is(ret.status, 'timeout', ret.error)
  t.is(
    ret.error,
    'UPDATE failed: Server returned 408 for http://api57.test/database/update/ent1',
  )
  // t.deepEqual(ret.headers, { 'content-type': 'application/json' })
  t.true(scope.isDone())
})
