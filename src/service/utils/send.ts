import { createErrorResponse, setOrigin } from '../../utils/response.js'
import type Connection from '../Connection.js'
import type { Action, Response, Transporter } from '../../types.js'

export const sendToTransporter = (
  transporter: Transporter,
  connection: Connection,
  serviceId: string
) =>
  async function send(action: Action): Promise<Response> {
    try {
      if (await connection.connect(action.meta?.auth)) {
        return setOrigin(
          await transporter.send(action, connection.object),
          `service:${serviceId}`,
          true
        )
      } else {
        return createErrorResponse(
          `Could not connect to service '${serviceId}'. [${
            connection.status
          }] ${connection.error || ''}`.trim(),
          `service:${serviceId}`
        )
      }
    } catch (error) {
      return createErrorResponse(
        `Error retrieving from service '${serviceId}': ${
          (error as Error).message
        }`,
        `service:${serviceId}`
      )
    }
  }
