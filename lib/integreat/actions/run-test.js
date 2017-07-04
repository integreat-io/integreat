import test from 'ava'
import sinon from 'sinon'

import run from './run'

// Helpers

const dispatch = () => {}

// Tests

test('should exist', (t) => {
  t.is(typeof run, 'function')
})

test('should run worker with given payload', async (t) => {
  const payload = {}
  const action = {
    type: 'RUN',
    worker: 'sync',
    payload
  }
  const sync = sinon.stub().returns(Promise.resolve({status: 'ok'}))
  const workers = {sync}

  const ret = await run(action, {workers, dispatch})

  t.true(sync.calledOnce)
  t.true(sync.calledWith(payload, dispatch))
  t.deepEqual(ret, {status: 'ok'})
})

test('should do nothing on action with no worker', async (t) => {
  const action = {
    type: 'RUN',
    payload: {}
  }
  const workers = {}

  try {
    const ret = await run(action, {workers, dispatch})
    t.deepEqual(ret, {status: 'notfound'})
  } catch (err) {
    t.fail()
  }
})

test('should return noaction when worker is not found', async (t) => {
  const action = {
    type: 'RUN',
    worker: 'unknown',
    payload: {}
  }
  const workers = {}

  try {
    const ret = await run(action, {workers, dispatch})
    t.deepEqual(ret, {status: 'notfound'})
  } catch (err) {
    t.fail()
  }
})
