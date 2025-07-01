const fs = require('fs');
const path = require('path');

// Lê o arquivo CSV diretamente
const csvPath = path.join(__dirname, 'attached_assets', 'Controle Recarga CO2_1751342972604.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parse do CSV
const lines = csvContent.split('\n').slice(1); // Remove header
const records = [];

lines.forEach((line, index) => {
  if (!line.trim()) return; // Pula linhas vazias
  
  // Parse manual para lidar com valores entre aspas
  const parts = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  
  if (parts.length === 4) {
    const [unidade, data, qtde, valor] = parts;
    
    // Processa a data (formato dd/mm/yyyy)
    const [day, month, year] = data.split('/');
    const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    // Processa o valor (remove R$, espaços e troca vírgula por ponto)
    const valorNumerico = parseFloat(
      valor.replace('R$', '').replace(/\s/g, '').replace(',', '.')
    );
    
    // Processa quantidade
    const qtdeNumerico = parseFloat(qtde);
    
    records.push({
      unidade: unidade.trim(),
      data: dateObj,
      kilosRefilled: qtdeNumerico,
      valuePaid: valorNumerico
    });
  }
});

// Mapeamento de unidades (normalizando nomes)
const unitMapping = {
  'Fábrica': 'Fábrica',
  'Fabrica': 'Fábrica',
  'fábrica': 'Fábrica',
  'Fabrica ': 'Fábrica',
  'Beer Truck': 'Beer Truck',
  'Beer Truck (fabrica)': 'Beer Truck',
  'Chopeira': 'Chopeira',
  'Chopeiras': 'Chopeira',
  'Grao Para': 'Don Juarez Grão Pará',
  'Grão Para': 'Don Juarez Grão Pará',
  'Grão Para ': 'Don Juarez Grão Pará'
};

// Mapeamento de IDs das unidades (baseado no que já existe no banco)
const unitIds = {
  'Fábrica': 2,
  'Beer Truck': 3,
  'Don Juarez Grão Pará': 1,
  'Chopeira': 4
};

// Normaliza os nomes das unidades e adiciona IDs
const normalizedRecords = records.map(record => {
  const normalizedName = unitMapping[record.unidade] || record.unidade;
  return {
    ...record,
    unidade: normalizedName,
    unitId: unitIds[normalizedName]
  };
}).filter(record => record.unitId); // Remove registros sem unidade válida

// Função para fazer requisições à API em lote
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

// Função principal para importar dados em lotes
async function importDataFast() {
  try {
    console.log(`🚀 Importação rápida de ${normalizedRecords.length} registros...`);
    
    // Limpar dados existentes primeiro
    console.log('🧹 Limpando dados existentes...');
    const existingCo2 = await apiRequest('GET', '/api/co2-refills');
    
    for (const refill of existingCo2) {
      await apiRequest('DELETE', `/api/co2-refills/${refill.id}`);
    }
    
    console.log('✅ Dados existentes removidos');
    
    // Importar em lotes de 5 para não sobrecarregar
    const batchSize = 5;
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < normalizedRecords.length; i += batchSize) {
      const batch = normalizedRecords.slice(i, i + batchSize);
      
      // Processa batch em paralelo
      const promises = batch.map(async (record, index) => {
        try {
          const co2Data = {
            date: record.data.toISOString(),
            supplier: 'Histórico - Importado da planilha',
            kilosRefilled: record.kilosRefilled,
            valuePaid: record.valuePaid,
            unitId: record.unitId
          };
          
          await apiRequest('POST', '/api/co2-refills', co2Data);
          return { success: true, record: i + index + 1 };
        } catch (error) {
          console.error(`❌ Erro no registro ${i + index + 1}:`, error.message);
          return { success: false, record: i + index + 1 };
        }
      });
      
      const results = await Promise.all(promises);
      
      results.forEach(result => {
        if (result.success) {
          successCount++;
        } else {
          errorCount++;
        }
      });
      
      console.log(`📈 Progresso: ${Math.min(i + batchSize, normalizedRecords.length)}/${normalizedRecords.length} processados`);
      
      // Pequena pausa entre lotes
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log('\n🎉 Importação concluída!');
    console.log(`✅ Registros importados: ${successCount}`);
    console.log(`❌ Registros com erro: ${errorCount}`);
    
    // Verificação final
    const finalData = await apiRequest('GET', '/api/co2-refills');
    console.log(`📊 Total no banco: ${finalData.length} registros`);
    
  } catch (error) {
    console.error('💥 Erro durante a importação:', error.message);
    process.exit(1);
  }
}

// Executar importação
if (require.main === module) {
  importDataFast();
}