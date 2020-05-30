import httpTransporter from './transporter'

export const transporter = httpTransporter

export default {
  transporters: {
    http: httpTransporter,
  },
}
