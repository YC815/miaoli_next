import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

async function backupSchema() {
  const output: string[] = [];

  output.push('-- Schema backup from Miaoli Next');
  output.push('-- Generated at: ' + new Date().toISOString());
  output.push('');

  try {
    // Get all tables
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename != '_prisma_migrations'
      ORDER BY tablename
    `;

    for (const { tablename } of tables) {
      console.log(`Backing up table: ${tablename}`);

      // Get CREATE TABLE statement
      const createTable = await prisma.$queryRawUnsafe<{ schema_definition: string }[]>(`
        SELECT
          'CREATE TABLE public.' || quote_ident(c.table_name) || E' (\n' ||
          string_agg(
            '  ' || quote_ident(c.column_name) || ' ' ||
            c.data_type ||
            CASE
              WHEN c.character_maximum_length IS NOT NULL
              THEN '(' || c.character_maximum_length || ')'
              ELSE ''
            END ||
            CASE WHEN c.is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
            CASE
              WHEN c.column_default IS NOT NULL
              THEN ' DEFAULT ' || c.column_default
              ELSE ''
            END,
            E',\n'
          ) || E'\n);' as schema_definition
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
        AND c.table_name = '${tablename}'
        GROUP BY c.table_name
      `);

      if (createTable[0]?.schema_definition) {
        output.push(`-- Table: ${tablename}`);
        output.push(createTable[0].schema_definition);
        output.push('');
      }

      // Get indexes
      const indexes = await prisma.$queryRawUnsafe<{ indexdef: string }[]>(`
        SELECT indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename = '${tablename}'
        AND indexname NOT LIKE '%_pkey'
      `);

      for (const { indexdef } of indexes) {
        output.push(indexdef + ';');
      }
      if (indexes.length > 0) output.push('');

      // Get constraints
      const constraints = await prisma.$queryRawUnsafe<{ constraint_def: string }[]>(`
        SELECT
          'ALTER TABLE public.' || quote_ident(tc.table_name) ||
          ' ADD CONSTRAINT ' || quote_ident(tc.constraint_name) ||
          CASE tc.constraint_type
            WHEN 'PRIMARY KEY' THEN ' PRIMARY KEY (' || kcu.column_name || ')'
            WHEN 'FOREIGN KEY' THEN
              ' FOREIGN KEY (' || kcu.column_name || ') REFERENCES ' ||
              quote_ident(ccu.table_name) || '(' || ccu.column_name || ')'
            WHEN 'UNIQUE' THEN ' UNIQUE (' || kcu.column_name || ')'
          END || ';' as constraint_def
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        LEFT JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_schema = 'public'
        AND tc.table_name = '${tablename}'
        AND tc.constraint_type != 'CHECK'
      `);

      for (const { constraint_def } of constraints) {
        output.push(constraint_def);
      }
      if (constraints.length > 0) output.push('');
    }

    fs.writeFileSync('schema_before.sql', output.join('\n'));
    console.log(`\n✓ Schema 備份完成：${output.length} 行寫入 schema_before.sql`);

  } catch (error) {
    console.error('備份失敗:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

backupSchema().catch(console.error);
