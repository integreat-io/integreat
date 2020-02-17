import test from 'ava'

import isMatch from './match'

// Setup

const filterNotDraft = {
  'request.data.draft': { const: false }
}
const filterEntry1 = {
  'request.data.title': { const: 'Entry 1' }
}
const filterParamAuthor = {
  'request.params.author': { const: 'johnf' }
}
const filterMetaRootIdent = {
  'ident.root': { const: true }
}

const endpointCatchAll = {}
const endpointGet = { match: { action: 'GET' } }
const endpointDelete = { match: { action: 'DELETE' } }
const endpointSetAndDelete = { match: { action: ['SET', 'DELETE'] } }
const endpointMember = { match: { scope: 'member' } }
const endpointMembers = { match: { scope: 'members' } }
const endpointCollection = { match: { scope: 'collection' } }
const endpointMemberAndCollection = {
  match: { scope: ['member', 'collection'] }
}
const endpointEntry = { match: { type: 'entry' } }
const endpointEntryAndItem = { match: { type: ['entry', 'item'] } }
const endpointWithId = { id: 'endpoint1' }
const endpointGetWithAuthor = {
  match: { action: 'GET', params: { author: true } }
}
const endpointGetWithOptionalAuthor = {
  match: { action: 'GET', params: { author: false } }
}
const endpointSetWithFilter = {
  match: { action: 'SET', filters: filterNotDraft }
}
const endpointSetWithFilters = {
  match: {
    action: 'SET',
    filters: {
      ...filterNotDraft,
      ...filterEntry1
    }
  }
}
const endpointSetWithNoFilters = { match: { action: 'SET', filters: {} } }
const endpointSetWithParamFilter = {
  match: { action: 'SET', filters: filterParamAuthor }
}
const endpointSetWithMetaFilter = {
  match: { action: 'SET', filters: filterMetaRootIdent }
}

const exchangeDefaults = {
  status: null,
  request: {},
  response: {},
  options: {},
  meta: {}
}

// Tests

test('should match catch-all endpoint', t => {
  const endpoint = endpointCatchAll
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { type: 'entry' }
  }

  t.true(isMatch(endpoint)(exchange))
})

test('should match with action', t => {
  const endpoint = endpointGet
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { type: 'entry' }
  }

  t.true(isMatch(endpoint)(exchange))
})

test('should mismatch with action', t => {
  const endpoint = endpointDelete
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { type: 'entry' }
  }

  t.false(isMatch(endpoint)(exchange))
})

test('should match with action array', t => {
  const endpoint = endpointSetAndDelete
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    request: { type: 'entry' }
  }

  t.true(isMatch(endpoint)(exchange))
})

test('should mismatch with action array', t => {
  const endpoint = endpointSetAndDelete
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { type: 'entry' }
  }

  t.false(isMatch(endpoint)(exchange))
})

test('should match with member scope', t => {
  const endpoints = endpointMember
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { id: 'ent1', type: 'entry' }
  }

  t.true(isMatch(endpoints)(exchange))
})

test('should mismatch with member scope', t => {
  const endpoints = endpointCollection
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { id: 'ent1', type: 'entry' }
  }

  t.false(isMatch(endpoints)(exchange))
})

test('should match with members scope', t => {
  const endpoint = endpointMembers
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { id: ['ent1', 'ent2'], type: 'entry' }
  }

  t.true(isMatch(endpoint)(exchange))
})

test('should mismatch with members scope', t => {
  const endpoint = endpointMember
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { id: ['ent1', 'ent2'], type: 'entry' }
  }

  t.false(isMatch(endpoint)(exchange))
})

test('should match with collection scope', t => {
  const endpoint = endpointCollection
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { type: 'entry' }
  }

  t.true(isMatch(endpoint)(exchange))
})

test('should mismatch with collection scope', t => {
  const endpoint = endpointMember
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { type: 'entry' }
  }

  t.false(isMatch(endpoint)(exchange))
})

test('should match with scope array', t => {
  const endpoint = endpointMemberAndCollection
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { type: 'entry' }
  }

  t.true(isMatch(endpoint)(exchange))
})

test('should mismatch with scope array', t => {
  const endpoint = endpointMemberAndCollection
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { type: 'entry', id: ['ent1', 'ent2'] }
  }

  t.false(isMatch(endpoint)(exchange))
})

test('should match with type', t => {
  const endpoint = endpointEntry
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { type: 'entry' }
  }

  t.true(isMatch(endpoint)(exchange))
})

test('should mismatch with type', t => {
  const endpoint = endpointEntry
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { type: 'user' }
  }

  t.false(isMatch(endpoint)(exchange))
})

test('should match with type array', t => {
  const endpoint = endpointEntryAndItem
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { type: 'entry' }
  }

  t.true(isMatch(endpoint)(exchange))
})

test('should mismatch with type array', t => {
  const endpoint = endpointEntryAndItem
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { type: 'user' }
  }

  t.false(isMatch(endpoint)(exchange))
})

test('should match with endpoint id', t => {
  const endpoint = endpointWithId
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { id: 'ent1', type: 'entry' },
    endpointId: 'endpoint1'
  }

  t.true(isMatch(endpoint)(exchange))
})

test('should mismatch with endpoint id', t => {
  const endpoint = endpointEntry
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { id: 'ent1', type: 'entry' },
    endpointId: 'endpoint1'
  }

  t.false(isMatch(endpoint)(exchange))
})

test('should match with required param', t => {
  const endpoint = endpointGetWithAuthor
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { params: { author: 'johnf' }, type: 'entry' }
  }

  t.true(isMatch(endpoint)(exchange))
})

test('should mismatch with required param', t => {
  const endpoint = endpointGetWithAuthor
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { params: {}, type: 'entry' }
  }

  t.false(isMatch(endpoint)(exchange))
})

test('should match with optional param', t => {
  const endpoints = endpointGetWithOptionalAuthor
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { params: { author: 'johnf' }, type: 'entry' }
  }

  t.true(isMatch(endpoints)(exchange))
})

test('should match without optional param', t => {
  const endpoints = endpointGetWithOptionalAuthor
  const exchange = {
    ...exchangeDefaults,
    type: 'GET',
    request: { params: {}, type: 'entry' }
  }

  t.true(isMatch(endpoints)(exchange))
})

test('should match with filter', t => {
  const endpoint = endpointSetWithFilter
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    request: { data: { $type: 'entry', title: 'Entry 1', draft: false } }
  }

  t.true(isMatch(endpoint)(exchange))
})

test('should mismatch with filter', t => {
  const endpoint = endpointSetWithFilter
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    request: { data: { $type: 'entry', title: 'Entry 1', draft: true } }
  }

  t.false(isMatch(endpoint)(exchange))
})

test('should match with several filters', t => {
  const endpoints = endpointSetWithFilters
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    request: { data: { $type: 'entry', title: 'Entry 1', draft: false } }
  }

  t.true(isMatch(endpoints)(exchange))
})

test('should mismatch with several filters', t => {
  const endpoints = endpointSetWithFilters
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    request: { data: { $type: 'entry', title: 'Entry 2', draft: false } }
  }

  t.false(isMatch(endpoints)(exchange))
})

test('should match with no filters', t => {
  const endpoints = endpointSetWithNoFilters
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    request: { data: { $type: 'entry', title: 'Entry 1', draft: true } }
  }

  t.true(isMatch(endpoints)(exchange))
})

test('should match with params filter', t => {
  const endpoints = endpointSetWithParamFilter
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    request: {
      params: { author: 'johnf' },
      data: { $type: 'entry', title: 'Entry 1', draft: true }
    }
  }

  t.true(isMatch(endpoints)(exchange))
})

test('should mismatch with params filter', t => {
  const endpoints = endpointSetWithParamFilter
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    request: {
      params: { author: 'lucyk' },
      data: { $type: 'entry', title: 'Entry 1', draft: true }
    }
  }

  t.false(isMatch(endpoints)(exchange))
})

test('should match with meta filter', t => {
  const endpoints = endpointSetWithMetaFilter
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    request: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
    ident: { root: true, id: 'root' }
  }

  t.true(isMatch(endpoints)(exchange))
})

test('should mismatch with meta filter', t => {
  const endpoints = endpointSetWithMetaFilter
  const exchange = {
    ...exchangeDefaults,
    type: 'SET',
    request: { data: { $type: 'entry', title: 'Entry 1', draft: true } },
    ident: { id: 'johnf' }
  }

  t.false(isMatch(endpoints)(exchange))
})
