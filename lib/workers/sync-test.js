import test from 'ava'
import sinon from 'sinon'

import sync from './sync'

test('should exist', (t) => {
  t.is(typeof sync, 'function')
})

test('should return a function', (t) => {
  const job = sync()

  t.is(typeof job, 'function')
})

test('should dispatch GET_ALL to source', async (t) => {
  const dispatch = sinon.stub().returns(Promise.resolve({status: 'ok'}))
  const expected = {
    type: 'GET_ALL',
    source: 'users',
    payload: {type: 'user'}
  }
  const def = {
    source: 'users',
    target: 'store',
    type: 'user',
    retrieve: 'all'
  }

  const job = sync(dispatch)
  await job(def)

  t.true(dispatch.calledOnce)
  const action = dispatch.args[0][0]
  t.deepEqual(action, expected)
})

test('should dispatch SET to target', async (t) => {
  const johnData = {id: 'john', type: 'user', attributes: {name: 'John'}}
  const jennyData = {id: 'jenny', type: 'user', attributes: {name: 'Jenny'}}
  const dispatch = sinon.stub()
  dispatch.onCall(0).returns(Promise.resolve({status: 'ok', data: [johnData, jennyData]}))
  dispatch.returns(Promise.resolve({status: 'ok'}))
  const expected1 = {type: 'SET', source: 'store', payload: johnData}
  const expected2 = {type: 'SET', source: 'store', payload: jennyData}
  const def = {
    source: 'users',
    target: 'store',
    type: 'user',
    retrieve: 'all'
  }

  const job = sync(dispatch)
  await job(def)

  t.true(dispatch.calledThrice)
  const action1 = dispatch.args[1][0]
  const action2 = dispatch.args[2][0]
  t.deepEqual(action1, expected1)
  t.deepEqual(action2, expected2)
})
