/* eslint-disable security/detect-object-injection */
import sax = require('sax')
import { Namespaces, Element, ObjectElement } from '.'

interface SaxAttribute {
  name: string
  value: string
  prefix: string
  local: string
  uri: string
}

interface SaxElement {
  name: string
  prefix: string
  local: string
  uri: string
  attributes: Record<string, SaxAttribute>
}

const DEFAULT_NAMESPACES = {
  'http://schemas.xmlsoap.org/soap/envelope/': 'soap',
  'http://www.w3.org/2003/05/soap-envelope': 'soap',
}

function setOnElement(
  stack: (Element | null)[],
  key: string,
  element: Element | null
) {
  const parent = stack[stack.length - 1]
  if (parent) {
    const existing = parent[key]
    if (existing && element) {
      if (Array.isArray(existing)) {
        existing.push(element)
      } else {
        parent[key] = [existing as Element, element]
      }
    } else {
      parent[key] = element
    }
  }
}

const generateKey = (
  namespaces: Namespaces,
  key: string,
  prefix: string,
  uri: string
) => [namespaces[uri] ?? prefix, key].filter(Boolean).join(':')

const parseAttribute = (namespaces: Namespaces, elementUri: string) => ([
  _key,
  { local, prefix, uri, value },
]: [string, SaxAttribute]): [string, string] => [
  `@${generateKey(namespaces, local, prefix, uri || elementUri)}`,
  value,
]

const isNilAttribute = (local: string, uri: string) =>
  local === 'nil' && uri === 'http://www.w3.org/2001/XMLSchema-instance'

const shouldIncludeAttribute = ([_key, { prefix, local, uri }]: [
  string,
  SaxAttribute
]) => prefix !== 'xmlns' && !isNilAttribute(local, uri)

const isNullElement = (attrEntries: [string, SaxAttribute][]) =>
  attrEntries.some(([_key, { local, uri }]) => isNilAttribute(local, uri))

function parseXml(xml: string, namespaces: Namespaces) {
  const stack: (Element | null)[] = [{}]

  const parser = sax.parser(true, { trim: true, xmlns: true }) // strict mode

  // Create tag element, set it on the `name` key on its parent, and push it to
  // the stack
  parser.onopentag = (node) => {
    const { local, prefix, uri, attributes } = node as SaxElement
    const attrRawEntries = Object.entries(attributes)
    const attrEntries = attrRawEntries
      .filter(shouldIncludeAttribute)
      .map(parseAttribute(namespaces, uri))

    const element: ObjectElement | null =
      attrEntries.length === 0 && isNullElement(attrRawEntries)
        ? null
        : Object.fromEntries(attrEntries)
    setOnElement(stack, generateKey(namespaces, local, prefix, uri), element)
    stack.push(element)
  }

  // Set text on the `$value` key on its parent
  parser.ontext = (text) => {
    const element = stack[stack.length - 1]
    if (element) {
      element.$value = text
    }
  }

  // Pop tag element from stack. Set an empty string as value if the element is
  // empty
  parser.onclosetag = () => {
    const element = stack.pop()
    if (element && Object.keys(element).length === 0) {
      element.$value = ''
    }
  }

  try {
    // Start parsing. Result will be on the stack
    parser.write(xml).close()
  } catch {
    return undefined // TODO: Provide better error handling?
  }

  return stack.pop() || undefined
}

/**
 * Parse XML string.
 * Returns an object starting from the path set on the request endpoint.
 */
export default function parse(
  data: unknown,
  namespaces: Namespaces = {}
): ObjectElement | undefined {
  if (typeof data === 'string') {
    return parseXml(data, { ...DEFAULT_NAMESPACES, ...namespaces })
  }
  return undefined
}
