const createCastOperation = ({ $cast, ...props }: Record<string, unknown>) => ({
  ...props,
  $transform: `cast_${$cast}`,
})

export default function modifyOperationObject(
  operation: Record<string, unknown>
): Record<string, unknown> {
  if (operation.hasOwnProperty('$cast')) {
    return createCastOperation(operation)
  }

  return operation
}
