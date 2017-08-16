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

test('should call action handler with sources, datatypes, workers, dispatch, and queue', async (t) => {
  const action = {type: 'GET_ONE'}
  const getHandler = sinon.stub().returns(Promise.resolve({status: 'ok'}))
  const actions = {'GET_ONE': getHandler}
  const sources = {}
  const datatypes = {}
  const workers = {}
  const dispatch = () => {}
  const queue = () => {}

  await router(action, {actions, sources, datatypes, workers, dispatch, queue})

  t.true(getHandler.calledOnce)
  const resources = getHandler.args[0][1]
  t.is(resources.sources, sources)
  t.is(resources.datatypes, datatypes)
  t.is(resources.workers, workers)
  t.is(resources.dispatch, dispatch)
  t.is(resources.queue, queue)
})

// Tests -- reschedule

test('should reschedule action', async (t) => {
  const schedule = {schedules: [{h: [2]}]}
  const action = {
    type: 'RUN',
    schedule,
    payload: {worker: 'sync'}
  }
  const nextTime = later.schedule(schedule).next().getTime()
  const queue = sinon.stub().resolves(34)
  const run = sinon.stub().resolves({status: 'ok'})
  const actions = {'RUN': run}

  const ret = await router(action, {queue, actions})

  t.deepEqual(ret, {status: 'ok'})
  t.is(run.callCount, 1)
  t.is(queue.callCount, 1)
  const reaction = queue.args[0][0]
  const timestamp = queue.args[0][1]
  t.deepEqual(reaction, action)
  t.truthy(timestamp)
  t.is(timestamp.getTime(), nextTime)
})

test('should not reschedule when schedule is ended', async (t) => {
  const action = {
    type: 'RUN',
    schedule: {schedules: [{Y_b: [2015]}]},
    payload: {worker: 'sync'}
  }
  const queue = sinon.stub().resolves(35)
  const actions = {'RUN': async () => ({status: 'ok'})}

  await router(action, {queue, actions})

  t.is(queue.callCount, 0)
})
