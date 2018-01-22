import test from 'ava'
import datatype from '../datatype'

import setupMapping from '.'

// Helpers

const datatypes = {
  entry: datatype({
    id: 'entry',
    attributes: {
      title: {type: 'string'},
      one: 'integer',
      two: 'integer'
    },
    relationships: {
      comments: {type: 'comment'},
      author: 'user'
    }
  })
}

// Tests

test('should exist', (t) => {
  t.is(typeof setupMapping, 'function')
})

test('should set id, type, and source', (t) => {
  const mapping = setupMapping({id: 'entriesMapping', type: 'entry', source: 'entries'}, {datatypes})

  t.truthy(mapping)
  t.is(mapping.id, 'entriesMapping')
  t.is(mapping.type, 'entry')
  t.is(mapping.source, 'entries')
  t.is(mapping.datatype, datatypes.entry)
})

test('should set default values', (t) => {
  const mapping = setupMapping({type: 'entry'}, {datatypes})

  t.is(mapping.id, null)
  t.is(mapping.source, null)
})

test('should throw when no type', (t) => {
  t.throws(() => {
    setupMapping({}, {datatypes})
  })
})

test('should throw when when type not found', (t) => {
  t.throws(() => {
    setupMapping({type: 'unknown'})
  })
})

// Tests -- fromSource

test('fromSource should exist', (t) => {
  const mapping = setupMapping({type: 'entry'}, {datatypes})

  t.is(typeof mapping.fromSource, 'function')
})

test('fromSource should return empty array when no data', (t) => {
  const def = {
    type: 'entry',
    attributes: {title: 'title'}
  }
  const mapping = setupMapping(def, {datatypes})

  const ret = mapping.fromSource()

  t.deepEqual(ret, [])
})

test('fromSource should return empty array when data does not match the path', (t) => {
  const def = {
    type: 'entry',
    path: 'unknown',
    attributes: {title: 'title'}
  }
  const mapping = setupMapping(def, {datatypes})
  const data = {item: {}}

  const ret = mapping.fromSource(data)

  t.deepEqual(ret, [])
})

test('fromSource should return mapped data', (t) => {
  const def = {
    type: 'entry',
    path: 'item',
    attributes: {
      id: 'key',
      title: 'title',
      one: {path: 'values.first'},
      two: {path: 'values.second.value'},
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    },
    relationships: {
      comments: {path: 'refs[].note'},
      author: 'userId'
    }
  }
  const mapping = setupMapping(def, {datatypes})
  const data = {
    item: {
      key: 'ent1',
      title: 'Entry 1',
      values: {first: 1, second: {value: 2}},
      createdAt: new Date('2016-11-01'),
      updatedAt: new Date('2016-11-13'),
      refs: [{note: 'no1'}],
      userId: 'johnf'
    }
  }
  const expected = [{
    id: 'ent1',
    type: 'entry',
    attributes: {
      title: 'Entry 1',
      one: 1,
      two: 2,
      createdAt: data.item.createdAt,
      updatedAt: data.item.updatedAt
    },
    relationships: {
      comments: [{id: 'no1', type: 'comment'}],
      author: {id: 'johnf', type: 'user'}
    }
  }]

  const ret = mapping.fromSource(data)

  t.deepEqual(ret, expected)
})

test('fromSource should return several items', (t) => {
  const def = {
    type: 'entry',
    path: 'items[]',
    attributes: {
      one: {path: 'values.first'}
    }
  }
  const item = setupMapping(def, {datatypes})
  const data = {items: [{values: {first: 1}}, {values: {first: 2}}]}

  const ret = item.fromSource(data)

  t.true(Array.isArray(ret))
  t.is(ret.length, 2)
  t.is(ret[0].attributes.one, 1)
  t.is(ret[1].attributes.one, 2)
})

test('fromSource should not map type from source', (t) => {
  const def = {
    type: 'entry',
    attributes: {id: {path: 'key'}, type: {path: 'type'}}
  }
  const item = setupMapping(def, {datatypes})
  const data = {key: 'item1', type: 'wrong'}

  const [ret] = item.fromSource(data)

  t.is(ret.type, 'entry')
})

test('fromSource should use array of paths as alternative paths', (t) => {
  const def = {
    type: 'entry',
    attributes: {one: ['values.first', 'values.second']}
  }
  const mapping = setupMapping(def, {datatypes})
  const data1 = {values: {first: 1}}
  const data2 = {values: {second: 2}}

  const [ret1] = mapping.fromSource(data1)
  const [ret2] = mapping.fromSource(data2)

  t.is(ret1.attributes.one, 1)
  t.is(ret2.attributes.one, 2)
})

test('fromSource should use param instead of attribute path', (t) => {
  const def = {
    type: 'entry',
    attributes: {one: {param: 'first'}}
  }
  const mapping = setupMapping(def, {datatypes})
  const data = {values: {first: 1}}
  const params = {first: 10}

  const [ret] = mapping.fromSource(data, params)

  t.is(ret.attributes.one, 10)
})

test('fromSource should set relationship with array', (t) => {
  const def = {
    type: 'entry',
    relationships: {
      comments: {path: 'item.notes'}
    }
  }
  const mapping = setupMapping(def, {datatypes})
  const data = {item: {notes: ['no1', 'no3']}}
  const expected = [{id: 'no1', type: 'comment'}, {id: 'no3', type: 'comment'}]

  const [ret] = mapping.fromSource(data)

  t.deepEqual(ret.relationships.comments, expected)
})

test('fromSource should use param instead of relationship path', (t) => {
  const def = {
    type: 'entry',
    relationships: {
      comments: {type: 'comment', param: 'comment'}
    }
  }
  const mapping = setupMapping(def, {datatypes})
  const data = {item: {notes: 'no1'}}
  const params = {comment: 'no3'}
  const expected = {id: 'no3', type: 'comment'}

  const [ret] = mapping.fromSource(data, params)

  t.deepEqual(ret.relationships.comments, expected)
})

test('fromSource should use transform pipeline', (t) => {
  const data = {id: 'item1', title: 'First item'}
  const def = {
    type: 'entry',
    attributes: {
      title: {path: 'title'}
    },
    transform: [
      {from: (item) => ({...item, attributes: {...item.attributes, one: 1}})},
      'second'
    ]
  }
  const transformers = {
    second: (item) => ({
      ...item,
      attributes: {
        ...item.attributes,
        two: 2
      }
    })
  }
  const mapping = setupMapping(def, {datatypes, transformers})

  const [ret] = mapping.fromSource(data)

  t.is(ret.attributes.one, 1)
  t.is(ret.attributes.two, 2)
})

test('fromSource should provide transform function with original data', (t) => {
  const def = {
    type: 'entry',
    attributes: {title: 'title'},
    transform: [
      (item, data) => ({...item, attributes: {title: data.notMapped}})
    ]
  }
  const mapping = setupMapping(def, {datatypes})
  const data = [{id: 'item1', title: 'First item', notMapped: 'Original'}]

  const ret = mapping.fromSource(data)

  t.is(ret[0].attributes.title, 'Original')
})

test('fromSource should filter away items in array', (t) => {
  const def = {
    type: 'entry',
    path: 'items[]',
    attributes: {id: 'id'},
    filterFrom: [(obj) => obj.id === 'ent2']
  }
  const mapping = setupMapping(def, {datatypes})
  const data = {items: [{id: 'ent1'}, {id: 'ent2'}]}

  const ret = mapping.fromSource(data)

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  t.is(ret[0].id, 'ent2')
})

test('fromSource should qualify array of data', (t) => {
  const def = {
    type: 'entry',
    qualifier: 'type="entry"',
    attributes: {id: 'id', title: 'title'}
  }
  const mapping = setupMapping(def, {datatypes})
  const data = [
    {id: 'ent1', type: 'other', title: 'Entry 1'},
    {id: 'ent2', type: 'entry', title: 'Entry 2'}
  ]

  const ret = mapping.fromSource(data)

  t.true(Array.isArray(ret))
  t.is(ret.length, 1)
  t.is(ret[0].id, 'ent2')
})

test('fromSource should qualify data object', (t) => {
  const def = {
    type: 'entry',
    qualifier: 'type="entry"',
    attributes: {id: 'id', title: 'title'}
  }
  const mapping = setupMapping(def, {datatypes})
  const data = {id: 'ent1', type: 'other', title: 'Entry 1'}

  const ret = mapping.fromSource(data)

  t.deepEqual(ret, [])
})

test('fromSource should use data as item when no attr/rel mappers', (t) => {
  const datatypes = {
    other: datatype({
      id: 'other',
      attributes: {title: 'string'},
      relationships: {author: 'user'}
    })
  }
  const def = {type: 'other'}
  const mapping = setupMapping(def, {datatypes})
  const data = {
    id: 'item',
    type: 'other',
    attributes: {
      createdAt: new Date(),
      updatedAt: new Date(),
      title: 'Other entry'
    },
    relationships: {
      author: {id: 'theman', type: 'user'}
    }
  }

  const [ret] = mapping.fromSource(data)

  t.deepEqual(ret, data)
})

test('fromSource should still transform when no attr/rel mappers', (t) => {
  const datatypes = {other: datatype({id: 'other', attributes: {title: 'string'}})}
  const def = {
    type: 'other',
    transform: [
      (item) => ({...item, attributes: {title: 'Transformed!'}})
    ]
  }
  const mapping = setupMapping(def, {datatypes})
  const data = {id: 'item', type: 'other'}

  const [ret] = mapping.fromSource(data)

  t.is(ret.id, 'item')
  t.is(ret.attributes.title, 'Transformed!')
})

test('fromSource should not use data with wrong type when no attr/rel mappers', (t) => {
  const def = {type: 'entry'}
  const mapping = setupMapping(def, {datatypes})
  const data = {
    id: 'item',
    type: 'wrong',
    attributes: {title: 'Other entry'}
  }

  const ret = mapping.fromSource(data)

  t.deepEqual(ret, [])
})

// Tests -- toSource

test('toSource should exist', (t) => {
  const mapping = setupMapping({type: 'entry'}, {datatypes})

  t.is(typeof mapping.toSource, 'function')
})

test('toSource should return undefined when no data', (t) => {
  const mapping = setupMapping({type: 'entry'}, {datatypes})

  const ret = mapping.toSource()

  t.is(ret, undefined)
})

test('toSource should return mapped data', (t) => {
  const def = {
    type: 'entry',
    path: 'item',
    attributes: {
      id: 'key',
      title: 'type',
      one: {path: 'values.first'},
      two: 'values.second.value',
      createdAt: {path: 'created'},
      updatedAt: 'updated'
    },
    relationships: {
      comments: {path: 'refs.note'}
    }
  }
  const mapping = setupMapping(def, {datatypes})
  const data = {
    id: 'ent1',
    type: 'entry',
    attributes: {
      one: 1,
      two: 2,
      title: 'typish',
      createdAt: new Date('2016-11-01'),
      updatedAt: new Date('2016-11-13')
    },
    relationships: {
      comments: {id: 'no1', type: 'comment'}
    }
  }
  const expected = {
    item: {
      key: 'ent1',
      type: 'typish',
      values: {
        first: 1,
        second: {value: 2}
      },
      created: data.attributes.createdAt,
      updated: data.attributes.updatedAt,
      refs: {note: 'no1'}
    }
  }

  const ret = mapping.toSource(data)

  t.deepEqual(ret, expected)
})

test('toSource should map to given item', (t) => {
  const def = {
    type: 'entry',
    path: 'item',
    attributes: {one: {path: 'values.first'}}
  }
  const mapping = setupMapping(def, {datatypes})
  const target = {existing: true}
  const data = {id: 'ent1', type: 'entry', attributes: {one: 1}}
  const expected = {
    item: {values: {first: 1}},
    existing: true
  }

  const ret = mapping.toSource(data, target)

  t.deepEqual(ret, expected)
})

test('toSource should format attributes', (t) => {
  const def = {
    type: 'entry',
    attributes: {one: {
      path: 'values.first',
      format: [{to: (value) => value + 2}]
    }}
  }
  const mapping = setupMapping(def, {datatypes})
  const data = {id: 'ent1', type: 'entry', attributes: {one: 1}}

  const ret = mapping.toSource(data)

  t.is(ret.values.first, 3)
})

test('toSource should not throw on missing attributes', (t) => {
  const def = {
    type: 'entry',
    attributes: {one: {path: 'values.first'}}
  }
  const mapping = setupMapping(def, {datatypes})
  const data = {id: 'ent1', type: 'entry'}

  t.notThrows(() => {
    mapping.toSource(data)
  })
})

test('toSource should map array of relationships', (t) => {
  const def = {
    type: 'entry',
    relationships: {
      comments: {path: 'item.notes'}
    }
  }
  const mapping = setupMapping(def, {datatypes})
  const data = {
    id: 'ent1',
    type: 'entry',
    relationships: {comments: [
      {id: 'no1', type: 'comment'},
      {id: 'no3', type: 'comment'}
    ]}
  }

  const ret = mapping.toSource(data)

  t.truthy(ret)
  t.deepEqual(ret.item, {notes: ['no1', 'no3']})
})

test('toSource should format relationships', (t) => {
  const def = {
    type: 'entry',
    relationships: {
      comments: {
        path: 'item.note',
        format: [{to: (value) => 'com_' + value}]
      }
    }
  }
  const mapping = setupMapping(def, {datatypes})
  const data = {
    id: 'ent1',
    type: 'entry',
    relationships: {comments: {id: 'no1', type: 'comment'}}
  }

  const ret = mapping.toSource(data)

  t.truthy(ret)
  t.deepEqual(ret.item, {note: 'com_no1'})
})

test('toSource should not throw on missing relationships', (t) => {
  const def = {
    type: 'entry',
    relationships: {comments: {path: 'item.note'}}
  }
  const mapping = setupMapping(def, {datatypes})
  const data = {id: 'ent1', type: 'entry'}

  t.notThrows(() => {
    mapping.toSource(data)
  })
})

test('toSource should transform item', (t) => {
  const def = {
    type: 'entry',
    attributes: {one: {path: 'values.first'}},
    transform: ['first']
  }
  const transformers = {
    first: {to: (item) => ({...item, title: 'First was here'})}
  }
  const mapping = setupMapping(def, {datatypes, transformers})
  const data = {id: 'ent1', type: 'entry', attributes: {one: 1}}

  const ret = mapping.toSource(data)

  t.truthy(ret)
  t.is(ret.title, 'First was here')
})

test('toSource should provide transform function with original data', (t) => {
  const def = {
    type: 'entry',
    attributes: {one: {path: 'values.first'}},
    transform: [{
      to: (item, data) => ({...item, notMapped: data.attributes.notMapped})
    }]
  }
  const mapping = setupMapping(def, {datatypes})
  const data = {id: 'ent1', type: 'entry', attributes: {one: 1, notMapped: 'Original'}}

  const ret = mapping.toSource(data)

  t.is(ret.notMapped, 'Original')
})

test('toSource should return null when filter returns false', (t) => {
  const def = {
    type: 'entry',
    path: 'item',
    attributes: {one: {path: 'values.first'}},
    filterTo: [() => true, () => false]
  }
  const mapping = setupMapping(def, {datatypes})
  const data = {id: 'ent1', type: 'entry', attributes: {one: 1}}

  const ret = mapping.toSource(data, {old: true})

  t.is(ret, null)
})

test('toSource should use data as item when no attr/rel mappers', (t) => {
  const def = {type: 'entry'}
  const mapping = setupMapping(def, {datatypes})
  const data = {
    id: 'item',
    type: 'entry',
    attributes: {
      createdAt: new Date(),
      updatedAt: new Date(),
      title: 'Other entry'
    },
    relationships: {
      author: {id: 'theman', type: 'user'}
    }
  }

  const ret = mapping.toSource(data)

  t.deepEqual(ret, data)
})

test('toSource should use transform when no attr/rel mappers', (t) => {
  const def = {
    type: 'entry',
    transform: [
      {to: (item) => ({...item, custom: 'data'})}
    ]
  }
  const mapping = setupMapping(def, {datatypes})
  const data = {id: 'item', type: 'entry'}

  const ret = mapping.toSource(data)

  t.is(ret.id, 'item')
  t.is(ret.custom, 'data')
})
