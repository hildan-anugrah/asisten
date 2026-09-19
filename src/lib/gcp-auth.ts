import { getTokenFromGCPServiceAccount } from '@sagi.io/workers-jwt'
import type { GCPServiceAccount } from '../types'
import { GCP_TOKEN_URI } from '../config'

export async function getGCPAccessToken(serviceAccountJson: string): Promise<string> {
  const sa: GCPServiceAccount = JSON.parse(serviceAccountJson)

  const token = await getTokenFromGCPServiceAccount({
    serviceAccountJSON: sa as Required<GCPServiceAccount>,
    aud: GCP_TOKEN_URI,
    expiredAfter: 3600,
    alg: 'RS256',
    payloadAdditions: {
      scope: 'https://www.googleapis.com/auth/drive.readonly',
    },
  })

  const response = await fetch(GCP_TOKEN_URI, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${token}`,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`GCP token exchange failed: ${error}`)
  }

  const data = (await response.json()) as { access_token: string }
  return data.access_token
}
