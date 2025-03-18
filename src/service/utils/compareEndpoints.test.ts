import test from 'node:test'
import assert from 'node:assert/strict'

import compareEndpoints from './compareEndpoints.js'

// Helpers

const draftFilter = { 'request.data.draft': { const: false } }
const titleFilter = { 'request.data.title': { const: 'Entry 1' } }

const draftCondition = {
  $transform: 'compare',
  path: 'request.data.draft',
  match: false,
}
const titleCondition = {
  $transfrom: 'compare',
  path: 'request.data.title',
  match: 'Entry 1',
}

const endpointCatchAll = {}
const endpointGet = { match: { action: 'GET' } }
const endpointPut = { match: { action: 'PUT' } }
const endpointPostAndPut = { match: { action: ['POST', 'PUT'] } }
const endpointPostAndDelete = { match: { action: ['POST', 'DELETE'] } }
const endpointPostPutAndDelete = {
  match: { action: ['POST', 'PUT', 'DELETE'] },
}
const endpointMember = { match: { scope: 'member' } }
const endpointCollection = { match: { scope: 'collection' } }
const endpointMemberAndCollection = {
  match: { scope: ['member', 'collection'] },
}
const endpointEntry = { match: { type: 'entry' } }
const endpointUser = { match: { type: 'user' } }
const endpointUserAndEntry = { match: { type: ['user', 'entry'] } }
const endpointEntryAndItem = { match: { type: ['entry', 'item'] } }
const endpointGetMember = { match: { scope: 'member', action: 'GET' } }
const endpointGetEntryMember = {
  match: { type: 'entry', scope: 'member', action: 'GET' },
}
const endpointAuthorParam = { match: { params: { author: true } } }
const endpointServiceParam = { match: { params: { source: true } } }
const endpointServiceParamOptional = { match: { params: { source: false } } }
const endpointServiceAuthorParams = {
  match: { params: { source: true, author: false } },
}
const endpointGetWithParam = {
  match: { action: 'GET', params: { author: true } },
}
const endpointMemberWithParam = {
  match: { scope: 'member', params: { author: true } },
}
const endpointEntryWithParam = {
  match: { type: 'entry', params: { author: true } },
}
const endpointOneFilter = { match: { filters: draftFilter } }
const endpointOneCondition = { match: { conditions: [draftCondition] } }
const endpointMemberWithFilter = {
  match: { scope: 'member', filters: draftFilter },
}
const endpointMemberWithCondition = {
  match: { scope: 'member', conditions: [draftCondition] },
}
const endpointGetWithFilter = {
  match: { action: 'GET', filters: draftFilter },
}
const endpointGetWithCondition = {
  match: { action: 'GET', conditions: [draftCondition] },
}
const endpointServiceParamWithFilter = {
  match: { params: { source: true }, filters: draftFilter },
}
const endpointServiceParamWithCondition = {
  match: { params: { source: true }, conditions: [draftCondition] },
}
const endpointUserWithFilter = {
  match: { type: 'user', filters: draftFilter },
}
const endpointUserWithCondition = {
  match: { type: 'user', conditions: [draftCondition] },
}
const endpointEntryWithFilter = {
  match: { type: 'entry', filters: draftFilter },
}
const endpointEntryWithCondition = {
  match: { type: 'entry', conditions: [draftCondition] },
}
const endpointEntryWithTwoFilters = {
  match: { type: 'entry', filters: { ...draftFilter, ...titleFilter } },
}
const endpointEntryWithTwoConditions = {
  match: { type: 'entry', conditions: [draftCondition, titleCondition] },
}
const endpointGetWithIncoming = {
  match: { action: 'GET', incoming: true },
}
const endpointId = {
  id: 'endpoint1',
  match: { params: { includeDocs: false } },
}

// Tests

test('should compare based on action', () => {
  const higher = compareEndpoints(endpointGet, endpointCatchAll)
  const equal = compareEndpoints(endpointGet, endpointPut)
  const lower = compareEndpoints(endpointCatchAll, endpointPut)

  assert.equal(higher < 0, true)
  assert.equal(equal, 0)
  assert.equal(lower > 0, true)
})

test('should compare based on scope', () => {
  const higher = compareEndpoints(endpointMember, endpointCatchAll)
  const equal = compareEndpoints(endpointMember, endpointCollection)
  const lower = compareEndpoints(endpointCatchAll, endpointCollection)

  assert.equal(higher < 0, true)
  assert.equal(equal, 0)
  assert.equal(lower > 0, true)
})

test('should compare based on type', () => {
  const higher = compareEndpoints(endpointEntry, endpointCatchAll)
  const equal = compareEndpoints(endpointEntry, endpointUser)
  const lower = compareEndpoints(endpointCatchAll, endpointUser)

  assert.equal(higher < 0, true)
  assert.equal(equal, 0)
  assert.equal(lower > 0, true)
})

test('should sort in the order type, scope, action, and id', () => {
  const scopeVsType = compareEndpoints(endpointMember, endpointEntry)
  const actionVsType = compareEndpoints(endpointGet, endpointEntry)
  const actionVsScope = compareEndpoints(endpointGet, endpointMember)
  const idVsAction = compareEndpoints(endpointId, endpointGet)

  assert.equal(scopeVsType > 0, true)
  assert.equal(actionVsType > 0, true)
  assert.equal(actionVsScope > 0, true)
  assert.equal(idVsAction < 0, true)
})

test('should sort specificity higher than id', () => {
  const idVsSpecificity = compareEndpoints(endpointId, endpointGetWithParam)
  const idVsCatchAll = compareEndpoints(endpointId, endpointCatchAll)

  assert.equal(idVsSpecificity > 0, true)
  assert.equal(idVsCatchAll < 0, true)
})

test('should compare based on specificity', () => {
  const scopeVsAll = compareEndpoints(endpointMember, endpointUser)
  const scopeActionVsAll = compareEndpoints(
    endpointGetMember,
    endpointGetEntryMember,
  )
  const scopeActionVsType = compareEndpoints(endpointGetMember, endpointEntry)

  assert.equal(scopeVsAll > 0, true)
  assert.equal(scopeActionVsAll > 0, true)
  assert.equal(scopeActionVsType > 0, true)
})

test('should sort type before type array', () => {
  const higher = compareEndpoints(endpointUser, endpointUserAndEntry)
  const equal = compareEndpoints(endpointUserAndEntry, endpointEntryAndItem)
  const lower = compareEndpoints(endpointEntryAndItem, endpointUser)

  assert.equal(higher < 0, true)
  assert.equal(equal, 0)
  assert.equal(lower > 0, true)
})

test('should sort scope before scope array', () => {
  const higher = compareEndpoints(endpointMember, endpointMemberAndCollection)
  const equal = compareEndpoints(
    endpointMemberAndCollection,
    endpointMemberAndCollection,
  )
  const lower = compareEndpoints(
    endpointMemberAndCollection,
    endpointCollection,
  )

  assert.equal(higher < 0, true)
  assert.equal(equal, 0)
  assert.equal(lower > 0, true)
})

test('should sort action before action array', () => {
  const higher = compareEndpoints(endpointGet, endpointPostAndDelete)
  const equal = compareEndpoints(endpointPostAndDelete, endpointPostAndPut)
  const lower = compareEndpoints(endpointPostAndPut, endpointPut)

  assert.equal(higher < 0, true)
  assert.equal(equal, 0)
  assert.equal(lower > 0, true)
})

test('should sort array with fewer actions before more', () => {
  const twoVsThree = compareEndpoints(
    endpointPostAndDelete,
    endpointPostPutAndDelete,
  )

  assert.equal(twoVsThree < 0, true)
})

test('should sort more params before fewer', () => {
  const higher = compareEndpoints(
    endpointServiceAuthorParams,
    endpointAuthorParam,
  )
  const equal = compareEndpoints(endpointServiceParam, endpointAuthorParam)
  const lower = compareEndpoints(
    endpointServiceParam,
    endpointServiceAuthorParams,
  )

  assert.equal(higher < 0, true)
  assert.equal(equal, 0)
  assert.equal(lower > 0, true)
})

test('should sort params after type', () => {
  const paramVsType = compareEndpoints(endpointServiceParam, endpointEntry)
  const paramVsScope = compareEndpoints(endpointServiceParam, endpointMember)
  const paramVsAction = compareEndpoints(endpointServiceParam, endpointPut)

  assert.equal(paramVsType > 0, true)
  assert.equal(paramVsScope < 0, true)
  assert.equal(paramVsAction < 0, true)
})

test('should sort with params before without', () => {
  const typeWithVsWithout = compareEndpoints(
    endpointEntryWithParam,
    endpointEntry,
  )
  const scopeWithVsWithout = compareEndpoints(
    endpointMemberWithParam,
    endpointMember,
  )
  const actionWithVsWithout = compareEndpoints(
    endpointGetWithParam,
    endpointGet,
  )

  assert.equal(typeWithVsWithout < 0, true)
  assert.equal(scopeWithVsWithout < 0, true)
  assert.equal(actionWithVsWithout < 0, true)
})

test('should sort required params before optional', () => {
  const requiredVsOptional = compareEndpoints(
    endpointServiceParamOptional,
    endpointAuthorParam,
  )

  assert.equal(requiredVsOptional > 0, true)
})

test('should sort more filters before fewer', () => {
  const higher = compareEndpoints(
    endpointEntryWithTwoFilters,
    endpointEntryWithFilter,
  )
  const equal = compareEndpoints(
    endpointEntryWithFilter,
    endpointUserWithFilter,
  )
  const lower = compareEndpoints(
    endpointUserWithFilter,
    endpointEntryWithTwoFilters,
  )

  assert.equal(higher < 0, true)
  assert.equal(equal, 0)
  assert.equal(lower > 0, true)
})

test('should sort filters after params', () => {
  const filterVsType = compareEndpoints(endpointOneFilter, endpointEntry)
  const filterVsParam = compareEndpoints(
    endpointOneFilter,
    endpointServiceParam,
  )
  const filterVsScope = compareEndpoints(endpointOneFilter, endpointMember)
  const filterVsAction = compareEndpoints(endpointOneFilter, endpointPut)

  assert.equal(filterVsType > 0, true)
  assert.equal(filterVsParam > 0, true)
  assert.equal(filterVsScope < 0, true)
  assert.equal(filterVsAction < 0, true)
})

test('should sort with filters before without', () => {
  const typeWithVsWithout = compareEndpoints(
    endpointEntryWithFilter,
    endpointEntry,
  )
  const paramWithVsWithout = compareEndpoints(
    endpointServiceParamWithFilter,
    endpointServiceParam,
  )
  const scopeWithVsWithout = compareEndpoints(
    endpointMemberWithFilter,
    endpointMember,
  )
  const actionWithVsWithout = compareEndpoints(
    endpointGetWithFilter,
    endpointGet,
  )

  assert.equal(typeWithVsWithout < 0, true)
  assert.equal(paramWithVsWithout < 0, true)
  assert.equal(scopeWithVsWithout < 0, true)
  assert.equal(actionWithVsWithout < 0, true)
})

test('should sort more conditions before fewer', () => {
  const higher = compareEndpoints(
    endpointEntryWithTwoConditions,
    endpointEntryWithCondition,
  )
  const equal = compareEndpoints(
    endpointEntryWithCondition,
    endpointUserWithCondition,
  )
  const lower = compareEndpoints(
    endpointUserWithCondition,
    endpointEntryWithTwoConditions,
  )

  assert.equal(higher < 0, true)
  assert.equal(equal, 0)
  assert.equal(lower > 0, true)
})

test('should sort conditions after params', () => {
  const filterVsType = compareEndpoints(endpointOneCondition, endpointEntry)
  const filterVsParam = compareEndpoints(
    endpointOneCondition,
    endpointServiceParam,
  )
  const filterVsScope = compareEndpoints(endpointOneCondition, endpointMember)
  const filterVsAction = compareEndpoints(endpointOneCondition, endpointPut)

  assert.equal(filterVsType > 0, true)
  assert.equal(filterVsParam > 0, true)
  assert.equal(filterVsScope < 0, true)
  assert.equal(filterVsAction < 0, true)
})

test('should sort with conditions before without', () => {
  const typeWithVsWithout = compareEndpoints(
    endpointEntryWithCondition,
    endpointEntry,
  )
  const paramWithVsWithout = compareEndpoints(
    endpointServiceParamWithCondition,
    endpointServiceParam,
  )
  const scopeWithVsWithout = compareEndpoints(
    endpointMemberWithCondition,
    endpointMember,
  )
  const actionWithVsWithout = compareEndpoints(
    endpointGetWithCondition,
    endpointGet,
  )

  assert.equal(typeWithVsWithout < 0, true)
  assert.equal(paramWithVsWithout < 0, true)
  assert.equal(scopeWithVsWithout < 0, true)
  assert.equal(actionWithVsWithout < 0, true)
})

test('should sort conditions before filters', () => {
  const two = compareEndpoints(
    endpointEntryWithTwoConditions,
    endpointEntryWithTwoFilters,
  )
  const one = compareEndpoints(
    endpointEntryWithFilter,
    endpointEntryWithCondition,
  )
  const moreFilters = compareEndpoints(
    endpointEntryWithCondition,
    endpointEntryWithTwoFilters,
  )

  assert.equal(two < 0, true)
  assert.equal(one > 0, true)
  assert.equal(moreFilters < 0, true)
})

test('should sort incoming first', () => {
  const incomingVsAction = compareEndpoints(
    endpointGetWithIncoming,
    endpointGet,
  )
  const incomingVsActions = compareEndpoints(
    endpointGetWithIncoming,
    endpointPostAndDelete,
  )
  const incomingVsScope = compareEndpoints(
    endpointGetWithIncoming,
    endpointMember,
  )
  const incomingVsType = compareEndpoints(
    endpointGetWithIncoming,
    endpointEntry,
  )
  const incomingVsId = compareEndpoints(endpointGetWithIncoming, endpointId)

  assert.equal(incomingVsAction < 0, true)
  assert.equal(incomingVsActions < 0, true)
  assert.equal(incomingVsScope < 0, true)
  assert.equal(incomingVsType < 0, true)
  assert.equal(incomingVsId < 0, true)
})
