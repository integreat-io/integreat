import test from 'ava'
import sinon from 'sinon'

import run from './run'

// Helpers

const dispatch = () => {}

// Tests

test('should exist', (t) => {
  t.is(typeof run, 'function')
})

test('should run worker with given params', async (t) => {
  const params = {}
  const payload = {
    worker: 'sync',
    params
  }
  const sync = sinon.stub().returns(Promise.resolve({status: 'ok'}))
  const workers = {sync}

  const ret = await run(payload, {workers, dispatch})

  t.true(sync.calledOnce)
  t.true(sync.calledWith(params, dispatch))
  t.deepEqual(ret, {status: 'ok'})
})

test('should do nothing on action with no worker', async (t) => {
  const payload = {}
  const workers = {}

  try {
    const ret = await run(payload, {workers, dispatch})
    t.deepEqual(ret, {status: 'notfound'})
  } catch (err) {
    t.fail()
  }
})

test('should return noaction when worker is not found', async (t) => {
  const payload = {
    worker: 'unknown'
  }
  const workers = {}

  try {
    const ret = await run(payload, {workers, dispatch})
    t.deepEqual(ret, {status: 'notfound'})
  } catch (err) {
    t.fail()
  }
})

test('should return error when no workers', async (t) => {
  const payload = {
    worker: 'sync',
    params: {}
  }

  const ret = await run(payload)

  t.truthy(ret)
  t.is(ret.status, 'error')
})

test('should return error if no payload', async (t) => {
  const payload = null
  const workers = {}

  const ret = await run(payload, {workers})

  t.truthy(ret)
  t.is(ret.status, 'error')
})
