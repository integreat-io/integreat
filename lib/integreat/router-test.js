import test from 'ava'
import sinon from 'sinon'
import later from 'later'

import router from './router'

// Tests -- actions

test('should exist', (t) => {
  t.is(typeof router, 'function')
})

test('should return status noaction when no action', async (t) => {
  const action = null
  const sources = {}

  const ret = await router(action, {sources})

  t.deepEqual(ret, {status: 'noaction'})
})

test('should return status noaction when no actions', async (t) => {
  const action = {type: 'GET_ONE'}

  const ret = await router(action)

  t.deepEqual(ret, {status: 'noaction'})
})

test('should return null when unknown action', async (t) => {
  const action = {type: 'UNKNOWN'}
  const sources = {}
  const actions = {}

  const ret = await router(action, {sources, actions})

  t.deepEqual(ret, {status: 'noaction'})
})

test('should route to GET action', async (t) => {
  const items = [{id: 'ent1', type: 'entry'}]
  const action = {
    type: 'GET_ONE',
    payload: {
      source: 'entries',
      id: 'ent1',
      type: 'entry'
    }
  }
  const actions = {
    'GET_ONE': async () => ({status: 'ok', data: items})
  }

  const ret = await router(action, {actions})

  t.is(ret.status, 'ok')
  t.deepEqual(ret.data, items)
})

test('should call action handler with sources, datatypes, workers, and dispatch', async (t) => {
  const action = {type: 'GET_ONE'}
  const getHandler = sinon.stub().returns(Promise.resolve({status: 'ok'}))
  const actions = {'GET_ONE': getHandler}
  const sources = {}
  const datatypes = {}
  const workers = {}
  const dispatch = () => {}

  await router(action, {actions, sources, datatypes, workers, dispatch})

  t.true(getHandler.calledOnce)
  const resources = getHandler.args[0][1]
  t.is(resources.sources, sources)
  t.is(resources.datatypes, datatypes)
  t.is(resources.workers, workers)
  t.is(resources.dispatch, dispatch)
})

// Tests -- queue

test('should add action to queue', async (t) => {
  const action = {
    type: 'SET',
    payload: {
      source: 'store'
    },
    queue: true
  }
  const pushToQueue = sinon.stub().returns(Promise.resolve(true))
  const actions = {
    'SET': async () => ({status: 'ok'})
  }

  const ret = await router(action, {pushToQueue, actions})

  t.deepEqual(ret, {status: 'queued'})
  t.true(pushToQueue.calledOnce)
  const pushed = pushToQueue.args[0][0]
  t.truthy(pushed)
  t.is(pushed.type, 'SET')
  t.deepEqual(pushed.payload, {source: 'store'})
  t.false(pushed.queue)
  const timestamp = pushToQueue.args[0][1]
  t.is(timestamp, null)
})

test('should schedule action', async (t) => {
  const action = {
    type: 'SET',
    payload: {
      source: 'store'
    },
    queue: new Date('2017-09-01T09:00:00Z')
  }
  const pushToQueue = sinon.stub().returns(Promise.resolve(true))
  const actions = {
    'SET': async () => ({status: 'ok'})
  }

  const ret = await router(action, {pushToQueue, actions})

  t.deepEqual(ret, {status: 'queued'})
  t.true(pushToQueue.calledOnce)
  const pushed = pushToQueue.args[0][0]
  t.false(pushed.queue)
  const timestamp = pushToQueue.args[0][1]
  t.is(new Date(timestamp).getTime(), 1504256400000)
})

test('should return error when queueing fails', async (t) => {
  const action = {
    type: 'SET',
    payload: {
      source: 'store'
    },
    queue: true
  }
  const pushToQueue = sinon.stub().returns(Promise.resolve(false))
  const actions = {
    'SET': async () => ({status: 'ok'})
  }

  const ret = await router(action, {pushToQueue, actions})

  t.deepEqual(ret, {status: 'error'})
})

test('should reschedule action', async (t) => {
  const schedule = {schedules: [{h: [2]}]}
  const action = {
    type: 'RUN',
    queue: false,
    schedule,
    payload: {worker: 'sync'}
  }
  const nextTime = later.schedule(schedule).next().getTime()
  const pushToQueue = sinon.stub().returns(Promise.resolve(true))
  const run = sinon.stub().returns(Promise.resolve({status: 'ok'}))
  const actions = {'RUN': run}

  const ret = await router(action, {pushToQueue, actions})

  t.deepEqual(ret, {status: 'ok'})
  t.true(run.calledOnce)
  t.true(pushToQueue.calledOnce)
  const reaction = pushToQueue.args[0][0]
  const timestamp = pushToQueue.args[0][1]
  t.deepEqual(reaction, action)
  t.truthy(timestamp)
  t.is(timestamp.getTime(), nextTime)
})

test('should not reschedule when schedule is ended', async (t) => {
  const action = {
    type: 'RUN',
    queue: false,
    schedule: {schedules: [{Y_b: [2015]}]},
    payload: {worker: 'sync'}
  }
  const pushToQueue = sinon.stub().returns(Promise.resolve(true))
  const actions = {'RUN': async () => ({status: 'ok'})}

  await router(action, {pushToQueue, actions})

  t.false(pushToQueue.called)
})
