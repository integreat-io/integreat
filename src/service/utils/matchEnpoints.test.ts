import test from 'ava'
import mapTransform from 'map-transform'
import { IdentType } from '../../types.js'

import isMatch from './matchEnpoints.js'

// Setup

const filterNotDraft = {
  'payload.data.draft': { const: false },
}
const filterEntry1 = {
  'payload.data.title': { const: 'Entry 1' },
}
const filterParamAuthor = {
  'payload.author': { const: 'johnf' },
}
const filterMetaRootIdent = {
  'meta.ident.type': { const: 'ROOT' },
}
const conditionNotDraft = {
  $transform: 'compare',
  path: 'payload.data.draft',
  match: false,
}
const conditionEntry1 = {
  $transform: 'compare',
  path: 'payload.data.title',
  match: 'Entry 1',
}
const conditionParamAuthor = {
  $transform: 'compare',
  path: 'payload.author',
  match: 'johnf',
}
const conditionMetaRootIdent = {
  $transform: 'compare',
  path: 'meta.ident.type',
  match: 'ROOT',
}

const endpointCatchAll = {}
const endpointGet = { match: { action: 'GET' } }
const endpointDelete = { match: { action: 'DELETE' } }
const endpointSetAndDelete = { match: { action: ['SET', 'DELETE'] } }
const endpointMember = { match: { scope: 'member' } }
const endpointMembers = { match: { scope: 'members' } }
const endpointCollection = { match: { scope: 'collection' } }
const endpointMemberAndCollection = {
  match: { scope: ['member', 'collection'] },
}
const endpointEntry = { match: { type: 'entry' } }
const endpointEntryAndItem = { match: { type: ['entry', 'item'] } }
const endpointWithId = { id: 'endpoint1' }
const endpointGetWithAuthor = {
  match: { action: 'GET', params: { author: true } },
}
const endpointGetWithOptionalAuthor = {
  match: { action: 'GET', params: { author: false } },
}
const endpointSetWithFilter = {
  match: { action: 'SET', filters: filterNotDraft },
}
const endpointSetWithCondition = {
  match: { action: 'SET', conditions: [conditionNotDraft] },
}
const endpointSetWithFilters = {
  match: {
    action: 'SET',
    filters: {
      ...filterNotDraft,
      ...filterEntry1,
    },
  },
}
const endpointSetWithConditions = {
  match: {
    action: 'SET',
    conditions: [conditionNotDraft, conditionEntry1],
  },
}
const endpointSetWithOrFilters = {
  match: {
    action: 'SET',
    filters: {
      $or: true,
      ...filterNotDraft,
      ...filterEntry1,
    },
  },
}
const endpointSetWithNoFilters = { match: { action: 'SET', filters: {} } }
const endpointSetWithNoConditions = { match: { action: 'SET', conditions: [] } }
const endpointSetWithParamFilter = {
  match: { action: 'SET', filters: filterParamAuthor },
}
const endpointSetWithParamCondition = {
  match: { action: 'SET', conditions: [conditionParamAuthor] },
}
const endpointSetWithMetaFilter = {
  match: { action: 'SET', filters: filterMetaRootIdent },
}
const endpointSetWithMetaCondition = {
  match: { action: 'SET', conditions: [conditionMetaRootIdent] },
}

const endpointSetWithIncoming = {
  match: { action: 'SET', incoming: true },
}

const endpointSetWithNonIncoming = {
  match: { action: 'SET', incoming: false },
}

const mapOptions = {}

// Tests

test('should match catch-all endpoint', async (t) => {
  const endpoint = endpointCatchAll
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.true(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should match with action', async (t) => {
  const endpoint = endpointGet
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.true(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should mismatch with action', async (t) => {
  const endpoint = endpointDelete
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.false(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should match with action array', async (t) => {
  const endpoint = endpointSetAndDelete
  const action = {
    type: 'SET',
    payload: { type: 'entry' },
  }

  t.true(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should mismatch with action array', async (t) => {
  const endpoint = endpointSetAndDelete
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.false(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should match with member scope', async (t) => {
  const endpoints = endpointMember
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
  }

  t.true(await isMatch(endpoints, mapTransform, mapOptions)(action))
})

test('should mismatch with member scope', async (t) => {
  const endpoints = endpointCollection
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
  }

  t.false(await isMatch(endpoints, mapTransform, mapOptions)(action))
})

test('should match with members scope', async (t) => {
  const endpoint = endpointMembers
  const action = {
    type: 'GET',
    payload: { id: ['ent1', 'ent2'], type: 'entry' },
  }

  t.true(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should mismatch with members scope', async (t) => {
  const endpoint = endpointMember
  const action = {
    type: 'GET',
    payload: { id: ['ent1', 'ent2'], type: 'entry' },
  }

  t.false(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should match with collection scope', async (t) => {
  const endpoint = endpointCollection
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.true(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should mismatch with collection scope', async (t) => {
  const endpoint = endpointMember
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.false(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should match with scope array', async (t) => {
  const endpoint = endpointMemberAndCollection
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.true(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should mismatch with scope array', async (t) => {
  const endpoint = endpointMemberAndCollection
  const action = {
    type: 'GET',
    payload: { type: 'entry', id: ['ent1', 'ent2'] },
  }

  t.false(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should match with type', async (t) => {
  const endpoint = endpointEntry
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.true(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should mismatch with type', async (t) => {
  const endpoint = endpointEntry
  const action = {
    type: 'GET',
    payload: { type: 'user' },
  }

  t.false(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should match with type array', async (t) => {
  const endpoint = endpointEntryAndItem
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.true(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should mismatch with type array', async (t) => {
  const endpoint = endpointEntryAndItem
  const action = {
    type: 'GET',
    payload: { type: 'user' },
  }

  t.false(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should match with action type array', async (t) => {
  const endpoint = endpointEntry
  const action = {
    type: 'GET',
    payload: { type: ['user', 'entry'] },
  }

  t.true(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should mismatch with action type array', async (t) => {
  const endpoint = endpointEntry
  const action = {
    type: 'GET',
    payload: { type: ['user', 'unknown'] },
  }

  t.false(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should match with endpoint id', async (t) => {
  const endpoint = endpointWithId
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', endpoint: 'endpoint1' },
  }

  t.true(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should mismatch with endpoint id', async (t) => {
  const endpoint = endpointEntry
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', endpoint: 'endpoint1' },
  }

  t.false(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should match with required param', async (t) => {
  const endpoint = endpointGetWithAuthor
  const action = {
    type: 'GET',
    payload: { author: 'johnf', type: 'entry' },
  }

  t.true(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should mismatch with required param', async (t) => {
  const endpoint = endpointGetWithAuthor
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.false(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should match with optional param', async (t) => {
  const endpoints = endpointGetWithOptionalAuthor
  const action = {
    type: 'GET',
    payload: { author: 'johnf', type: 'entry' },
  }

  t.true(await isMatch(endpoints, mapTransform, mapOptions)(action))
})

test('should match without optional param', async (t) => {
  const endpoints = endpointGetWithOptionalAuthor
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.true(await isMatch(endpoints, mapTransform, mapOptions)(action))
})

test('should match with filter', async (t) => {
  const endpoint = endpointSetWithFilter
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: false } },
  }

  t.true(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should mismatch with filter', async (t) => {
  const endpoint = endpointSetWithFilter
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
  }

  t.false(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should match with several filters', async (t) => {
  const endpoints = endpointSetWithFilters
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: false } },
  }

  t.true(await isMatch(endpoints, mapTransform, mapOptions)(action))
})

test('should mismatch with several filters', async (t) => {
  const endpoints = endpointSetWithFilters
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 2', draft: false } },
  }

  t.false(await isMatch(endpoints, mapTransform, mapOptions)(action))
})

test('should match with one of several filters', async (t) => {
  const endpoints = endpointSetWithOrFilters
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 2', draft: false } },
  }

  t.true(await isMatch(endpoints, mapTransform, mapOptions)(action))
})

test('should match with no filters', async (t) => {
  const endpoints = endpointSetWithNoFilters
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
  }

  t.true(await isMatch(endpoints, mapTransform, mapOptions)(action))
})

test('should match with params filter', async (t) => {
  const endpoints = endpointSetWithParamFilter
  const action = {
    type: 'SET',
    payload: {
      author: 'johnf',
      data: { $type: 'entry', title: 'Entry 1', draft: true },
    },
  }

  t.true(await isMatch(endpoints, mapTransform, mapOptions)(action))
})

test('should mismatch with params filter', async (t) => {
  const endpoints = endpointSetWithParamFilter
  const action = {
    type: 'SET',
    payload: {
      author: 'lucyk',
      data: { $type: 'entry', title: 'Entry 1', draft: true },
    },
  }

  t.false(await isMatch(endpoints, mapTransform, mapOptions)(action))
})

test('should match with meta filter', async (t) => {
  const endpoints = endpointSetWithMetaFilter
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
    meta: { ident: { id: 'root', type: IdentType.Root } },
  }

  t.true(await isMatch(endpoints, mapTransform, mapOptions)(action))
})

test('should mismatch with meta filter', async (t) => {
  const endpoints = endpointSetWithMetaFilter
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
    meta: { ident: { id: 'johnf' } },
  }

  t.false(await isMatch(endpoints, mapTransform, mapOptions)(action))
})

test('should match with condition', async (t) => {
  const endpoint = endpointSetWithCondition
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: false } },
  }

  t.true(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should mismatch with condition', async (t) => {
  const endpoint = endpointSetWithCondition
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
  }

  t.false(await isMatch(endpoint, mapTransform, mapOptions)(action))
})

test('should match with several conditions', async (t) => {
  const endpoints = endpointSetWithConditions
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: false } },
  }

  t.true(await isMatch(endpoints, mapTransform, mapOptions)(action))
})

test('should mismatch with several conditions', async (t) => {
  const endpoints = endpointSetWithConditions
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 2', draft: false } },
  }

  t.false(await isMatch(endpoints, mapTransform, mapOptions)(action))
})

test('should match with no conditions', async (t) => {
  const endpoints = endpointSetWithNoConditions
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
  }

  t.true(await isMatch(endpoints, mapTransform, mapOptions)(action))
})

test('should match with params condition', async (t) => {
  const endpoints = endpointSetWithParamCondition
  const action = {
    type: 'SET',
    payload: {
      author: 'johnf',
      data: { $type: 'entry', title: 'Entry 1', draft: true },
    },
  }

  t.true(await isMatch(endpoints, mapTransform, mapOptions)(action))
})

test('should mismatch with params condition', async (t) => {
  const endpoints = endpointSetWithParamCondition
  const action = {
    type: 'SET',
    payload: {
      author: 'lucyk',
      data: { $type: 'entry', title: 'Entry 1', draft: true },
    },
  }

  t.false(await isMatch(endpoints, mapTransform, mapOptions)(action))
})

test('should match with meta condition', async (t) => {
  const endpoints = endpointSetWithMetaCondition
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
    meta: { ident: { id: 'root', type: IdentType.Root } },
  }

  t.true(await isMatch(endpoints, mapTransform, mapOptions)(action))
})

test('should mismatch with meta condition', async (t) => {
  const endpoints = endpointSetWithMetaCondition
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
    meta: { ident: { id: 'johnf' } },
  }

  t.false(await isMatch(endpoints, mapTransform, mapOptions)(action))
})

test('incoming should match incoming endpoint', async (t) => {
  const endpoints = endpointSetWithIncoming
  const action = {
    type: 'SET',
    payload: { data: JSON.stringify({ $type: 'entry', title: 'Entry 1' }) },
    meta: { ident: { id: 'johnf' } },
  }

  t.true(await isMatch(endpoints, mapTransform, mapOptions)(action, true))
})

test('non-incoming should not match incoming endpoint', async (t) => {
  const endpoints = endpointSetWithIncoming
  const action = {
    type: 'SET',
    payload: { data: JSON.stringify({ $type: 'entry', title: 'Entry 1' }) },
    meta: { ident: { id: 'johnf' } },
  }

  t.false(await isMatch(endpoints, mapTransform, mapOptions)(action, false))
})

test('non-incoming should match non-incoming endpoint', async (t) => {
  const endpoints = endpointSetWithNonIncoming
  const action = {
    type: 'SET',
    payload: { data: JSON.stringify({ $type: 'entry', title: 'Entry 1' }) },
    meta: { ident: { id: 'johnf' } },
  }

  t.true(await isMatch(endpoints, mapTransform, mapOptions)(action, false))
})

test('incoming should not match non-incoming endpoint', async (t) => {
  const endpoints = endpointSetWithNonIncoming
  const action = {
    type: 'SET',
    payload: { data: JSON.stringify({ $type: 'entry', title: 'Entry 1' }) },
    meta: { ident: { id: 'johnf' } },
  }

  t.false(await isMatch(endpoints, mapTransform, mapOptions)(action, true))
})

test('incoming should match non-incoming endpoint', async (t) => {
  const endpoints = endpointGet
  const action = {
    type: 'GET',
    payload: { data: JSON.stringify({ $type: 'entry', title: 'Entry 1' }) },
    meta: { ident: { id: 'johnf' } },
  }

  t.true(await isMatch(endpoints, mapTransform, mapOptions)(action, true))
})
