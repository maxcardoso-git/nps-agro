/**
 * Import contacts from CSV into core.respondent + core.account.
 *
 * Usage:
 *   npx ts-node scripts/import-contacts.ts \
 *     --tenant=<tenant_id> \
 *     --campaign=<campaign_id> \
 *     --file=<path_to_csv>
 *
 * CSV format: semicolon-separated with columns:
 *   codigo;conta;nome;celular;Cargo;tipo_persona
 */

import { readFileSync } from 'fs';
import { Pool } from 'pg';

const args = process.argv.slice(2);
function getArg(name: string): string {
  const entry = args.find((a) => a.startsWith(`--${name}=`));
  if (!entry) {
    console.error(`Missing --${name} argument`);
    process.exit(1);
  }
  return entry.split('=')[1];
}

const tenantId = getArg('tenant');
const campaignId = getArg('campaign');
const filePath = getArg('file');

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const raw = readFileSync(filePath, 'utf-8');
  const lines = raw.split('\n').filter((l) => l.trim());
  const header = lines[0].split(';').map((h) => h.trim().toLowerCase());
  const rows = lines.slice(1);

  const colIdx = (name: string) => header.indexOf(name);
  const iCodigo = colIdx('codigo');
  const iConta = colIdx('conta');
  const iNome = colIdx('nome');
  const iCelular = colIdx('celular');
  const iCargo = colIdx('cargo');
  const iTipo = colIdx('tipo_persona');

  console.log(`Importing ${rows.length} contacts for tenant=${tenantId} campaign=${campaignId}`);

  // Cache accounts by name -> id
  const accountCache = new Map<string, string>();

  let imported = 0;
  let skipped = 0;

  for (const line of rows) {
    const cols = line.split(';').map((c) => c.trim());
    const codigo = cols[iCodigo] || null;
    const conta = cols[iConta] || null;
    const nome = cols[iNome] || null;
    const celular = cols[iCelular] || null;
    const cargo = iCargo >= 0 ? cols[iCargo] || null : null;
    const tipo = iTipo >= 0 ? cols[iTipo] || null : null;

    if (!nome) {
      skipped++;
      continue;
    }

    // Upsert account
    let accountId: string | null = null;
    if (conta) {
      if (accountCache.has(conta)) {
        accountId = accountCache.get(conta)!;
      } else {
        const result = await pool.query(
          `INSERT INTO core.account (tenant_id, name)
           VALUES ($1, $2)
           ON CONFLICT (tenant_id, name) DO UPDATE SET updated_at = NOW()
           RETURNING id`,
          [tenantId, conta],
        );
        accountId = result.rows[0].id;
        accountCache.set(conta, accountId!);
      }
    }

    // Insert respondent
    await pool.query(
      `INSERT INTO core.respondent
       (tenant_id, campaign_id, external_id, name, phone, account_id, job_title, persona_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT DO NOTHING`,
      [tenantId, campaignId, codigo, nome, celular, accountId, cargo, tipo],
    );

    imported++;
  }

  console.log(`Done. Imported: ${imported}, Skipped: ${skipped}, Accounts: ${accountCache.size}`);
  await pool.end();
}

main().catch((err) => {
  console.error('Import failed:', err);
  process.exit(1);
});
