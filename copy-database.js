#!/usr/bin/env node

/**
 * Script para copiar dados do banco de desenvolvimento para produção
 * Cria uma réplica completa do banco atual para uso em produção
 */

import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const DEVELOPMENT_DB = process.env.DATABASE_URL;
const PRODUCTION_DB = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL; // Fallback para o novo banco

if (!DEVELOPMENT_DB) {
  console.error('❌ DATABASE_URL não definida para o banco de desenvolvimento');
  process.exit(1);
}

console.log('🔄 Iniciando cópia do banco de desenvolvimento para produção...');
console.log(`📍 Origem: ${DEVELOPMENT_DB.split('@')[1]?.split('/')[0] || 'desenvolvimento'}`);
console.log(`📍 Destino: ${PRODUCTION_DB.split('@')[1]?.split('/')[0] || 'produção'}`);

// Conexões com os bancos
const devPool = new Pool({ connectionString: DEVELOPMENT_DB });
const prodPool = new Pool({ connectionString: PRODUCTION_DB });

const tables = [
  'roles',
  'users', 
  'employees',
  'units',
  'points_of_sale',
  'beer_styles',
  'devices',
  'taps',
  'product_categories',
  'products',
  'product_units',
  'stock_counts',
  'stock_count_items',
  'pour_events',
  'keg_change_events',
  'co2_refills',
  'cash_register_closures',
  'freelancer_time_entries',
  'checklist_templates',
  'checklist_instances',
  'checklist_items',
  'checklist_responses',
  'settings',
  'sessions'
];

async function copyTable(tableName) {
  try {
    console.log(`📋 Copiando tabela: ${tableName}`);
    
    // Buscar dados da origem
    const devResult = await devPool.query(`SELECT * FROM ${tableName}`);
    const rows = devResult.rows;
    
    if (rows.length === 0) {
      console.log(`   ℹ️  Tabela ${tableName} está vazia`);
      return;
    }
    
    // Limpar tabela de destino
    await prodPool.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);
    
    // Obter colunas da tabela
    const columns = Object.keys(rows[0]);
    const columnList = columns.join(', ');
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    
    // Inserir dados em lotes
    const batchSize = 100;
    let totalInserted = 0;
    
    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      
      for (const row of batch) {
        const values = columns.map(col => row[col]);
        await prodPool.query(
          `INSERT INTO ${tableName} (${columnList}) VALUES (${placeholders})`,
          values
        );
        totalInserted++;
      }
    }
    
    console.log(`   ✅ ${tableName}: ${totalInserted} registros copiados`);
    
  } catch (error) {
    console.error(`   ❌ Erro ao copiar tabela ${tableName}:`, error.message);
    throw error;
  }
}

async function copyDatabase() {
  try {
    console.log('\n🗄️ === INICIANDO CÓPIA DO BANCO DE DADOS ===\n');
    
    // Verificar conexões
    await devPool.query('SELECT 1');
    await prodPool.query('SELECT 1');
    console.log('✅ Conexões com ambos os bancos estabelecidas\n');
    
    // Copiar tabelas na ordem correta (respeitando foreign keys)
    for (const tableName of tables) {
      await copyTable(tableName);
    }
    
    // Atualizar sequences
    console.log('\n🔢 Atualizando sequences...');
    for (const tableName of tables) {
      try {
        // Verificar se a tabela tem uma coluna 'id' serial
        const hasId = await prodPool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1 AND column_name = 'id' AND column_default LIKE 'nextval%'
        `, [tableName]);
        
        if (hasId.rows.length > 0) {
          await prodPool.query(`
            SELECT setval(pg_get_serial_sequence($1, 'id'), 
                         COALESCE(MAX(id), 1)) 
            FROM ${tableName}
          `, [tableName]);
          console.log(`   ✅ Sequence atualizada para ${tableName}`);
        }
      } catch (error) {
        console.log(`   ⚠️  Não foi possível atualizar sequence para ${tableName}: ${error.message}`);
      }
    }
    
    console.log('\n🎉 === CÓPIA CONCLUÍDA COM SUCESSO ===');
    console.log('📊 Verificação de dados:');
    
    // Contar registros em ambos os bancos
    for (const tableName of ['products', 'employees', 'units', 'product_categories']) {
      const devCount = await devPool.query(`SELECT COUNT(*) FROM ${tableName}`);
      const prodCount = await prodPool.query(`SELECT COUNT(*) FROM ${tableName}`);
      console.log(`   ${tableName}: ${devCount.rows[0].count} (dev) → ${prodCount.rows[0].count} (prod)`);
    }
    
  } catch (error) {
    console.error('\n❌ === ERRO NA CÓPIA ===');
    console.error(error);
    process.exit(1);
  } finally {
    await devPool.end();
    await prodPool.end();
    console.log('\n🔌 Conexões encerradas');
  }
}

// Executar cópia
copyDatabase();