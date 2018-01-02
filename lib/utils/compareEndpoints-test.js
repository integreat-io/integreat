import test from 'ava'

import compareEndpoints from './compareEndpoints'

// Helpers

const endpointCatchAll = {}
const endpointGet = {action: 'GET'}
const endpointPut = {action: 'PUT'}
const endpointMember = {scope: 'member'}
const endpointCollection = {scope: 'collection'}
const endpointEntry = {type: 'entry'}
const endpointUser = {type: 'user'}
const endpointGetMember = {scope: 'member', action: 'GET'}
const endpointGetEntryMember = {type: 'entry', scope: 'member', action: 'GET'}

// Tests

test('should exist', (t) => {
  t.is(typeof compareEndpoints, 'function')
})

test('should compare based on action', (t) => {
  const higher = compareEndpoints(endpointGet, endpointCatchAll)
  const equal = compareEndpoints(endpointGet, endpointPut)
  const lower = compareEndpoints(endpointCatchAll, endpointPut)

  t.true(higher < 0)
  t.is(equal, 0)
  t.true(lower > 0)
})

test('should compare based on scope', (t) => {
  const higher = compareEndpoints(endpointMember, endpointCatchAll)
  const equal = compareEndpoints(endpointMember, endpointCollection)
  const lower = compareEndpoints(endpointCatchAll, endpointCollection)

  t.true(higher < 0)
  t.is(equal, 0)
  t.true(lower > 0)
})

test('should compare based on type', (t) => {
  const higher = compareEndpoints(endpointEntry, endpointCatchAll)
  const equal = compareEndpoints(endpointEntry, endpointUser)
  const lower = compareEndpoints(endpointCatchAll, endpointUser)

  t.true(higher < 0)
  t.is(equal, 0)
  t.true(lower > 0)
})

test('should sort in the order type, scope, and action', (t) => {
  const typeVsScope = compareEndpoints(endpointMember, endpointEntry)
  const typeVsAction = compareEndpoints(endpointGet, endpointEntry)
  const scopeVsAction = compareEndpoints(endpointGet, endpointMember)

  t.true(typeVsScope > 0)
  t.true(typeVsAction > 0)
  t.true(scopeVsAction > 0)
})

test('should compare based on specificity', (t) => {
  const scopeVsAll = compareEndpoints(endpointMember, endpointGetEntryMember)
  const scopeActionVsAll = compareEndpoints(endpointGetMember, endpointGetEntryMember)
  const scopeActionVsType = compareEndpoints(endpointGetMember, endpointEntry)

  t.true(scopeVsAll > 0)
  t.true(scopeActionVsAll > 0)
  t.true(scopeActionVsType > 0)
})
