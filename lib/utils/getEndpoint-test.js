import test from 'ava'
import compareEndpoints from './compareEndpoints'

import getEndpoint from './getEndpoint'

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
const endpointWithId = {id: 'endpoint1'}

const sort = (endpoints) => endpoints.sort(compareEndpoints)

// Tests

test('should exist', (t) => {
  t.is(typeof getEndpoint, 'function')
})

test('should return first catch-all endpoint', (t) => {
  const endpoints = sort([endpointCatchAll])
  const request = {action: 'GET', type: 'entry'}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointCatchAll)
})

test('should return undefined when no endpoints', (t) => {
  const endpoints = []
  const request = {action: 'GET', type: 'entry'}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, undefined)
})

test('should return endpoint based on action', (t) => {
  const endpoints = sort([endpointCatchAll, endpointGet, endpointPut])
  const request = {action: 'GET', type: 'entry'}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointGet)
})

test('should return endpoint based on member scope', (t) => {
  const endpoints = sort([endpointCatchAll, endpointCollection, endpointMember])
  const request = {action: 'GET', type: 'entry', id: 'ent1'}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointMember)
})

test('should return endpoint based on collection scope', (t) => {
  const endpoints = sort([endpointCatchAll, endpointMember, endpointCollection])
  const request = {action: 'GET', type: 'entry'}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointCollection)
})

test('should return endpoint based on type scope', (t) => {
  const endpoints = sort([endpointCatchAll, endpointUser, endpointEntry])
  const request = {action: 'GET', type: 'entry'}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointEntry)
})

test('should return endpoint based on specificity', (t) => {
  const endpoints = sort([endpointGetMember, endpointCatchAll, endpointEntry, endpointGetEntryMember])
  const request = {action: 'GET', type: 'entry', id: 'ent1'}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointGetEntryMember)
})

test('should return endpoint based on matching over specificity', (t) => {
  const endpoints = sort([endpointGetMember, endpointCatchAll, endpointUser, endpointGetEntryMember])
  const request = {action: 'GET', type: 'user'}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointUser)
})

test('should return endpoint with the given id', (t) => {
  const endpoints = sort([endpointCatchAll, endpointWithId, endpointGetEntryMember])
  const request = {action: 'GET', type: 'entry', id: 'ent1', endpoint: 'endpoint1'}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointWithId)
})
