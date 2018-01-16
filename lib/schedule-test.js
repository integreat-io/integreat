import test from 'ava'
import sinon from 'sinon'
import later from 'later'

import schedule from './schedule'

test('should exist', (t) => {
  t.is(typeof schedule, 'function')
})

test('should queue scheduled actions', async (t) => {
  const queue = sinon.stub().resolves({status: 'queue'})
  const queueTime = later.schedule({schedules: [{h: [2]}]}).next().getTime()
  const defs = [
    {schedule: 'at 2:00 am', job: {worker: 'sync'}},
    {schedule: {h: [3]}, job: {worker: 'cleanup'}}
  ]
  const expected1 = [{t: [7200]}]

  await schedule(defs, queue)

  t.is(queue.callCount, 2)
  const action1 = queue.args[0][0]
  t.is(action1.type, 'RUN')
  t.truthy(action1.schedule)
  t.deepEqual(action1.schedule.schedules, expected1)
  t.deepEqual(action1.payload, {worker: 'sync'})
  t.is(queue.args[0][1].getTime(), queueTime)
  const action2 = queue.args[1][0]
  t.truthy(action2.payload)
  t.is(action2.payload.worker, 'cleanup')
})

test('should return promises of return objects', async (t) => {
  const queue = sinon.stub().resolves({status: 'queue'})
  const defs = [{schedule: 'at 2:00 am', job: {worker: 'sync'}}]

  const ret = await schedule(defs, queue)

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  t.deepEqual(ret[0], {status: 'queue'})
})

test('should queue with no schedule', async (t) => {
  const queue = sinon.stub().resolves({status: 'queue'})
  const defs = [{job: {worker: 'sync'}}]

  await schedule(defs, queue)

  t.is(queue.callCount, 1)
  const action = queue.args[0][0]
  t.is(action.type, 'RUN')
  t.is(action.schedule, null)
  t.deepEqual(action.payload, {worker: 'sync'})
  t.is(queue.args[0][1], null)
})

test('should return error for invalid schedule', async (t) => {
  const queue = sinon.stub().resolves({status: 'queued'})
  const defs = [{schedule: {x: [3]}}]

  const ret = await schedule(defs, queue)

  t.is(ret.length, 1)
  t.is(ret[0].status, 'error')
})

test('should return error for invalid string schedule', async (t) => {
  const queue = sinon.stub().resolves({status: 'queued'})
  const defs = [{schedule: 'invalid'}]

  const ret = await schedule(defs, queue)

  t.is(ret.length, 1)
  t.is(ret[0].status, 'error')
})

// Tests -- reschedule

// test('should reschedule action', async (t) => {
//   const schedule = {schedules: [{h: [2]}]}
//   const action = {
//     type: 'RUN',
//     schedule,
//     payload: {worker: 'sync'}
//   }
//   const nextTime = later.schedule(schedule).next().getTime()
//   const queue = sinon.stub().resolves(34)
//   const run = sinon.stub().resolves({status: 'ok'})
//   const actions = {'RUN': run}
//
//   const ret = await router(action, {queue, actions})
//
//   t.deepEqual(ret, {status: 'ok'})
//   t.is(run.callCount, 1)
//   t.is(queue.callCount, 1)
//   const reaction = queue.args[0][0]
//   const timestamp = queue.args[0][1]
//   t.deepEqual(reaction, action)
//   t.truthy(timestamp)
//   t.is(timestamp.getTime(), nextTime)
// })
//
// test('should not reschedule when schedule is ended', async (t) => {
//   const action = {
//     type: 'RUN',
//     schedule: {schedules: [{Y_b: [2015]}]},
//     payload: {worker: 'sync'}
//   }
//   const queue = sinon.stub().resolves(35)
//   const actions = {'RUN': async () => ({status: 'ok'})}
//
//   await router(action, {queue, actions})
//
//   t.is(queue.callCount, 0)
// })
