import test from 'ava'
import sinon = require('sinon')
import { completeExchange } from '../utils/exchangeMapping'

import completeIdent from './completeIdent'

// Tests

test('should complete ident with id', async (t) => {
  const dispatch = sinon.stub().resolves(
    completeExchange({
      status: 'ok',
      ident: { id: 'johnf', roles: ['editor'] },
    })
  )
  const exchange = completeExchange({
    type: 'GET',
    request: {},
    ident: { id: 'johnf' },
  })
  const expectedIdent0 = { id: 'johnf' }
  const expectedIdent1 = { id: 'johnf', roles: ['editor'] }

  await completeIdent(dispatch)(exchange)

  t.is(dispatch.callCount, 2)
  const exchange0 = dispatch.args[0][0]
  t.is(exchange0.type, 'GET_IDENT')
  t.deepEqual(exchange0.ident, expectedIdent0)
  const exchange1 = dispatch.args[1][0]
  t.is(exchange1.type, 'GET')
  t.deepEqual(exchange1.ident, expectedIdent1)
})

test('should complete ident with token', async (t) => {
  const dispatch = sinon.stub().resolves(
    completeExchange({
      status: 'ok',
      ident: { id: 'johnf', roles: ['editor'] },
    })
  )
  const exchange = completeExchange({
    type: 'GET',
    ident: { withToken: 'twitter|23456' },
  })
  const expectedIdent0 = { withToken: 'twitter|23456' }
  const expectedIdent1 = { id: 'johnf', roles: ['editor'] }

  await completeIdent(dispatch)(exchange)

  t.is(dispatch.callCount, 2)
  const exchange0 = dispatch.args[0][0]
  t.is(exchange0.type, 'GET_IDENT')
  t.deepEqual(exchange0.ident, expectedIdent0)
  const exchange1 = dispatch.args[1][0]
  t.is(exchange1.type, 'GET')
  t.deepEqual(exchange1.ident, expectedIdent1)
})

test('should pass on exchange when no ident', async (t) => {
  const dispatch = sinon.stub().resolves(completeExchange({ status: 'ok' }))
  const exchange = completeExchange({ type: 'GET', request: { type: 'entry' } })

  await completeIdent(dispatch)(exchange)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], exchange)
})

test('should pass on exchange when ident is not found', async (t) => {
  const dispatch = sinon
    .stub()
    .resolves(
      completeExchange({ status: 'notfound', response: { error: 'Not found' } })
    )
  const exchange = completeExchange({ type: 'GET', ident: { id: 'unknown' } })

  await completeIdent(dispatch)(exchange)

  t.is(dispatch.callCount, 2)
  t.deepEqual(dispatch.args[1][0], exchange)
})

test('should pass on action when no id or withToken', async (t) => {
  const dispatch = sinon.stub().resolves(completeExchange({ status: 'ok' }))
  const exchange = completeExchange({ type: 'GET', ident: {} })

  await completeIdent(dispatch)(exchange)

  t.is(dispatch.callCount, 1)
  t.deepEqual(dispatch.args[0][0], exchange)
})
