import test from 'ava'
import compareEndpoints from './compareEndpoints'

import getEndpoint from './getEndpoint'

// Helpers

const endpointCatchAll = {}
const endpointGet = {action: 'GET'}
const endpointPut = {action: 'PUT'}
const endpointPost = {action: 'POST'}
const endpointPostAndDelete = {action: ['POST', 'DELETE']}
const endpointMember = {scope: 'member'}
const endpointMembers = {scope: 'members'}
const endpointCollection = {scope: 'collection'}
const endpointMemberAndCollection = {scope: ['member', 'collection']}
const endpointEntry = {type: 'entry'}
const endpointUser = {type: 'user'}
const endpointEntryAndItem = {type: ['entry', 'item']}
const endpointGetMember = {scope: 'member', action: 'GET'}
const endpointGetEntryMember = {type: 'entry', scope: 'member', action: 'GET'}
const endpointWithId = {id: 'endpoint1'}
const endpointGetWithAuthor = {action: 'GET', params: {author: true}}
const endpointPostWithAuthor = {action: 'POST', params: {author: true}}
const endpointGetWithOptionalAuthor = {action: 'GET', params: {author: false}}

const sort = (endpoints) => endpoints.sort(compareEndpoints)

// Tests

test('should exist', (t) => {
  t.is(typeof getEndpoint, 'function')
})

test('should return first catch-all endpoint', (t) => {
  const endpoints = sort([endpointCatchAll])
  const request = {action: 'GET', params: {type: 'entry'}}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointCatchAll)
})

test('should return undefined when no endpoints', (t) => {
  const endpoints = []
  const request = {action: 'GET', params: {type: 'entry'}}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, undefined)
})

test('should return endpoint based on action', (t) => {
  const endpoints = sort([endpointCatchAll, endpointGet, endpointPut])
  const request = {action: 'GET', params: {type: 'entry'}}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointGet)
})

test('should return endpoint based on action array', (t) => {
  const endpoints = sort([endpointCatchAll, endpointPut, endpointPostAndDelete])
  const request = {action: 'POST', params: {type: 'entry'}}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointPostAndDelete)
})

test('should return endpoint with single match before array', (t) => {
  const endpoints = sort([endpointCatchAll, endpointPostAndDelete, endpointPost])
  const request = {action: 'POST', params: {type: 'entry'}}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointPost)
})

test('should return endpoint based on member scope', (t) => {
  const endpoints = sort([endpointCatchAll, endpointCollection, endpointMember])
  const request = {action: 'GET', params: {id: 'ent1', type: 'entry'}}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointMember)
})

test('should return endpoint based on members scope', (t) => {
  const endpoints = sort([endpointMember, endpointCollection, endpointMembers])
  const request = {action: 'GET', params: {id: ['ent1', 'ent2'], type: 'entry'}}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointMembers)
})

test('should return endpoint based on collection scope', (t) => {
  const endpoints = sort([endpointCatchAll, endpointMember, endpointCollection])
  const request = {action: 'GET', params: {type: 'entry'}}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointCollection)
})

test('should return endpoint based on scope array', (t) => {
  const endpoints = sort([endpointCatchAll, endpointMemberAndCollection])
  const request = {action: 'GET', params: {type: 'entry'}}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointMemberAndCollection)
})

test('should return endpoint based on type', (t) => {
  const endpoints = sort([endpointCatchAll, endpointUser, endpointEntry])
  const request = {action: 'GET', params: {type: 'entry'}}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointEntry)
})

test('should return endpoint based on type array', (t) => {
  const endpoints = sort([endpointCatchAll, endpointUser, endpointEntryAndItem])
  const request = {action: 'GET', params: {type: 'entry'}}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointEntryAndItem)
})

test('should return endpoint based on specificity', (t) => {
  const endpoints = sort([endpointGetMember, endpointCatchAll, endpointEntry, endpointGetEntryMember])
  const request = {action: 'GET', params: {id: 'ent1', type: 'entry'}}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointGetEntryMember)
})

test('should return endpoint based on matching over specificity', (t) => {
  const endpoints = sort([endpointGetMember, endpointCatchAll, endpointUser, endpointGetEntryMember])
  const request = {action: 'GET', params: {type: 'user'}}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointUser)
})

test('should return endpoint with the given id', (t) => {
  const endpoints = sort([endpointCatchAll, endpointWithId, endpointGetEntryMember])
  const request = {action: 'GET', params: {id: 'ent1', type: 'entry'}, endpoint: 'endpoint1'}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointWithId)
})

test('should match when required params is present', (t) => {
  const endpoints = sort([endpointGet, endpointPostWithAuthor, endpointGetWithAuthor])
  const request = {action: 'GET', params: {author: 'johnf', type: 'entry'}}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointGetWithAuthor)
})

test('should not match when required params is missing', (t) => {
  const endpoints = sort([endpointGet, endpointPostWithAuthor, endpointGetWithAuthor])
  const request = {action: 'GET', type: 'entry'}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointGet)
})

test('should match when optional params is missing', (t) => {
  const endpoints = sort([endpointGet, endpointGetWithAuthor, endpointGetWithOptionalAuthor])
  const request = {action: 'GET', params: {type: 'entry'}}

  const ret = getEndpoint(endpoints, request)

  t.is(ret, endpointGetWithOptionalAuthor)
})
