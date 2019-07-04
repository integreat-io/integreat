const appendToAction = (action, payloadProps) => ({
  ...action,
  payload: { ...action.payload, ...payloadProps }
})

export default appendToAction
