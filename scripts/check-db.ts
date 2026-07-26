import { Client } from 'pg';
import { execSync } from 'child_process';

// 获取 PGDATABASE_URL
const pythonCode = `
import os
import sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        if env_var.key == 'PGDATABASE_URL':
            print(env_var.value)
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
`;

const dbUrl = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
  encoding: 'utf-8',
  timeout: 10000,
}).trim();

async function main() {
  const client = new Client(dbUrl);
  await client.connect();

  // 查现有表
  const res = await client.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log('Tables in public schema:');
  res.rows.forEach((row: any) => console.log('  -', row.table_name));

  await client.end();
}

main();
