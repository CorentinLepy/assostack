import { sql } from '@payloadcms/db-postgres'
import config from '@payload-config'
import { getPayload } from 'payload'

export const checkDatabaseReadiness = async (): Promise<void> => {
  const payload = await getPayload({ config })
  await payload.db.drizzle.execute(sql`SELECT 1`)
}
