const createCastOperation = ({ $cast, ...props }: Record<string, unknown>) => ({
  ...props,
  $transform: Symbol.for(`cast_${$cast}`),
})

export default function modifyOperationObject(
  operation: Record<string, unknown>,
): Record<string, unknown> {
  if (Object.prototype.hasOwnProperty.call(operation, '$cast')) {
    return createCastOperation(operation)
  }

  return operation
}
