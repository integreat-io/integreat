import test from 'node:test'
import assert from 'node:assert/strict'
import mapTransform from 'map-transform'
import Schema from '../../schema/Schema.js'
import createMapOptions from '../../utils/createMapOptions.js'
import type { TransformDefinition } from 'map-transform/types.js'

// Setup

// These tests cover how pipelines registered in `mapOptions` are prepared and
// reused when referenced with `$apply` -- in sub-pipelines, in `$alt` branches,
// nested several levels deep, and across several `mapTransform()` calls that
// share one `mapOptions` object. This is the contract Integreat relies on, and
// the area that changes when map-transform reworks pipeline preparation.
//
// Note: recursive pipelines (a pipeline applying itself, or two pipelines
// applying each other) are deliberately not covered. They overflow the stack
// during preparation, which V8 reports as a fatal error rather than a throw, so
// it cannot be asserted on and would take down the whole test file.

const schemas = new Map()
schemas.set('entry', new Schema({ id: 'entry', shape: { title: 'string' } }))

const pipelines: Record<string, TransformDefinition> = {
  entry: [{ id: 'key' }],
  entryWrapper: [{ id: 'id', sub: { $apply: 'entry' } }],
  entryOuter: [{ outer: { $apply: 'entryWrapper' } }],
  entryFromSub: ['sub', { $apply: 'entry' }],
  keyFromSub: ['sub', { $apply: 'keyValue' }],
  keyValue: ['key'],
  otherValue: ['other'],
  aValues: ['a[]'],
  bValues: ['b[]'],
  castEntry: [{ id: 'key', title: 'header' }, { $cast: 'entry' }],
  castWrapper: [{ item: { $apply: 'castEntry' } }],
}

// Tests -- `$apply` within `$alt`

test('should apply pipeline in a sub-pipeline within $alt', async () => {
  const def = { v: { $alt: [['sub', { $apply: 'entry' }], { $value: null }] } }
  const data = { sub: { key: 'ent1' } }
  const expected = { v: { id: 'ent1' } }

  const ret = await mapTransform(
    def,
    createMapOptions(schemas, pipelines),
  )(data)

  assert.deepEqual(ret, expected)
})

test('should apply pipeline in a sub-pipeline in a later $alt branch', async () => {
  const def = { v: { $alt: ['missing', ['sub', { $apply: 'keyValue' }]] } }
  const data = { sub: { key: 'key1' } }
  const expected = { v: 'key1' }

  const ret = await mapTransform(
    def,
    createMapOptions(schemas, pipelines),
  )(data)

  assert.deepEqual(ret, expected)
})

test('should apply pipeline that itself applies another pipeline as an $alt branch', async () => {
  const def = { v: { $alt: [{ $apply: 'entryFromSub' }, { $value: 'none' }] } }
  const data = { sub: { key: 'ent1' } }
  const expected = { v: { id: 'ent1' } }

  const ret = await mapTransform(
    def,
    createMapOptions(schemas, pipelines),
  )(data)

  assert.deepEqual(ret, expected)
})

test('should apply pipeline that itself applies another pipeline as a later $alt branch', async () => {
  const def = { v: { $alt: ['missing', { $apply: 'keyFromSub' }] } }
  const data = { sub: { key: 'key1' } }
  const expected = { v: 'key1' }

  const ret = await mapTransform(
    def,
    createMapOptions(schemas, pipelines),
  )(data)

  assert.deepEqual(ret, expected)
})

test('should fall through to next $alt branch when applied pipeline yields nonvalue', async () => {
  const def = {
    v: { $alt: [['sub', { $apply: 'keyValue' }], { $value: 'none' }] },
  }
  const data = { sub: { other: 'other1' } }
  const expected = { v: 'none' }

  const ret = await mapTransform(
    def,
    createMapOptions(schemas, pipelines),
  )(data)

  assert.deepEqual(ret, expected)
})

test('should apply pipeline in $alt in reverse', async () => {
  const def = { v: { $alt: [['sub', { $apply: 'entry' }], { $value: null }] } }
  const data = { v: { id: 'ent1' } }
  const expected = { sub: { key: 'ent1' } }

  const ret = await mapTransform(def, createMapOptions(schemas, pipelines))(
    data,
    { rev: true },
  )

  assert.deepEqual(ret, expected)
})

// Tests -- nesting and repetition

test('should apply pipelines nested several levels deep', async () => {
  const def = [{ $apply: 'entryOuter' }]
  const data = { id: 'ent1', key: 'key1' }
  const expected = { outer: { id: 'ent1', sub: { id: 'key1' } } }

  const ret = await mapTransform(
    def,
    createMapOptions(schemas, pipelines),
  )(data)

  assert.deepEqual(ret, expected)
})

test('should apply the same pipeline twice within one mutation', async () => {
  const def = { x: { $apply: 'entry' }, y: { $apply: 'entry' } }
  const data = { key: 'ent1' }
  const expected = { x: { id: 'ent1' }, y: { id: 'ent1' } }

  const ret = await mapTransform(
    def,
    createMapOptions(schemas, pipelines),
  )(data)

  assert.deepEqual(ret, expected)
})

test('should apply pipeline in a sub-pipeline that is iterated', async () => {
  const def = { v: ['items[]', { $iterate: true, $apply: 'entry' }] }
  const data = { items: [{ key: 'ent1' }, { key: 'ent2' }] }
  const expected = { v: [{ id: 'ent1' }, { id: 'ent2' }] }

  const ret = await mapTransform(
    def,
    createMapOptions(schemas, pipelines),
  )(data)

  assert.deepEqual(ret, expected)
})

test('should apply pipelines in both branches of $if', async () => {
  const def = {
    v: {
      $if: 'flag',
      then: { $apply: 'keyValue' },
      else: { $apply: 'otherValue' },
    },
  }
  const mapper = mapTransform(def, createMapOptions(schemas, pipelines))
  const expectedThen = { v: 'key1' }
  const expectedElse = { v: 'other1' }

  const retThen = await mapper({ flag: true, key: 'key1', other: 'other1' })
  const retElse = await mapper({ flag: false, key: 'key1', other: 'other1' })

  assert.deepEqual(retThen, expectedThen)
  assert.deepEqual(retElse, expectedElse)
})

test('should apply pipelines in $concat', async () => {
  const def = { v: { $concat: [{ $apply: 'aValues' }, { $apply: 'bValues' }] } }
  const data = { a: ['a1', 'a2'], b: ['b1'] }
  const expected = { v: ['a1', 'a2', 'b1'] }

  const ret = await mapTransform(
    def,
    createMapOptions(schemas, pipelines),
  )(data)

  assert.deepEqual(ret, expected)
})

test('should cast in a pipeline applied from another pipeline', async () => {
  const def = [{ $apply: 'castWrapper' }]
  const data = { key: 'ent1', header: 'Entry 1' }
  const expected = { item: { id: 'ent1', $type: 'entry', title: 'Entry 1' } }

  const ret = await mapTransform(
    def,
    createMapOptions(schemas, pipelines),
  )(data)

  assert.deepEqual(ret, expected)
})

// Tests -- one `mapOptions` shared by several `mapTransform()` calls

test('should apply pipelines when the inner pipeline is prepared first', async () => {
  const mapOptions = createMapOptions(schemas, pipelines)
  const expectedInner = { id: 'key1' }
  const expectedOuter = { outer: { id: 'ent1', sub: { id: 'key1' } } }

  const retInner = await mapTransform(
    [{ $apply: 'entry' }],
    mapOptions,
  )({
    key: 'key1',
  })
  const retOuter = await mapTransform(
    [{ $apply: 'entryOuter' }],
    mapOptions,
  )({
    id: 'ent1',
    key: 'key1',
  })

  assert.deepEqual(retInner, expectedInner)
  assert.deepEqual(retOuter, expectedOuter)
})

test('should apply pipelines when the outer pipeline is prepared first', async () => {
  const mapOptions = createMapOptions(schemas, pipelines)
  const expectedOuter = { outer: { id: 'ent1', sub: { id: 'key1' } } }
  const expectedInner = { id: 'key1' }

  const retOuter = await mapTransform(
    [{ $apply: 'entryOuter' }],
    mapOptions,
  )({
    id: 'ent1',
    key: 'key1',
  })
  const retInner = await mapTransform(
    [{ $apply: 'entry' }],
    mapOptions,
  )({
    key: 'key1',
  })

  assert.deepEqual(retOuter, expectedOuter)
  assert.deepEqual(retInner, expectedInner)
})

test('should apply the same pipeline forward and in reverse', async () => {
  const def = { x: { $apply: 'entry' } }
  const mapper = mapTransform(def, createMapOptions(schemas, pipelines))
  const expectedFwd = { x: { id: 'ent1' } }
  const expectedRev = { key: 'ent1' }

  const retFwd = await mapper({ key: 'ent1' })
  const retRev = await mapper({ x: { id: 'ent1' } }, { rev: true })

  assert.deepEqual(retFwd, expectedFwd)
  assert.deepEqual(retRev, expectedRev)
})

test('should throw when applying an unknown pipeline', () => {
  const def = [{ $apply: 'unknown' }]
  const mapOptions = createMapOptions(schemas, pipelines)

  const fn = () => mapTransform(def, mapOptions)

  assert.throws(fn, Error)
})
