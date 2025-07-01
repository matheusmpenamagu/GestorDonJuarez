const fs = require('fs');
const path = require('path');

// Importa os dados processados
const records = require('./import-co2-data.cjs');

// Função para fazer requisições à API
async function apiRequest(method, url, data = null) {
  const fetch = (await import('node-fetch')).default;
  
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(`http://localhost:5000${url}`, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HTTP ${response.status}: ${errorText}`);
  }
  
  return response.json();
}

// Função principal para importar dados
async function importData() {
  try {
    console.log('🚀 Iniciando importação de dados de CO2...');
    
    // 1. Buscar unidades existentes
    console.log('📋 Buscando unidades existentes...');
    const existingUnits = await apiRequest('GET', '/api/units');
    const unitMap = {};
    
    existingUnits.forEach(unit => {
      unitMap[unit.name] = unit.id;
    });
    
    console.log('Unidades encontradas:', Object.keys(unitMap));
    
    // 2. Criar unidade "Chopeira" se não existir
    if (!unitMap['Chopeira']) {
      console.log('➕ Criando unidade "Chopeira"...');
      const newUnit = await apiRequest('POST', '/api/units', {
        name: 'Chopeira',
        address: 'Endereço da Chopeira'
      });
      unitMap['Chopeira'] = newUnit.id;
      console.log(`✅ Unidade "Chopeira" criada com ID: ${newUnit.id}`);
    }
    
    // 3. Limpar dados existentes de CO2 (se houver)
    console.log('🧹 Verificando dados existentes de CO2...');
    const existingCo2 = await apiRequest('GET', '/api/co2-refills');
    
    if (existingCo2.length > 0) {
      console.log(`⚠️  Encontrados ${existingCo2.length} registros existentes. Removendo...`);
      for (const refill of existingCo2) {
        await apiRequest('DELETE', `/api/co2-refills/${refill.id}`);
      }
      console.log('✅ Dados existentes removidos');
    }
    
    // 4. Importar dados do CSV
    console.log(`📊 Importando ${records.length} registros...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      try {
        // Mapear unidade para ID
        const unitId = unitMap[record.unidade];
        if (!unitId) {
          throw new Error(`Unidade não encontrada: ${record.unidade}`);
        }
        
        // Criar registro de recarga
        const co2Data = {
          date: record.data.toISOString(),
          supplier: 'Histórico - Importado da planilha',
          kilosRefilled: record.kilosRefilled,
          valuePaid: record.valuePaid,
          unitId: unitId
        };
        
        await apiRequest('POST', '/api/co2-refills', co2Data);
        successCount++;
        
        // Log de progresso a cada 10 registros
        if ((i + 1) % 10 === 0) {
          console.log(`📈 Progresso: ${i + 1}/${records.length} registros processados`);
        }
        
      } catch (error) {
        console.error(`❌ Erro no registro ${i + 1}:`, error.message);
        errorCount++;
      }
    }
    
    // 5. Resumo final
    console.log('\n🎉 Importação concluída!');
    console.log(`✅ Registros importados com sucesso: ${successCount}`);
    console.log(`❌ Registros com erro: ${errorCount}`);
    console.log(`📊 Total processado: ${successCount + errorCount}`);
    
    // 6. Verificar dados importados
    console.log('\n📋 Verificando dados importados...');
    const finalCo2Data = await apiRequest('GET', '/api/co2-refills');
    console.log(`✅ Total de registros no banco: ${finalCo2Data.length}`);
    
    // Estatísticas por unidade
    const stats = {};
    finalCo2Data.forEach(refill => {
      const unitName = refill.unit?.name || 'Desconhecida';
      if (!stats[unitName]) {
        stats[unitName] = { count: 0, totalKg: 0, totalValue: 0 };
      }
      stats[unitName].count++;
      stats[unitName].totalKg += parseFloat(refill.kilosRefilled);
      stats[unitName].totalValue += parseFloat(refill.valuePaid);
    });
    
    console.log('\n📈 Estatísticas finais por unidade:');
    Object.entries(stats).forEach(([unit, data]) => {
      console.log(`${unit}: ${data.count} recargas, ${data.totalKg}kg, R$ ${data.totalValue.toFixed(2)}`);
    });
    
  } catch (error) {
    console.error('💥 Erro durante a importação:', error.message);
    process.exit(1);
  }
}

// Executar importação
if (require.main === module) {
  importData();
}