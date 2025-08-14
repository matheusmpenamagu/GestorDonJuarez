#!/usr/bin/env node

/**
 * Script para configurar schemas separados no mesmo banco de dados
 * Cria schemas 'development' e 'production' para isolamento dos dados
 */

import { Pool } from '@neondatabase/serverless';
import ws from 'ws';
import { neonConfig } from '@neondatabase/serverless';

neonConfig.webSocketConstructor = ws;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL não definida');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function setupSchemas() {
  try {
    console.log('🗄️ === CONFIGURANDO SCHEMAS SEPARADOS ===\n');
    
    // Criar schemas
    console.log('📁 Criando schemas...');
    await pool.query('CREATE SCHEMA IF NOT EXISTS development');
    await pool.query('CREATE SCHEMA IF NOT EXISTS production');
    console.log('✅ Schemas criados: development, production\n');
    
    // Listar tabelas no schema público atual
    const tables = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    
    console.log('📋 Copiando estrutura de tabelas...');
    for (const table of tables.rows) {
      const tableName = table.tablename;
      
      // Copiar estrutura para development
      await pool.query(`
        CREATE TABLE development.${tableName} 
        (LIKE public.${tableName} INCLUDING ALL)
      `);
      
      // Copiar estrutura para production  
      await pool.query(`
        CREATE TABLE production.${tableName} 
        (LIKE public.${tableName} INCLUDING ALL)
      `);
      
      console.log(`   ✅ ${tableName} → development, production`);
    }
    
    // Copiar dados atuais para development
    console.log('\n📋 Copiando dados para schema development...');
    for (const table of tables.rows) {
      const tableName = table.tablename;
      await pool.query(`
        INSERT INTO development.${tableName} 
        SELECT * FROM public.${tableName}
      `);
      
      const count = await pool.query(`SELECT COUNT(*) FROM development.${tableName}`);
      console.log(`   ✅ ${tableName}: ${count.rows[0].count} registros`);
    }
    
    console.log('\n🎉 === CONFIGURAÇÃO CONCLUÍDA ===');
    console.log('📊 Resumo:');
    console.log('   • Schema development: Dados atuais copiados');
    console.log('   • Schema production: Estrutura criada (vazia)');
    console.log('   • Schema public: Dados originais mantidos');
    console.log('\n💡 Próximos passos:');
    console.log('   1. Atualizar código para usar schemas específicos');
    console.log('   2. Configurar NODE_ENV para determinar schema');
    console.log('   3. Testar em ambiente de desenvolvimento');
    
  } catch (error) {
    console.error('\n❌ === ERRO NA CONFIGURAÇÃO ===');
    console.error(error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n🔌 Conexão encerrada');
  }
}

setupSchemas();