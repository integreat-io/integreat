import test from 'node:test'
import assert from 'node:assert/strict'
import sinon from 'sinon'
import nock from 'nock'
import Integreat from '../index.js'
import defs from '../tests/helpers/defs/index.js'
import resources from '../tests/helpers/resources/index.js'
import johnfData from '../tests/helpers/data/userJohnf.js'
import ent1Data from '../tests/helpers/data/entry1.js'
import defaultHandlerResources from '../tests/helpers/handlerResources.js'
import { TypedData, IdentType } from '../types.js'

import getIdent from './getIdent.js'

// Setup

const great = Integreat.create(defs, resources)
const getService = () => great.services.users
const options = { identConfig: { type: 'user' } }
const handlerResources = { ...defaultHandlerResources, getService, options }

const johnfIdent = {
  id: 'johnf',
  roles: ['editor'],
  tokens: ['twitter|23456', 'facebook|12345'],
}

test('getIdent handler', async (t) => {
  t.after(() => {
    nock.restore()
  })

  // Tests

  await t.test('should complete ident with token', async () => {
    const great = Integreat.create(defs, resources)
    const dispatch = sinon.spy(great.services.users, 'send')
    const getService = () => great.services.users
    const scope = nock('http://some.api')
      .get('/users')
      .query({ tokens: 'twitter|23456' })
      .reply(200, { data: johnfData })
    const action = {
      type: 'GET_IDENT',
      payload: {},
      meta: { ident: { withToken: 'twitter|23456' } },
    }
    const expected = {
      ident: { ...johnfIdent, isCompleted: true },
    }
    const expectedIdent = { id: 'root', root: true, type: IdentType.Root }

    const ret = await getIdent(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.deepEqual(ret.access, expected)
    assert.equal((ret.data as TypedData).id, 'johnf')
    assert.equal(dispatch.callCount, 1)
    const dispatchedAction = dispatch.args[0][0]
    assert.equal(dispatchedAction.type, 'GET')
    assert.equal(dispatchedAction.payload.tokens, 'twitter|23456')
    assert.equal(dispatchedAction.payload.type, 'user')
    assert.deepEqual(dispatchedAction.meta?.ident, expectedIdent)
    assert.equal(scope.isDone(), true)
  })

  await t.test('should complete ident with array of tokens', async () => {
    const great = Integreat.create(defs, resources)
    const dispatch = sinon.spy(great.services.users, 'send')
    const getService = () => great.services.users
    const scope = nock('http://some.api')
      .get('/users')
      .query({ tokens: 'twitter|23456' })
      .reply(200, { data: johnfData })
    const action = {
      type: 'GET_IDENT',
      payload: {},
      meta: { ident: { withToken: ['twitter|23456'] } },
    }
    const expected = {
      ident: { ...johnfIdent, isCompleted: true },
    }
    const expectedIdent = { id: 'root', root: true, type: IdentType.Root }

    const ret = await getIdent(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.deepEqual(ret.access, expected)
    assert.equal((ret.data as TypedData).id, 'johnf')
    assert.equal(dispatch.callCount, 1)
    const dispatchedAction = dispatch.args[0][0]
    assert.equal(dispatchedAction.type, 'GET')
    assert.deepEqual(dispatchedAction.payload.tokens, ['twitter|23456'])
    assert.equal(dispatchedAction.payload.type, 'user')
    assert.deepEqual(dispatchedAction.meta?.ident, expectedIdent)
    assert.equal(scope.isDone(), true)
  })

  await t.test('should complete ident with id', async () => {
    nock('http://some.api')
      .get('/users/johnf')
      .reply(200, { data: { ...johnfData } })
    const action = {
      type: 'GET_IDENT',
      payload: {},
      meta: { ident: { id: 'johnf' } },
    }
    const expectedIdent = { ...johnfIdent, isCompleted: true }

    const ret = await getIdent(action, handlerResources)

    assert.equal(ret.status, 'ok', ret.error)
    assert.deepEqual(ret.access?.ident, expectedIdent)
    assert.equal((ret.data as TypedData).id, 'johnf')
  })

  await t.test(
    'should complete ident with id when more props are present',
    async () => {
      nock('http://some.api')
        .get('/users/johnf')
        .reply(200, { data: { ...johnfData } })
      const action = {
        type: 'GET_IDENT',
        payload: {},
        meta: { ident: { id: 'johnf', withToken: 'other|34567' } },
      }
      const expectedIdent = { ...johnfIdent, isCompleted: true }

      const ret = await getIdent(action, handlerResources)

      assert.equal(ret.status, 'ok', ret.error)
      assert.deepEqual(ret.access?.ident, expectedIdent)
      assert.equal((ret.data as TypedData).id, 'johnf')
    },
  )

  await t.test('should not complete ident with isCompleted', async () => {
    const great = Integreat.create(defs, resources)
    const dispatch = sinon.spy(great.services.users, 'send')
    const getService = () => great.services.users
    const scope = nock('http://some.api')
      .get('/users/lucyk')
      .reply(200, { data: { id: 'lucyk' } })
    const action = {
      type: 'GET_IDENT',
      payload: {},
      meta: { ident: { id: 'lucyk', isCompleted: true } }, // Already completed
    }
    const expected = {
      ident: { id: 'lucyk', isCompleted: true },
    }

    const ret = await getIdent(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.deepEqual(ret.access, expected)
    assert.equal((ret.data as TypedData).id, 'lucyk')
    assert.equal(dispatch.callCount, 0)
    assert.equal(scope.isDone(), false) // Should not have attempted to get from api
  })

  await t.test('should pass on  cid when getting ident', async () => {
    const great = Integreat.create(defs, resources)
    const dispatch = sinon.spy(great.services.users, 'send')
    const getService = () => great.services.users
    const scope = nock('http://some.api')
      .get('/users')
      .query({ tokens: 'twitter|23456' })
      .reply(200, { data: johnfData })
    const action = {
      type: 'GET_IDENT',
      payload: {},
      meta: {
        ident: { withToken: 'twitter|23456' },
        id: '12345',
        cid: '12346',
      },
    }

    const ret = await getIdent(action, { ...handlerResources, getService })

    assert.equal(ret.status, 'ok', ret.error)
    assert.equal((ret.data as TypedData).id, 'johnf')
    assert.equal(dispatch.callCount, 1)
    const dispatchedAction = dispatch.args[0][0]
    assert.equal(dispatchedAction.meta?.cid, '12346')
    assert.equal(dispatchedAction.meta?.id, undefined)
    assert.equal(scope.isDone(), true)
  })

  await t.test('should return noaction when no props', async () => {
    const action = {
      type: 'GET_IDENT',
      payload: {},
      meta: { ident: {} },
    }
    const expected = {
      status: 'noaction',
      warning: 'GET_IDENT: The request has no ident with id or withToken',
      origin: 'handler:GET_IDENT',
    }

    const ret = await getIdent(action, handlerResources)

    assert.deepEqual(ret, expected)
  })

  await t.test('should return noaction when null', async () => {
    const action = {
      type: 'GET_IDENT',
      payload: {},
      meta: { ident: undefined },
    }
    const expected = {
      status: 'noaction',
      warning: 'GET_IDENT: The request has no ident',
      origin: 'handler:GET_IDENT',
    }

    const ret = await getIdent(action, handlerResources)

    assert.deepEqual(ret, expected)
  })

  await t.test('should return noaction when no ident options', async () => {
    const action = {
      type: 'GET_IDENT',
      payload: {},
      meta: { ident: { withToken: 'twitter|23456' } },
    }
    const options = {}
    const expected = {
      status: 'noaction',
      warning: 'GET_IDENT: Integreat is not set up with authentication',
      origin: 'handler:GET_IDENT',
    }

    const ret = await getIdent(action, { ...handlerResources, options })

    assert.deepEqual(ret, expected)
  })

  await t.test('should return notfound when ident not found', async () => {
    nock('http://some.api').get('/users/unknown').reply(404)
    const action = {
      type: 'GET_IDENT',
      payload: {},
      meta: { ident: { id: 'unknown' } },
    }
    const expected = {
      status: 'notfound',
      error:
        "Could not get ident with params { id: 'unknown' }. [notfound] Could not find the url http://some.api/users/unknown",
      origin: 'handler:GET_IDENT',
    }

    const ret = await getIdent(action, handlerResources)

    assert.deepEqual(ret, expected)
  })

  await t.test('should return notfound when response has no data', async () => {
    nock('http://some.api').get('/users/unknown').reply(200)
    const action = {
      type: 'GET_IDENT',
      payload: {},
      meta: { ident: { id: 'unknown' } },
    }
    const expected = {
      status: 'notfound',
      error:
        "Could not get ident with params { id: 'unknown' }. [notfound] Did not return the expected data",
      origin: 'handler:GET_IDENT',
    }

    const ret = await getIdent(action, handlerResources)

    assert.deepEqual(ret, expected)
  })

  await t.test('should complete ident with other prop keys', async () => {
    nock('http://some.api')
      .get('/entries')
      .query({ author: 'johnf' })
      .reply(200, { data: ent1Data })
    const action = {
      type: 'GET_IDENT',
      payload: {},
      meta: { ident: { id: 'johnf' } },
    }
    const identConfig = {
      type: 'entry', // This does not make any sense, but it is just for testing
      props: {
        id: 'author',
        roles: 'sections',
        tokens: undefined,
      },
    }
    const options = { identConfig }
    const getService = () => great.services.entries
    const expectedIdent = {
      id: 'johnf',
      roles: ['news', 'sports'],
      isCompleted: true,
    }

    const ret = await getIdent(action, {
      ...handlerResources,
      getService,
      options,
    })

    assert.equal(ret.status, 'ok', ret.error)
    assert.deepEqual(ret.access?.ident, expectedIdent)
  })

  await t.test('should include other props in ident', async () => {
    const great = Integreat.create(defs, resources)
    const dispatch = sinon.spy(great.services.users, 'send')
    const getService = () => great.services.users
    const scope = nock('http://some.api')
      .get('/users')
      .query({ tokens: 'twitter|23456' })
      .reply(200, { data: johnfData })
    const action = {
      type: 'GET_IDENT',
      payload: {},
      meta: { ident: { withToken: 'twitter|23456' } },
    }
    const identConfig = {
      type: 'user',
      props: {
        id: 'id',
        roles: 'roles',
        tokens: undefined,
      },
      mapping: {
        allowedFeeds: 'feeds',
      },
    }
    const options = { identConfig }
    const expected = {
      ident: {
        ...johnfIdent,
        allowedFeeds: ['news', 'social'],
        isCompleted: true,
      },
    }
    const expectedIdent = { id: 'root', root: true, type: IdentType.Root }

    const ret = await getIdent(action, {
      ...handlerResources,
      getService,
      options,
    })

    assert.equal(ret.status, 'ok', ret.error)
    assert.deepEqual(ret.access, expected)
    assert.equal((ret.data as TypedData).id, 'johnf')
    assert.equal(dispatch.callCount, 1)
    const dispatchedAction = dispatch.args[0][0]
    assert.equal(dispatchedAction.type, 'GET')
    assert.equal(dispatchedAction.payload.tokens, 'twitter|23456')
    assert.equal(dispatchedAction.payload.type, 'user')
    assert.deepEqual(dispatchedAction.meta?.ident, expectedIdent)
    assert.equal(scope.isDone(), true)
  })

  await t.test('should support dot notation paths', async () => {
    const great = Integreat.create(defs, resources)
    const dispatch = sinon.spy(great.services.users, 'send')
    const getService = () => great.services.users
    const johnFWithMeta = {
      ...johnfData,
      meta: {
        accounts: ['acc1', 'acc2'],
      },
    }
    const scope = nock('http://some.api')
      .get('/users')
      .query({ tokens: 'facebook|12345' })
      .reply(200, { data: johnFWithMeta })
    const action = {
      type: 'GET_IDENT',
      payload: {},
      meta: { ident: { withToken: 'facebook|12345' } },
    }
    const identConfig = {
      type: 'user',
      props: {
        id: 'id',
      },
      mapping: {
        roles: 'roles',
        tokens: 'tokens',
        accounts: 'meta.accounts',
      },
    }
    const options = { identConfig }
    const expected = {
      ident: {
        ...johnfIdent,
        accounts: ['acc1', 'acc2'],
        isCompleted: true,
      },
    }
    const expectedIdent = { id: 'root', root: true, type: IdentType.Root }

    const ret = await getIdent(action, {
      ...handlerResources,
      getService,
      options,
    })

    assert.equal(ret.status, 'ok', ret.error)
    assert.deepEqual(ret.access, expected)
    assert.equal((ret.data as TypedData).id, 'johnf')
    assert.equal(dispatch.callCount, 1)
    const dispatchedAction = dispatch.args[0][0]
    assert.equal(dispatchedAction.type, 'GET')
    assert.equal(dispatchedAction.payload.tokens, 'facebook|12345')
    assert.equal(dispatchedAction.payload.type, 'user')
    assert.deepEqual(dispatchedAction.meta?.ident, expectedIdent)
    assert.equal(scope.isDone(), true)
  })

  await t.test(
    'should complete ident with token but not include it in ident when tokens mapping is null',
    async () => {
      const great = Integreat.create(defs, resources)
      const dispatch = sinon.spy(great.services.users, 'send')
      const getService = () => great.services.users
      const scope = nock('http://some.api')
        .get('/users')
        .query({ tokens: 'twitter|23456' })
        .reply(200, { data: johnfData })
      const action = {
        type: 'GET_IDENT',
        payload: {},
        meta: { ident: { withToken: 'twitter|23456' } },
      }
      const identConfig = {
        type: 'user', // This does not make any sense, but it is just for testing
        props: {
          id: 'id',
          roles: 'roles',
          tokens: 'tokens',
        },
        mapping: {
          tokens: null,
        },
      }
      const options = { identConfig }
      const expected = {
        ident: { id: 'johnf', roles: ['editor'], isCompleted: true },
      }
      const expectedIdent = { id: 'root', root: true, type: IdentType.Root }

      const ret = await getIdent(action, {
        ...handlerResources,
        getService,
        options,
      })

      assert.equal(ret.status, 'ok', ret.error)
      assert.deepEqual(ret.access, expected)
      assert.equal((ret.data as TypedData).id, 'johnf')
      assert.equal(dispatch.callCount, 1)
      const dispatchedAction = dispatch.args[0][0]
      assert.equal(dispatchedAction.type, 'GET')
      assert.equal(dispatchedAction.payload.tokens, 'twitter|23456')
      assert.equal(dispatchedAction.payload.type, 'user')
      assert.deepEqual(dispatchedAction.meta?.ident, expectedIdent)
      assert.equal(scope.isDone(), true)
    },
  )

  await t.test(
    'should not include roles or tokens when their set to null',
    async () => {
      nock('http://some.api')
        .get('/entries')
        .query({ author: 'johnf' })
        .reply(200, { data: ent1Data })
      const action = {
        type: 'GET_IDENT',
        payload: {},
        meta: { ident: { id: 'johnf' } },
      }
      const identConfig = {
        type: 'entry', // This does not make any sense, but it is just for testing
        props: {
          id: 'author',
          roles: null,
          tokens: null,
        },
      }
      const options = { identConfig }
      const getService = () => great.services.entries
      const expectedIdent = {
        id: 'johnf',
        isCompleted: true,
      }

      const ret = await getIdent(action, {
        ...handlerResources,
        getService,
        options,
      })

      assert.equal(ret.status, 'ok', ret.error)
      assert.deepEqual(ret.access?.ident, expectedIdent)
    },
  )

  await t.test(
    'should respond with an error when we have an ident with `withToken` and no tokens property',
    async () => {
      const great = Integreat.create(defs, resources)
      const dispatch = sinon.spy(great.services.users, 'send')
      const getService = () => great.services.users
      const scope = nock('http://some.api')
        .get('/users')
        .query({ tokens: 'twitter|23457' })
        .reply(200, { data: johnfData })
      const action = {
        type: 'GET_IDENT',
        payload: {},
        meta: { ident: { withToken: 'twitter|23457' } },
      }
      const identConfig = {
        type: 'entry', // This does not make any sense, but it is just for testing
        props: {
          id: 'author',
          tokens: null, // No tokens property
        },
      }
      const options = { identConfig }

      const ret = await getIdent(action, {
        ...handlerResources,
        getService,
        options,
      })

      assert.equal(ret.status, 'badrequest', ret.error)
      assert.equal(
        ret.error,
        "GET_IDENT: The request has an ident with 'withToken', but no tokens key is set in `identConfig`",
      )
      assert.equal(dispatch.callCount, 0)
      assert.equal(scope.isDone(), false)
    },
  )

  await t.test('should return error when unknown service', async () => {
    nock('http://some.api')
      .get('/users')
      .query({ tokens: 'twitter|23456' })
      .reply(200, { data: { ...johnfData } })
    const getService = () => undefined
    const action = {
      type: 'GET_IDENT',
      payload: {},
      meta: { ident: { withToken: 'twitter|23456' } },
    }
    const expected = {
      status: 'error',
      error:
        "Could not get ident with params { tokens: 'twitter|23456' }. [error] No service exists for type 'user'",
      origin: 'handler:GET_IDENT',
    }

    const ret = await getIdent(action, { ...handlerResources, getService })

    assert.deepEqual(ret, expected)
  })

  await t.test('should return error when fetching fails', async () => {
    nock('http://some.api').get('/users/unknown').reply(500)
    const action = {
      type: 'GET_IDENT',
      payload: {},
      meta: { ident: { id: 'unknown' } },
    }
    const expected = {
      status: 'error',
      error:
        "Could not get ident with params { id: 'unknown' }. [error] Server returned 500 for http://some.api/users/unknown",
      origin: 'handler:GET_IDENT',
    }

    const ret = await getIdent(action, handlerResources)

    assert.deepEqual(ret, expected)
  })
})
