import test from 'ava'

import Integreat from './integreat'

// Tests

test('should exist', (t) => {
  t.is(typeof Integreat, 'function')
})

test('class should have version number', (t) => {
  t.is(Integreat.version, '0.1')
})

test('instance should have version number', (t) => {
  const great = new Integreat()

  t.is(great.version, '0.1')
})

// Tests -- adapters

test('getAdapter should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.getAdapter, 'function')
})

test('setAdapter should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.setAdapter, 'function')
})

test('should set and get adapter', (t) => {
  const great = new Integreat()
  const adapter = {}

  great.setAdapter('ad1', adapter)
  const ret = great.getAdapter('ad1')

  t.is(ret, adapter)
})

test('removeAdapter should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.removeAdapter, 'function')
})

test('should remove adapter', (t) => {
  const great = new Integreat()
  great.setAdapter('ad1', {})

  great.removeAdapter('ad1')

  const ret = great.getAdapter('ad1')
  t.is(ret, null)
})

// Tests -- parsers

test('getParser should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.getParser, 'function')
})

test('setParser should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.setParser, 'function')
})

test('should set and get parser', (t) => {
  const great = new Integreat()
  const parser = {}

  great.setParser('pars1', parser)
  const ret = great.getParser('pars1')

  t.is(ret, parser)
})

test('removeParser should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.removeParser, 'function')
})

test('should remove parser', (t) => {
  const great = new Integreat()
  great.setParser('pars1', {})

  great.removeParser('pars1')

  const ret = great.getParser('pars1')
  t.is(ret, null)
})

// Tests -- formatters

test('getFormatter should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.getFormatter, 'function')
})

test('setFormatter should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.setFormatter, 'function')
})

test('should set and get formatter', (t) => {
  const great = new Integreat()
  const formatter = {}

  great.setFormatter('form1', formatter)
  const ret = great.getFormatter('form1')

  t.is(ret, formatter)
})

test('removeFormatter should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.removeFormatter, 'function')
})

test('should remove formatter', (t) => {
  const great = new Integreat()
  great.setFormatter('form1', {})

  great.removeFormatter('form1')

  const ret = great.getFormatter('form1')
  t.is(ret, null)
})

// Tests -- transformers

test('getTransformer should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.getTransformer, 'function')
})

test('setTransformer should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.setTransformer, 'function')
})

test('should set and get transformer', (t) => {
  const great = new Integreat()
  const transformer = {}

  great.setTransformer('trans1', transformer)
  const ret = great.getTransformer('trans1')

  t.is(ret, transformer)
})

test('removeTransformer should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.removeTransformer, 'function')
})

test('should remove transformer', (t) => {
  const great = new Integreat()
  great.setTransformer('trans1', {})

  great.removeTransformer('trans1')

  const ret = great.getTransformer('trans1')
  t.is(ret, null)
})

// Tests -- mappings

test('getMapping should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.getMapping, 'function')
})

test('setMapping should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.setMapping, 'function')
})

test('should set and get mapping', (t) => {
  const great = new Integreat()
  const mapping = {}

  great.setMapping('map1', mapping)
  const ret = great.getMapping('map1')

  t.is(ret, mapping)
})

test('removeMapping should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.removeMapping, 'function')
})

test('should remove mapping', (t) => {
  const great = new Integreat()
  great.setMapping('map1', {})

  great.removeMapping('map1')

  const ret = great.getMapping('map1')
  t.is(ret, null)
})

// Tests -- load defaults

test('loadDefaults should exist', (t) => {
  const great = new Integreat()

  t.is(typeof great.loadDefaults, 'function')
})

test('should load default adapters', (t) => {
  const great = new Integreat()

  great.loadDefaults()

  t.not(great.getAdapter('json'), null)
})

test('should load parsers', (t) => {
  const great = new Integreat()

  great.loadDefaults()

  t.is(typeof great.getParser('date'), 'function')
  t.is(typeof great.getParser('float'), 'function')
  t.is(typeof great.getParser('integer'), 'function')
})
