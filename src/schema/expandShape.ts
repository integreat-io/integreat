import { isShape } from '../utils/is.js'
import type { Shape, ShapeDef, FieldDefinition } from './types.js'

const expandField = (val: ShapeDef | FieldDefinition | string | undefined) =>
  typeof val === 'string'
    ? { $type: val }
    : isShape(val)
    ? expandFields(val)
    : val

function expandFields(shapeDef: ShapeDef): Shape {
  return Object.fromEntries(
    Object.entries(shapeDef).map(
      ([key, def]) => (def ? [key, expandField(def)] : []),
      {}
    )
  )
}

function validateShape(shape: Shape) {
  const errors = []
  if (shape.id && shape.id.$type !== 'string') {
    errors.push("'id' must be a string")
  }
  if (shape.createdAt && shape.createdAt.$type !== 'date') {
    errors.push("'createdAt' must be a date")
  }
  if (shape.updatedAt && shape.updatedAt.$type !== 'date') {
    errors.push("'updatedAt' must be a date")
  }

  return errors.length > 0 ? errors.join('. ') : undefined
}

export default function expandShape(shapeDef: ShapeDef): Shape {
  const shape: Shape = expandFields(shapeDef)

  // Check that the fields with special meaning are of the correct type if present
  const validationError = validateShape(shape)
  if (validationError) {
    throw new Error(validationError)
  }

  // Add the id field if missing
  if (!shape.id) {
    shape.id = { $type: 'string' }
  }

  return shape
}
