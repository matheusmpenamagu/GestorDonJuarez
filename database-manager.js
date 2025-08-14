#!/usr/bin/env node

/**
 * Gerenciador de Banco de Dados - Don Juarez
 * Permite alternar entre ambiente de desenvolvimento e produção
 */

import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const args = process.argv.slice(2);
const command = args[0];

const DEVELOPMENT_DB = process.env.DATABASE_URL;
const PRODUCTION_DB = process.env.PRODUCTION_DATABASE_URL || process.env.DATABASE_URL;

async function showStatus() {
  console.log('🗄️ === STATUS DOS BANCOS DE DADOS ===\n');
  
  try {
    const devPool = new Pool({ connectionString: DEVELOPMENT_DB });
    const devResult = await devPool.query('SELECT COUNT(*) FROM products');
    console.log('📊 DESENVOLVIMENTO:');
    console.log(`   🔗 Host: ${DEVELOPMENT_DB.split('@')[1]?.split('/')[0] || 'desenvolvimento'}`);
    console.log(`   📦 Produtos: ${devResult.rows[0].count}`);
    await devPool.end();
  } catch (error) {
    console.log('❌ DESENVOLVIMENTO: Erro de conexão');
  }
  
  try {
    const prodPool = new Pool({ connectionString: PRODUCTION_DB });
    const prodResult = await prodPool.query('SELECT COUNT(*) FROM products');
    console.log('\n📊 PRODUÇÃO:');
    console.log(`   🔗 Host: ${PRODUCTION_DB.split('@')[1]?.split('/')[0] || 'produção'}`);
    console.log(`   📦 Produtos: ${prodResult.rows[0].count}`);
    await prodPool.end();
  } catch (error) {
    console.log('\n❌ PRODUÇÃO: Erro de conexão');
  }
  
  console.log(`\n🌍 Ambiente atual: ${process.env.NODE_ENV === 'production' ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);
}

async function syncToProd() {
  console.log('🔄 Sincronizando dados para produção...');
  
  const devPool = new Pool({ connectionString: DEVELOPMENT_DB });
  const prodPool = new Pool({ connectionString: PRODUCTION_DB });
  
  try {
    // Copiar apenas produtos atualizados recentemente
    const recentProducts = await devPool.query(`
      SELECT * FROM products 
      WHERE updated_at > NOW() - INTERVAL '1 day' 
      OR created_at > NOW() - INTERVAL '1 day'
    `);
    
    if (recentProducts.rows.length === 0) {
      console.log('ℹ️  Nenhum produto novo ou atualizado nas últimas 24h');
      return;
    }
    
    console.log(`📋 Sincronizando ${recentProducts.rows.length} produtos...`);
    
    for (const product of recentProducts.rows) {
      await prodPool.query(`
        INSERT INTO products (id, code, name, stock_category_id, unit_of_measure, current_value, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          stock_category_id = EXCLUDED.stock_category_id,
          unit_of_measure = EXCLUDED.unit_of_measure,
          current_value = EXCLUDED.current_value,
          updated_at = EXCLUDED.updated_at
      `, [
        product.id, product.code, product.name, 
        product.stock_category_id, product.unit_of_measure, 
        product.current_value, product.created_at, product.updated_at
      ]);
    }
    
    console.log('✅ Sincronização concluída');
    
  } catch (error) {
    console.error('❌ Erro na sincronização:', error.message);
  } finally {
    await devPool.end();
    await prodPool.end();
  }
}

async function setEnvironment(env) {
  const envFile = '.env';
  const fs = await import('fs');
  
  let envContent = '';
  if (fs.existsSync(envFile)) {
    envContent = fs.readFileSync(envFile, 'utf8');
  }
  
  // Atualizar NODE_ENV
  if (envContent.includes('NODE_ENV=')) {
    envContent = envContent.replace(/NODE_ENV=.*/g, `NODE_ENV=${env}`);
  } else {
    envContent += `\nNODE_ENV=${env}`;
  }
  
  fs.writeFileSync(envFile, envContent);
  console.log(`✅ Ambiente alterado para: ${env.toUpperCase()}`);
  console.log('⚠️  Reinicie a aplicação para aplicar as mudanças');
}

function showHelp() {
  console.log('🔧 === GERENCIADOR DE BANCO DE DADOS ===\n');
  console.log('Comandos disponíveis:');
  console.log('  status       - Mostra status dos bancos');
  console.log('  sync         - Sincroniza dados para produção');
  console.log('  dev          - Altera para ambiente de desenvolvimento');
  console.log('  prod         - Altera para ambiente de produção');
  console.log('  help         - Mostra esta ajuda\n');
  console.log('Exemplos:');
  console.log('  node database-manager.js status');
  console.log('  node database-manager.js sync');
  console.log('  node database-manager.js prod');
}

// Executar comando
switch (command) {
  case 'status':
    await showStatus();
    break;
  case 'sync':
    await syncToProd();
    break;
  case 'dev':
    await setEnvironment('development');
    break;
  case 'prod':
    await setEnvironment('production');
    break;
  case 'help':
  case undefined:
    showHelp();
    break;
  default:
    console.log(`❌ Comando desconhecido: ${command}`);
    showHelp();
}