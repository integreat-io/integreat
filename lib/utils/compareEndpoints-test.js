import test from 'ava'

import compareEndpoints from './compareEndpoints'

// Helpers

const endpointCatchAll = {}
const endpointGet = {action: 'GET'}
const endpointPut = {action: 'PUT'}
const endpointPostAndPut = {action: ['POST', 'PUT']}
const endpointPostAndDelete = {action: ['POST', 'DELETE']}
const endpointPostPutAndDelete = {action: ['POST', 'PUT', 'DELETE']}
const endpointMember = {scope: 'member'}
const endpointCollection = {scope: 'collection'}
const endpointMemberAndCollection = {scope: ['member', 'collection']}
const endpointEntry = {type: 'entry'}
const endpointUser = {type: 'user'}
const endpointUserAndEntry = {type: ['user', 'entry']}
const endpointEntryAndItem = {type: ['entry', 'item']}
const endpointGetMember = {scope: 'member', action: 'GET'}
const endpointGetEntryMember = {type: 'entry', scope: 'member', action: 'GET'}
const endpointAuthorParam = {params: {author: true}}
const endpointSourceParam = {params: {source: true}}
const endpointSourceParamOptional = {params: {source: false}}
const endpointSourceAuthorParams = {params: {source: true, author: false}}
const endpointGetWithParam = {action: 'GET', params: {author: true}}
const endpointMemberWithParam = {scope: 'member', params: {author: true}}
const endpointEntryWithParam = {type: 'entry', params: {author: true}}

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
  const scopeVsAll = compareEndpoints(endpointMember, endpointUser)
  const scopeActionVsAll = compareEndpoints(endpointGetMember, endpointGetEntryMember)
  const scopeActionVsType = compareEndpoints(endpointGetMember, endpointEntry)

  t.true(scopeVsAll > 0)
  t.true(scopeActionVsAll > 0)
  t.true(scopeActionVsType > 0)
})

test('should sort type before type array', (t) => {
  const higher = compareEndpoints(endpointUser, endpointUserAndEntry)
  const equal = compareEndpoints(endpointUserAndEntry, endpointEntryAndItem)
  const lower = compareEndpoints(endpointEntryAndItem, endpointUser)

  t.true(higher < 0)
  t.is(equal, 0)
  t.true(lower > 0)
})

test('should sort scope before scope array', (t) => {
  const higher = compareEndpoints(endpointMember, endpointMemberAndCollection)
  const equal = compareEndpoints(endpointMemberAndCollection, endpointMemberAndCollection)
  const lower = compareEndpoints(endpointMemberAndCollection, endpointCollection)

  t.true(higher < 0)
  t.is(equal, 0)
  t.true(lower > 0)
})

test('should sort action before action array', (t) => {
  const higher = compareEndpoints(endpointGet, endpointPostAndDelete)
  const equal = compareEndpoints(endpointPostAndDelete, endpointPostAndPut)
  const lower = compareEndpoints(endpointPostAndPut, endpointPut)

  t.true(higher < 0)
  t.is(equal, 0)
  t.true(lower > 0)
})

test('should sort action before action array', (t) => {
  const twoVsThree = compareEndpoints(endpointPostAndDelete, endpointPostPutAndDelete)

  t.true(twoVsThree < 0)
})

test('should sort more params before fewer', (t) => {
  const higher = compareEndpoints(endpointSourceAuthorParams, endpointAuthorParam)
  const equal = compareEndpoints(endpointSourceParam, endpointAuthorParam)
  const lower = compareEndpoints(endpointSourceParam, endpointSourceAuthorParams)

  t.true(higher < 0)
  t.is(equal, 0)
  t.true(lower > 0)
})

test('should sort params after type', (t) => {
  const paramVsType = compareEndpoints(endpointSourceParam, endpointEntry)
  const paramVsScope = compareEndpoints(endpointSourceParam, endpointMember)
  const paramVsAction = compareEndpoints(endpointSourceParam, endpointPut)

  t.true(paramVsType > 0)
  t.true(paramVsScope < 0)
  t.true(paramVsAction < 0)
})

test('should sort with params before without', (t) => {
  const typeWithVsWithout = compareEndpoints(endpointEntryWithParam, endpointEntry)
  const scopeWithVsWithout = compareEndpoints(endpointMemberWithParam, endpointMember)
  const actionWithVsWithout = compareEndpoints(endpointGetWithParam, endpointGet)

  t.true(typeWithVsWithout < 0)
  t.true(scopeWithVsWithout < 0)
  t.true(actionWithVsWithout < 0)
})

test('should sort required params before optional', (t) => {
  const requiredVsOptional = compareEndpoints(endpointSourceParamOptional, endpointAuthorParam)

  t.true(requiredVsOptional > 0)
})
