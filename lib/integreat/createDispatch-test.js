import test from 'ava'
import sinon from 'sinon'

import createDispatch from './createDispatch'

test('should exist', (t) => {
  t.is(typeof createDispatch, 'function')
})

test('should call actionHandler with action and getSource', (t) => {
  const actionHandler = sinon.spy()
  const getSource = () => {}
  const action = {type: 'GET', payload: {}}

  const dispatch = createDispatch(actionHandler, getSource)
  dispatch(action)

  t.true(actionHandler.calledOnce)
  t.true(actionHandler.calledWith(action, getSource))
})

test('should throw when no actionHandler', (t) => {
  const getSource = () => {}

  t.throws(() => {
    createDispatch(null, getSource)
  })
})

test('should throw when no getSource', (t) => {
  const actionHandler = () => {}

  t.throws(() => {
    createDispatch(actionHandler, null)
  })
})

test('should return promise of results', async (t) => {
  const items = [{id: 'ent1', type: 'entry'}]
  const actionHandler = async () => items
  const dispatch = createDispatch(actionHandler, () => ({}))

  const ret = await dispatch({type: 'GET'})

  t.deepEqual(ret, items)
})
