import mapTransform from 'map-transform'
import type { Transformer } from 'map-transform/types.js'

export interface Props extends Record<string, unknown> {
  template?: string
  templatePath?: string
}

function forceString(value: unknown, shouldEncode: boolean): string {
  switch (typeof value) {
    case 'string':
      return shouldEncode ? encodeURIComponent(value) : value
    case 'number':
    case 'boolean':
      return String(value)
    default:
      if (Array.isArray(value)) {
        return value.map((val) => forceString(val, shouldEncode)).join(',')
      } else if (value instanceof Date) {
        const dateString = value.toISOString()
        return shouldEncode ? encodeURIComponent(dateString) : dateString
      } else {
        return ''
      }
  }
}

function extractPathModifiers(path: string) {
  if (path[0] === '+') {
    return { path: path.slice(1), dontEncode: true }
  } else {
    return { path }
  }
}

function prepareReplacement(rawPath: string, legacyDontEncode = false) {
  const { path, dontEncode } = extractPathModifiers(rawPath)
  const getFn = mapTransform(path)
  return function get(data: unknown) {
    return forceString(getFn(data), !(dontEncode || legacyDontEncode))
  }
}

function* split(template: string) {
  const parts = template.split(/(\{\{?\{?|\}\}?\}?)/g)
  let index = 0
  while (index < parts.length) {
    const part = parts[index++]
    if (part[0] === '{') {
      const path = parts[index++]
      yield prepareReplacement(path, part.length === 3)
    } else if (part[0] !== '}') {
      yield part
    }
  }
}

const prepareTemplate = (template: unknown) =>
  typeof template === 'string' ? [...split(template)] : undefined

const transformer: Transformer = function generateUri({
  template,
  templatePath,
}: Props) {
  let parts = prepareTemplate(template)
  return () => (data: unknown) => {
    if (templatePath) {
      const templateFromPath = mapTransform(templatePath)(data)
      if (typeof templateFromPath === 'string') {
        parts = prepareTemplate(templateFromPath)
      }
    }

    return parts
      ? parts
          .map((part) => (typeof part === 'function' ? part(data) : part))
          .join('')
      : undefined
  }
}

export default transformer
