import test from 'ava'
import compareEndpoints from './compareEndpoints'

import matchEndpoint from './matchEndpoint'

// Helpers

const filterNotDraft = ({ data } = {}) => data && data.attributes && data.attributes.draft === false
const filterEntry1 = ({ data } = {}) => data && data.attributes && data.attributes.title === 'Entry 1'
const filterParamAuthor = ({ params } = {}) => params && params.author === 'johnf'
const filterMetaRootIdent = ({ meta } = {}) => meta && meta.ident && meta.ident.root

const endpointCatchAll = {}
const endpointGet = { match: { action: 'GET' } }
const endpointPut = { match: { action: 'PUT' } }
const endpointPost = { match: { action: 'POST' } }
const endpointPostAndDelete = { match: { action: ['POST', 'DELETE'] } }
const endpointMember = { match: { scope: 'member' } }
const endpointMembers = { match: { scope: 'members' } }
const endpointCollection = { match: { scope: 'collection' } }
const endpointMemberAndCollection = { match: { scope: ['member', 'collection'] } }
const endpointEntry = { match: { type: 'entry' } }
const endpointUser = { match: { type: 'user' } }
const endpointEntryAndItem = { match: { type: ['entry', 'item'] } }
const endpointGetMember = { match: { scope: 'member', action: 'GET' } }
const endpointGetEntryMember = { match: { type: 'entry', scope: 'member', action: 'GET' } }
const endpointWithId = { id: 'endpoint1' }
const endpointGetWithAuthor = { match: { action: 'GET', params: { author: true } } }
const endpointPostWithAuthor = { match: { action: 'POST', params: { author: true } } }
const endpointGetWithOptionalAuthor = { match: { action: 'GET', params: { author: false } } }
const endpointPostWithFilter = { match: { action: 'POST', filters: [filterNotDraft] } }
const endpointPostWithFilters = { match: { action: 'POST', filters: [filterNotDraft, filterEntry1] } }
const endpointPostWithNoFilters = { match: { action: 'POST', filters: [] } }
const endpointPostWithParamFilter = { match: { action: 'POST', filters: [filterParamAuthor] } }
const endpointPostWithMetaFilter = { match: { action: 'POST', filters: [filterMetaRootIdent] } }

const sort = (endpoints) => endpoints.sort(compareEndpoints)

// Tests

test('should return first catch-all endpoint', (t) => {
  const endpoints = sort([endpointCatchAll])
  const action = { type: 'GET', payload: { type: 'entry' } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointCatchAll)
})

test('should return undefined when no endpoints', (t) => {
  const endpoints = []
  const action = { type: 'GET', payload: { type: 'entry' } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, undefined)
})

test('should return endpoint based on action', (t) => {
  const endpoints = sort([endpointCatchAll, endpointGet, endpointPut])
  const action = { type: 'GET', payload: { type: 'entry' } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointGet)
})

test('should return endpoint based on action array', (t) => {
  const endpoints = sort([endpointCatchAll, endpointPut, endpointPostAndDelete])
  const action = { type: 'POST', payload: { type: 'entry' } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointPostAndDelete)
})

test('should return endpoint with single match before array', (t) => {
  const endpoints = sort([endpointCatchAll, endpointPostAndDelete, endpointPost])
  const action = { type: 'POST', payload: { type: 'entry' } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointPost)
})

test('should return endpoint based on member scope', (t) => {
  const endpoints = sort([endpointCatchAll, endpointCollection, endpointMember])
  const action = { type: 'GET', payload: { id: 'ent1', type: 'entry' } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointMember)
})

test('should return endpoint based on members scope', (t) => {
  const endpoints = sort([endpointMember, endpointCollection, endpointMembers])
  const action = { type: 'GET', payload: { id: ['ent1', 'ent2'], type: 'entry' } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointMembers)
})

test('should return endpoint based on collection scope', (t) => {
  const endpoints = sort([endpointCatchAll, endpointMember, endpointCollection])
  const action = { type: 'GET', payload: { type: 'entry' } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointCollection)
})

test('should return endpoint based on scope array', (t) => {
  const endpoints = sort([endpointCatchAll, endpointMemberAndCollection])
  const action = { type: 'GET', payload: { type: 'entry' } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointMemberAndCollection)
})

test('should return endpoint based on type', (t) => {
  const endpoints = sort([endpointCatchAll, endpointUser, endpointEntry])
  const action = { type: 'GET', payload: { type: 'entry' } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointEntry)
})

test('should return endpoint based on type array', (t) => {
  const endpoints = sort([endpointCatchAll, endpointUser, endpointEntryAndItem])
  const action = { type: 'GET', payload: { type: 'entry' } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointEntryAndItem)
})

test('should return endpoint based on specificity', (t) => {
  const endpoints = sort([endpointGetMember, endpointCatchAll, endpointEntry, endpointGetEntryMember])
  const action = { type: 'GET', payload: { id: 'ent1', type: 'entry' } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointGetEntryMember)
})

test('should return endpoint based on matching over specificity', (t) => {
  const endpoints = sort([endpointGetMember, endpointCatchAll, endpointUser, endpointGetEntryMember])
  const action = { type: 'GET', payload: { type: 'user' } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointUser)
})

test('should return endpoint with the given id', (t) => {
  const endpoints = sort([endpointCatchAll, endpointWithId, endpointGetEntryMember])
  const action = { type: 'GET', payload: { id: 'ent1', type: 'entry', endpoint: 'endpoint1' } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointWithId)
})

test('should match when required params is present', (t) => {
  const endpoints = sort([endpointGet, endpointPostWithAuthor, endpointGetWithAuthor])
  const action = { type: 'GET', payload: { author: 'johnf', type: 'entry' } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointGetWithAuthor)
})

test('should not match when required params is missing', (t) => {
  const endpoints = sort([endpointGet, endpointPostWithAuthor, endpointGetWithAuthor])
  const action = { type: 'GET', payload: { type: 'entry' } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointGet)
})

test('should match when optional params is missing', (t) => {
  const endpoints = sort([endpointGet, endpointGetWithAuthor, endpointGetWithOptionalAuthor])
  const action = { type: 'GET', payload: { type: 'entry' } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointGetWithOptionalAuthor)
})

test('should match when filter is validated', (t) => {
  const endpoints = sort([endpointPost, endpointPostWithFilter, endpointCatchAll])
  const action = { type: 'POST', payload: { data: { type: 'entry', attributes: { title: 'Entry 1', draft: false } } } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointPostWithFilter)
})

test('should not match when filter is invalidated', (t) => {
  const endpoints = sort([endpointPost, endpointPostWithFilter, endpointCatchAll])
  const action = { type: 'POST', payload: { data: { type: 'entry', attributes: { title: 'Entry 1', draft: true } } } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointPost)
})

test('should match when all filters are validated', (t) => {
  const endpoints = sort([endpointPostWithFilter, endpointPostWithFilters, endpointCatchAll])
  const action = { type: 'POST', payload: { data: { type: 'entry', attributes: { title: 'Entry 1', draft: false } } } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointPostWithFilters)
})

test('should not match when one filter is invalidated', (t) => {
  const endpoints = sort([endpointPostWithFilter, endpointPostWithFilters, endpointCatchAll])
  const action = { type: 'POST', payload: { data: { type: 'entry', attributes: { title: 'Entry 2', draft: false } } } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointPostWithFilter)
})

test('should match when no filters', (t) => {
  const endpoints = sort([endpointPostWithFilter, endpointPostWithNoFilters, endpointCatchAll])
  const action = { type: 'POST', payload: { data: { type: 'entry', attributes: { title: 'Entry 1', draft: true } } } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointPostWithNoFilters)
})

test('should match with params filter', (t) => {
  const endpoints = sort([endpointPostWithFilter, endpointPostWithParamFilter, endpointCatchAll])
  const action = { type: 'POST', payload: { author: 'johnf', data: { type: 'entry', attributes: { title: 'Entry 1', draft: true } } } }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointPostWithParamFilter)
})

test('should match with meta filter', (t) => {
  const endpoints = sort([endpointPostWithFilter, endpointPostWithMetaFilter, endpointCatchAll])
  const action = {
    type: 'POST',
    payload: { data: { type: 'entry', attributes: { title: 'Entry 1', draft: true } } },
    meta: { ident: { root: true } }
  }

  const ret = matchEndpoint(endpoints)(action)

  t.is(ret, endpointPostWithMetaFilter)
})
