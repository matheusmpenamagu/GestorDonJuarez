const fs = require('fs');
const path = require('path');

// Lê o arquivo CSV
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

// Normaliza os nomes das unidades
const normalizedRecords = records.map(record => ({
  ...record,
  unidade: unitMapping[record.unidade] || record.unidade
}));

console.log('Dados processados:');
console.log(`Total de registros: ${normalizedRecords.length}`);

// Agrupa por unidade para estatísticas
const unidadeStats = {};
normalizedRecords.forEach(record => {
  if (!unidadeStats[record.unidade]) {
    unidadeStats[record.unidade] = { count: 0, totalKg: 0, totalValue: 0 };
  }
  unidadeStats[record.unidade].count++;
  unidadeStats[record.unidade].totalKg += record.kilosRefilled;
  unidadeStats[record.unidade].totalValue += record.valuePaid;
});

console.log('\nEstatísticas por unidade:');
Object.entries(unidadeStats).forEach(([unidade, stats]) => {
  console.log(`${unidade}: ${stats.count} recargas, ${stats.totalKg}kg, R$ ${stats.totalValue.toFixed(2)}`);
});

// Exporta os dados processados
module.exports = normalizedRecords;

// Se executado diretamente, mostra os dados
if (require.main === module) {
  console.log('\nPrimeiros 5 registros:');
  normalizedRecords.slice(0, 5).forEach((record, i) => {
    console.log(`${i + 1}. ${record.unidade} - ${record.data.toISOString().split('T')[0]} - ${record.kilosRefilled}kg - R$ ${record.valuePaid.toFixed(2)}`);
  });
}