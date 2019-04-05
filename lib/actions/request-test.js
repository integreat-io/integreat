import test from 'ava'
import sinon from 'sinon'

import request from './request'

test('should call service.receive with action and return response', async (t) => {
  const response = { status: 'ok', data: '[]' }
  const service = {
    receive: sinon.stub().resolves({ response })
  }
  const getService = (type, serviceId) => (type === 'entry') ? service : null
  const dispatch = async () => ({ status: 'ok' })
  const action = {
    type: 'REQUEST',
    payload: { type: 'entry', data: '{"key":"ent1"}', endpoint: 'incoming' },
    meta: { ident: { id: 'johnf' } }
  }

  const ret = await request(action, { getService, dispatch })

  t.is(service.receive.callCount, 1)
  t.deepEqual(service.receive.args[0][0], action)
  t.is(service.receive.args[0][1], dispatch)
  t.deepEqual(ret, response)
})

test('should get service with service id', async (t) => {
  const service = {
    receive: sinon.stub().resolves({ response: { status: 'ok', data: '[]' } })
  }
  const getService = (type, serviceId) => (serviceId === 'entries') ? service : null
  const dispatch = async () => ({ status: 'ok' })
  const action = {
    type: 'REQUEST',
    payload: { service: 'entries', data: '{"key":"ent1"}' },
    meta: { ident: { id: 'johnf' } }
  }

  await request(action, { getService, dispatch })

  t.is(service.receive.callCount, 1)
})

test('should return error on unknown service', async (t) => {
  const getService = (type, serviceId) => null
  const dispatch = async () => ({ status: 'ok' })
  const action = {
    type: 'REQUEST',
    payload: { type: 'entry', data: '{"key":"ent1"}' },
    meta: { ident: { id: 'johnf' } }
  }
  const expected = {
    status: 'error',
    error: 'No service exists for type \'entry\''
  }

  const ret = await request(action, { getService, dispatch })

  t.deepEqual(ret, expected)
})
