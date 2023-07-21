import test from 'ava'

import isMatch from './match.js'

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
  'meta.ident.root': { const: true },
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
const endpointSetWithFilters = {
  match: {
    action: 'SET',
    filters: {
      ...filterNotDraft,
      ...filterEntry1,
    },
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
const endpointSetWithParamFilter = {
  match: { action: 'SET', filters: filterParamAuthor },
}
const endpointSetWithMetaFilter = {
  match: { action: 'SET', filters: filterMetaRootIdent },
}

const endpointSetWithIncoming = {
  match: { action: 'SET', incoming: true },
}

const endpointSetWithNonIncoming = {
  match: { action: 'SET', incoming: false },
}

// Tests

test('should match catch-all endpoint', (t) => {
  const endpoint = endpointCatchAll
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.true(isMatch(endpoint)(action))
})

test('should match with action', (t) => {
  const endpoint = endpointGet
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.true(isMatch(endpoint)(action))
})

test('should mismatch with action', (t) => {
  const endpoint = endpointDelete
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.false(isMatch(endpoint)(action))
})

test('should match with action array', (t) => {
  const endpoint = endpointSetAndDelete
  const action = {
    type: 'SET',
    payload: { type: 'entry' },
  }

  t.true(isMatch(endpoint)(action))
})

test('should mismatch with action array', (t) => {
  const endpoint = endpointSetAndDelete
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.false(isMatch(endpoint)(action))
})

test('should match with member scope', (t) => {
  const endpoints = endpointMember
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
  }

  t.true(isMatch(endpoints)(action))
})

test('should mismatch with member scope', (t) => {
  const endpoints = endpointCollection
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry' },
  }

  t.false(isMatch(endpoints)(action))
})

test('should match with members scope', (t) => {
  const endpoint = endpointMembers
  const action = {
    type: 'GET',
    payload: { id: ['ent1', 'ent2'], type: 'entry' },
  }

  t.true(isMatch(endpoint)(action))
})

test('should mismatch with members scope', (t) => {
  const endpoint = endpointMember
  const action = {
    type: 'GET',
    payload: { id: ['ent1', 'ent2'], type: 'entry' },
  }

  t.false(isMatch(endpoint)(action))
})

test('should match with collection scope', (t) => {
  const endpoint = endpointCollection
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.true(isMatch(endpoint)(action))
})

test('should mismatch with collection scope', (t) => {
  const endpoint = endpointMember
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.false(isMatch(endpoint)(action))
})

test('should match with scope array', (t) => {
  const endpoint = endpointMemberAndCollection
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.true(isMatch(endpoint)(action))
})

test('should mismatch with scope array', (t) => {
  const endpoint = endpointMemberAndCollection
  const action = {
    type: 'GET',
    payload: { type: 'entry', id: ['ent1', 'ent2'] },
  }

  t.false(isMatch(endpoint)(action))
})

test('should match with type', (t) => {
  const endpoint = endpointEntry
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.true(isMatch(endpoint)(action))
})

test('should mismatch with type', (t) => {
  const endpoint = endpointEntry
  const action = {
    type: 'GET',
    payload: { type: 'user' },
  }

  t.false(isMatch(endpoint)(action))
})

test('should match with type array', (t) => {
  const endpoint = endpointEntryAndItem
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.true(isMatch(endpoint)(action))
})

test('should mismatch with type array', (t) => {
  const endpoint = endpointEntryAndItem
  const action = {
    type: 'GET',
    payload: { type: 'user' },
  }

  t.false(isMatch(endpoint)(action))
})

test('should match with action type array', (t) => {
  const endpoint = endpointEntry
  const action = {
    type: 'GET',
    payload: { type: ['user', 'entry'] },
  }

  t.true(isMatch(endpoint)(action))
})

test('should mismatch with action type array', (t) => {
  const endpoint = endpointEntry
  const action = {
    type: 'GET',
    payload: { type: ['user', 'unknown'] },
  }

  t.false(isMatch(endpoint)(action))
})

test('should match with endpoint id', (t) => {
  const endpoint = endpointWithId
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', endpoint: 'endpoint1' },
  }

  t.true(isMatch(endpoint)(action))
})

test('should mismatch with endpoint id', (t) => {
  const endpoint = endpointEntry
  const action = {
    type: 'GET',
    payload: { id: 'ent1', type: 'entry', endpoint: 'endpoint1' },
  }

  t.false(isMatch(endpoint)(action))
})

test('should match with required param', (t) => {
  const endpoint = endpointGetWithAuthor
  const action = {
    type: 'GET',
    payload: { author: 'johnf', type: 'entry' },
  }

  t.true(isMatch(endpoint)(action))
})

test('should mismatch with required param', (t) => {
  const endpoint = endpointGetWithAuthor
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.false(isMatch(endpoint)(action))
})

test('should match with optional param', (t) => {
  const endpoints = endpointGetWithOptionalAuthor
  const action = {
    type: 'GET',
    payload: { author: 'johnf', type: 'entry' },
  }

  t.true(isMatch(endpoints)(action))
})

test('should match without optional param', (t) => {
  const endpoints = endpointGetWithOptionalAuthor
  const action = {
    type: 'GET',
    payload: { type: 'entry' },
  }

  t.true(isMatch(endpoints)(action))
})

test('should match with filter', (t) => {
  const endpoint = endpointSetWithFilter
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: false } },
  }

  t.true(isMatch(endpoint)(action))
})

test('should mismatch with filter', (t) => {
  const endpoint = endpointSetWithFilter
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
  }

  t.false(isMatch(endpoint)(action))
})

test('should match with several filters', (t) => {
  const endpoints = endpointSetWithFilters
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: false } },
  }

  t.true(isMatch(endpoints)(action))
})

test('should mismatch with several filters', (t) => {
  const endpoints = endpointSetWithFilters
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 2', draft: false } },
  }

  t.false(isMatch(endpoints)(action))
})

test('should match with one of several filters', (t) => {
  const endpoints = endpointSetWithOrFilters
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 2', draft: false } },
  }

  t.true(isMatch(endpoints)(action))
})

test('should match with no filters', (t) => {
  const endpoints = endpointSetWithNoFilters
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
  }

  t.true(isMatch(endpoints)(action))
})

test('should match with params filter', (t) => {
  const endpoints = endpointSetWithParamFilter
  const action = {
    type: 'SET',
    payload: {
      author: 'johnf',
      data: { $type: 'entry', title: 'Entry 1', draft: true },
    },
  }

  t.true(isMatch(endpoints)(action))
})

test('should mismatch with params filter', (t) => {
  const endpoints = endpointSetWithParamFilter
  const action = {
    type: 'SET',
    payload: {
      author: 'lucyk',
      data: { $type: 'entry', title: 'Entry 1', draft: true },
    },
  }

  t.false(isMatch(endpoints)(action))
})

test('should match with meta filter', (t) => {
  const endpoints = endpointSetWithMetaFilter
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
    meta: { ident: { root: true, id: 'root' } },
  }

  t.true(isMatch(endpoints)(action))
})

test('should mismatch with meta filter', (t) => {
  const endpoints = endpointSetWithMetaFilter
  const action = {
    type: 'SET',
    payload: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
    meta: { ident: { id: 'johnf' } },
  }

  t.false(isMatch(endpoints)(action))
})

test('incoming should match incoming endpoint', (t) => {
  const endpoints = endpointSetWithIncoming
  const action = {
    type: 'SET',
    payload: { data: JSON.stringify({ $type: 'entry', title: 'Entry 1' }) },
    meta: { ident: { id: 'johnf' } },
  }

  t.true(isMatch(endpoints)(action, true))
})

test('non-incoming should not match incoming endpoint', (t) => {
  const endpoints = endpointSetWithIncoming
  const action = {
    type: 'SET',
    payload: { data: JSON.stringify({ $type: 'entry', title: 'Entry 1' }) },
    meta: { ident: { id: 'johnf' } },
  }

  t.false(isMatch(endpoints)(action, false))
})

test('non-incoming should match non-incoming endpoint', (t) => {
  const endpoints = endpointSetWithNonIncoming
  const action = {
    type: 'SET',
    payload: { data: JSON.stringify({ $type: 'entry', title: 'Entry 1' }) },
    meta: { ident: { id: 'johnf' } },
  }

  t.true(isMatch(endpoints)(action, false))
})

test('incoming should not match non-incoming endpoint', (t) => {
  const endpoints = endpointSetWithNonIncoming
  const action = {
    type: 'SET',
    payload: { data: JSON.stringify({ $type: 'entry', title: 'Entry 1' }) },
    meta: { ident: { id: 'johnf' } },
  }

  t.false(isMatch(endpoints)(action, true))
})

test('incoming should match non-incoming endpoint', (t) => {
  const endpoints = endpointGet
  const action = {
    type: 'GET',
    payload: { data: JSON.stringify({ $type: 'entry', title: 'Entry 1' }) },
    meta: { ident: { id: 'johnf' } },
  }

  t.true(isMatch(endpoints)(action, true))
})