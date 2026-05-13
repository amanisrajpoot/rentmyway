
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf8')
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const [key, ...val] = line.split('=')
      return [key.trim(), val.join('=').trim()]
    })
)

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase env vars in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log('--- Testing Publicly Available Data ---')
  
  // Checking tenants with kyc_token policy
  const { data: tenants } = await supabase.from('tenants').select('id, name, kyc_token').limit(5)
  console.log('Tenants:', tenants)

  // Checking properties
  const { data: properties } = await supabase.from('properties').select('id, title, status').limit(5)
  console.log('Properties:', properties)
}

test()
