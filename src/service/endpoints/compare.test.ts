import test from 'ava'

import compareEndpoints from './compare'

// Helpers

const draftFilter = { 'request.data.draft': { const: false } }
const titleFilter = { 'request.data.title': { const: 'Entry 1' } }

const endpointCatchAll = {}
const endpointGet = { match: { action: 'GET' } }
const endpointPut = { match: { action: 'PUT' } }
const endpointPostAndPut = { match: { action: ['POST', 'PUT'] } }
const endpointPostAndDelete = { match: { action: ['POST', 'DELETE'] } }
const endpointPostPutAndDelete = {
  match: { action: ['POST', 'PUT', 'DELETE'] }
}
const endpointMember = { match: { scope: 'member' } }
const endpointCollection = { match: { scope: 'collection' } }
const endpointMemberAndCollection = {
  match: { scope: ['member', 'collection'] }
}
const endpointEntry = { match: { type: 'entry' } }
const endpointUser = { match: { type: 'user' } }
const endpointUserAndEntry = { match: { type: ['user', 'entry'] } }
const endpointEntryAndItem = { match: { type: ['entry', 'item'] } }
const endpointGetMember = { match: { scope: 'member', action: 'GET' } }
const endpointGetEntryMember = {
  match: { type: 'entry', scope: 'member', action: 'GET' }
}
const endpointAuthorParam = { match: { params: { author: true } } }
const endpointServiceParam = { match: { params: { service: true } } }
const endpointServiceParamOptional = { match: { params: { service: false } } }
const endpointServiceAuthorParams = {
  match: { params: { service: true, author: false } }
}
const endpointGetWithParam = {
  match: { action: 'GET', params: { author: true } }
}
const endpointMemberWithParam = {
  match: { scope: 'member', params: { author: true } }
}
const endpointEntryWithParam = {
  match: { type: 'entry', params: { author: true } }
}
const endpointOneFilter = { match: { filters: draftFilter } }
const endpointMemberWithFilter = {
  match: { scope: 'member', filters: draftFilter }
}
const endpointGetWithFilter = {
  match: { action: 'GET', filters: draftFilter }
}
const endpointServiceParamWithFilter = {
  match: { params: { service: true }, filters: draftFilter }
}
const endpointUserWithFilter = {
  match: { type: 'user', filters: draftFilter }
}
const endpointEntryWithFilter = {
  match: { type: 'entry', filters: draftFilter }
}
const endpointEntryWithTwoFilters = {
  match: { type: 'entry', filters: { ...draftFilter, ...titleFilter } }
}
const endpointId = {
  id: 'endpoint1',
  match: { params: { includeDocs: false } }
}

// Tests

test('should compare based on action', t => {
  const higher = compareEndpoints(endpointGet, endpointCatchAll)
  const equal = compareEndpoints(endpointGet, endpointPut)
  const lower = compareEndpoints(endpointCatchAll, endpointPut)

  t.true(higher < 0)
  t.is(equal, 0)
  t.true(lower > 0)
})

test('should compare based on scope', t => {
  const higher = compareEndpoints(endpointMember, endpointCatchAll)
  const equal = compareEndpoints(endpointMember, endpointCollection)
  const lower = compareEndpoints(endpointCatchAll, endpointCollection)

  t.true(higher < 0)
  t.is(equal, 0)
  t.true(lower > 0)
})

test('should compare based on type', t => {
  const higher = compareEndpoints(endpointEntry, endpointCatchAll)
  const equal = compareEndpoints(endpointEntry, endpointUser)
  const lower = compareEndpoints(endpointCatchAll, endpointUser)

  t.true(higher < 0)
  t.is(equal, 0)
  t.true(lower > 0)
})

test('should sort in the order type, scope, action, and id', t => {
  const scopeVsType = compareEndpoints(endpointMember, endpointEntry)
  const actionVsType = compareEndpoints(endpointGet, endpointEntry)
  const actionVsScope = compareEndpoints(endpointGet, endpointMember)
  const idVsAction = compareEndpoints(endpointId, endpointGet)

  t.true(scopeVsType > 0)
  t.true(actionVsType > 0)
  t.true(actionVsScope > 0)
  t.true(idVsAction < 0)
})

test('should sort specificity higher than id', t => {
  const idVsSpecificity = compareEndpoints(endpointId, endpointGetWithParam)
  const idVsCatchAll = compareEndpoints(endpointId, endpointCatchAll)

  t.true(idVsSpecificity > 0)
  t.true(idVsCatchAll < 0)
})

test('should compare based on specificity', t => {
  const scopeVsAll = compareEndpoints(endpointMember, endpointUser)
  const scopeActionVsAll = compareEndpoints(
    endpointGetMember,
    endpointGetEntryMember
  )
  const scopeActionVsType = compareEndpoints(endpointGetMember, endpointEntry)

  t.true(scopeVsAll > 0)
  t.true(scopeActionVsAll > 0)
  t.true(scopeActionVsType > 0)
})

test('should sort type before type array', t => {
  const higher = compareEndpoints(endpointUser, endpointUserAndEntry)
  const equal = compareEndpoints(endpointUserAndEntry, endpointEntryAndItem)
  const lower = compareEndpoints(endpointEntryAndItem, endpointUser)

  t.true(higher < 0)
  t.is(equal, 0)
  t.true(lower > 0)
})

test('should sort scope before scope array', t => {
  const higher = compareEndpoints(endpointMember, endpointMemberAndCollection)
  const equal = compareEndpoints(
    endpointMemberAndCollection,
    endpointMemberAndCollection
  )
  const lower = compareEndpoints(
    endpointMemberAndCollection,
    endpointCollection
  )

  t.true(higher < 0)
  t.is(equal, 0)
  t.true(lower > 0)
})

test('should sort action before action array', t => {
  const higher = compareEndpoints(endpointGet, endpointPostAndDelete)
  const equal = compareEndpoints(endpointPostAndDelete, endpointPostAndPut)
  const lower = compareEndpoints(endpointPostAndPut, endpointPut)

  t.true(higher < 0)
  t.is(equal, 0)
  t.true(lower > 0)
})

test('should sort array with fewer actions before more', t => {
  const twoVsThree = compareEndpoints(
    endpointPostAndDelete,
    endpointPostPutAndDelete
  )

  t.true(twoVsThree < 0)
})

test('should sort more params before fewer', t => {
  const higher = compareEndpoints(
    endpointServiceAuthorParams,
    endpointAuthorParam
  )
  const equal = compareEndpoints(endpointServiceParam, endpointAuthorParam)
  const lower = compareEndpoints(
    endpointServiceParam,
    endpointServiceAuthorParams
  )

  t.true(higher < 0)
  t.is(equal, 0)
  t.true(lower > 0)
})

test('should sort params after type', t => {
  const paramVsType = compareEndpoints(endpointServiceParam, endpointEntry)
  const paramVsScope = compareEndpoints(endpointServiceParam, endpointMember)
  const paramVsAction = compareEndpoints(endpointServiceParam, endpointPut)

  t.true(paramVsType > 0)
  t.true(paramVsScope < 0)
  t.true(paramVsAction < 0)
})

test('should sort with params before without', t => {
  const typeWithVsWithout = compareEndpoints(
    endpointEntryWithParam,
    endpointEntry
  )
  const scopeWithVsWithout = compareEndpoints(
    endpointMemberWithParam,
    endpointMember
  )
  const actionWithVsWithout = compareEndpoints(
    endpointGetWithParam,
    endpointGet
  )

  t.true(typeWithVsWithout < 0)
  t.true(scopeWithVsWithout < 0)
  t.true(actionWithVsWithout < 0)
})

test('should sort required params before optional', t => {
  const requiredVsOptional = compareEndpoints(
    endpointServiceParamOptional,
    endpointAuthorParam
  )

  t.true(requiredVsOptional > 0)
})

test('should sort more filters before fewer', t => {
  const higher = compareEndpoints(
    endpointEntryWithTwoFilters,
    endpointEntryWithFilter
  )
  const equal = compareEndpoints(
    endpointEntryWithFilter,
    endpointUserWithFilter
  )
  const lower = compareEndpoints(
    endpointUserWithFilter,
    endpointEntryWithTwoFilters
  )

  t.true(higher < 0)
  t.is(equal, 0)
  t.true(lower > 0)
})

test('should sort filters after params', t => {
  const filterVsType = compareEndpoints(endpointOneFilter, endpointEntry)
  const filterVsParam = compareEndpoints(
    endpointOneFilter,
    endpointServiceParam
  )
  const filterVsScope = compareEndpoints(endpointOneFilter, endpointMember)
  const filterVsAction = compareEndpoints(endpointOneFilter, endpointPut)

  t.true(filterVsType > 0)
  t.true(filterVsParam > 0)
  t.true(filterVsScope < 0)
  t.true(filterVsAction < 0)
})

test('should sort with filters before without', t => {
  const typeWithVsWithout = compareEndpoints(
    endpointEntryWithFilter,
    endpointEntry
  )
  const paramWithVsWithout = compareEndpoints(
    endpointServiceParamWithFilter,
    endpointServiceParam
  )
  const scopeWithVsWithout = compareEndpoints(
    endpointMemberWithFilter,
    endpointMember
  )
  const actionWithVsWithout = compareEndpoints(
    endpointGetWithFilter,
    endpointGet
  )

  t.true(typeWithVsWithout < 0)
  t.true(paramWithVsWithout < 0)
  t.true(scopeWithVsWithout < 0)
  t.true(actionWithVsWithout < 0)
})
