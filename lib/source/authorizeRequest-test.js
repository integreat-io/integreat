import test from 'ava'

import authorizeRequest from './authorizeRequest'

test('should grant request when authorized', (t) => {
  const datatypes = {entry: {id: 'entry', access: 'auth'}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    access: {ident: {id: 'ident1'}}
  }
  const expected = {
    action: 'GET',
    params: {type: 'entry'},
    access: {
      status: 'granted',
      scheme: 'auth',
      ident: {id: 'ident1'}
    }
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret, expected)
})

test('should refuse request when not authorized', (t) => {
  const datatypes = {entry: {id: 'entry', access: 'auth'}}
  const request = {
    action: 'GET',
    params: {type: 'entry'}
  }
  const expectedAccess = {
    status: 'refused',
    scheme: 'auth',
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant request for all', (t) => {
  const datatypes = {entry: {id: 'entry', access: 'all'}}
  const request = {
    action: 'GET',
    params: {type: 'entry'}
  }
  const expectedAccess = {
    status: 'granted',
    scheme: 'all',
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse request for none', (t) => {
  const datatypes = {entry: {id: 'entry', access: 'none'}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    access: {ident: {id: 'ident1'}}
  }
  const expectedAccess = {
    status: 'refused',
    scheme: 'none',
    ident: {id: 'ident1'}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant without an access scheme', (t) => {
  const datatypes = {entry: {id: 'entry'}}
  const request = {
    action: 'GET',
    params: {type: 'entry'}
  }
  const expectedAccess = {
    status: 'granted',
    scheme: null,
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse without an access scheme when request has auth', (t) => {
  const datatypes = {entry: {id: 'entry'}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    auth: {}
  }
  const expectedAccess = {
    status: 'refused',
    scheme: null,
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should treat request without datatype as no scheme', (t) => {
  const datatypes = {}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    auth: {}
  }
  const expectedAccess = {
    status: 'refused',
    scheme: null,
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant request without type', (t) => {
  const datatypes = {}
  const request = {
    action: 'SET',
    data: [{id: 'ent1', type: 'entry'}],
    auth: {}
  }
  const expectedAccess = {
    status: 'granted',
    scheme: null,
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant with role scheme', (t) => {
  const datatypes = {entry: {id: 'entry', access: {role: 'admin'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    access: {ident: {id: 'ident1', roles: ['admin']}}
  }
  const expectedAccess = {
    status: 'granted',
    scheme: {role: 'admin'},
    ident: {id: 'ident1', roles: ['admin']}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse with role scheme', (t) => {
  const datatypes = {entry: {id: 'entry', access: {role: 'admin'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    access: {ident: {id: 'ident1'}}
  }
  const expectedAccess = {
    status: 'refused',
    scheme: {role: 'admin'},
    ident: {id: 'ident1'}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant with ident scheme', (t) => {
  const datatypes = {entry: {id: 'entry', access: {ident: 'ident1'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    access: {ident: {id: 'ident1'}}
  }
  const expectedAccess = {
    status: 'granted',
    scheme: {ident: 'ident1'},
    ident: {id: 'ident1'}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse with ident scheme', (t) => {
  const datatypes = {entry: {id: 'entry', access: {ident: 'ident1'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    access: {ident: {id: 'ident2'}}
  }
  const expectedAccess = {
    status: 'refused',
    scheme: {ident: 'ident1'},
    ident: {id: 'ident2'}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant request for auth scheme', (t) => {
  const datatypes = {entry: {id: 'entry', access: {allow: 'auth'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    access: {ident: {id: 'ident1'}}
  }
  const expectedAccess = {
    status: 'granted',
    scheme: 'auth',
    ident: {id: 'ident1'}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant request for all scheme', (t) => {
  const datatypes = {entry: {id: 'entry', access: {allow: 'all'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'}
  }
  const expectedAccess = {
    status: 'granted',
    scheme: 'all',
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse request for none scheme', (t) => {
  const datatypes = {entry: {id: 'entry', access: {allow: 'none'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    access: {ident: {id: 'ident1'}}
  }
  const expectedAccess = {
    status: 'refused',
    scheme: 'none',
    ident: {id: 'ident1'}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant request for empty scheme', (t) => {
  const datatypes = {entry: {id: 'entry', access: {}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'}
  }
  const expectedAccess = {
    status: 'granted',
    scheme: null,
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse request for empty scheme when request has auth', (t) => {
  const datatypes = {entry: {id: 'entry', access: {}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    auth: {}
  }
  const expectedAccess = {
    status: 'refused',
    scheme: null,
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant request for roleFromField', (t) => {
  const datatypes = {entry: {id: 'entry', access: {roleFromField: 'role'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    access: {ident: {id: 'ident1'}}
  }
  const expectedAccess = {
    status: 'granted',
    scheme: {roleFromField: 'role'},
    ident: {id: 'ident1'}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse request for roleFromField when not authenticated', (t) => {
  const datatypes = {entry: {id: 'entry', access: {roleFromField: 'role'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'}
  }
  const expectedAccess = {
    status: 'refused',
    scheme: {roleFromField: 'role'},
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant request for identFromField', (t) => {
  const datatypes = {entry: {id: 'entry', access: {identFromField: 'id'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    access: {ident: {id: 'ident1'}}
  }
  const expectedAccess = {
    status: 'granted',
    scheme: {identFromField: 'id'},
    ident: {id: 'ident1'}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse request for identFromField when not authenticated', (t) => {
  const datatypes = {entry: {id: 'entry', access: {identFromField: 'id'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'}
  }
  const expectedAccess = {
    status: 'refused',
    scheme: {identFromField: 'id'},
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse request for unknown access prop', (t) => {
  const datatypes = {entry: {id: 'entry', access: {unknown: 'something'}}}
  const request = {
    action: 'GET',
    params: {type: 'entry'},
    access: {ident: {id: 'ident1'}}
  }
  const expectedAccess = {
    status: 'refused',
    scheme: {unknown: 'something'},
    ident: {id: 'ident1'}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant for action', (t) => {
  const datatypes = {entry: {
    id: 'entry',
    access: {allow: 'none', actions: {'GET': {allow: 'all'}}}
  }}
  const request = {
    action: 'GET',
    params: {type: 'entry'}
  }
  const expectedAccess = {
    status: 'granted',
    scheme: 'all',
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse for action', (t) => {
  const datatypes = {entry: {
    id: 'entry',
    access: {allow: 'none', actions: {'GET': {access: 'all'}}}
  }}
  const request = {
    action: 'SET',
    params: {type: 'entry'}
  }
  const expectedAccess = {
    status: 'refused',
    scheme: 'none',
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant for action with short form', (t) => {
  const datatypes = {entry: {
    id: 'entry',
    access: {allow: 'none', actions: {'GET': 'all'}}
  }}
  const request = {
    action: 'GET',
    params: {type: 'entry'}
  }
  const expectedAccess = {
    status: 'granted',
    scheme: 'all',
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should refuse for action with short form', (t) => {
  const datatypes = {entry: {
    id: 'entry',
    access: {allow: 'all', actions: {'SET': 'none'}}
  }}
  const request = {
    action: 'SET',
    params: {type: 'entry'}
  }
  const expectedAccess = {
    status: 'refused',
    scheme: 'none',
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should not include unused action accesses in request', (t) => {
  const datatypes = {entry: {
    id: 'entry',
    access: {identFromField: 'id', actions: {'GET': {allow: 'all'}}}
  }}
  const request = {
    action: 'SET',
    params: {type: 'entry'}
  }
  const expectedAccess = {
    status: 'refused',
    scheme: {identFromField: 'id'},
    ident: null
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})

test('should grant for root', (t) => {
  const datatypes = {entry: {
    id: 'entry',
    access: {access: 'all', actions: {'SET': 'none'}}
  }}
  const request = {
    action: 'SET',
    params: {type: 'entry'},
    access: {ident: {root: true}}
  }
  const expectedAccess = {
    status: 'granted',
    scheme: 'root',
    ident: {root: true}
  }

  const ret = authorizeRequest(request, datatypes)

  t.deepEqual(ret.access, expectedAccess)
})
