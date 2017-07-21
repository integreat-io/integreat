import test from 'ava'
import sinon from 'sinon'

import sync from './sync'

test('should exist', (t) => {
  t.is(typeof sync, 'function')
})

test('should dispatch GET to source', async (t) => {
  const dispatch = sinon.stub().returns(Promise.resolve({status: 'ok'}))
  const expected = {
    type: 'GET',
    payload: {
      source: 'users',
      type: 'user'
    }
  }
  const def = {
    from: 'users',
    to: 'store',
    type: 'user',
    retrieve: 'all'
  }

  await sync(def, dispatch)

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
  const expected1 = {type: 'SET', queue: true, payload: {source: 'store', data: johnData}}
  const expected2 = {type: 'SET', queue: true, payload: {source: 'store', data: jennyData}}
  const def = {
    from: 'users',
    to: 'store',
    type: 'user',
    retrieve: 'all'
  }

  await sync(def, dispatch)

  t.true(dispatch.calledThrice)
  const action1 = dispatch.args[1][0]
  const action2 = dispatch.args[2][0]
  t.deepEqual(action1, expected1)
  t.deepEqual(action2, expected2)
})
