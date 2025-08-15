const fs = require('fs');
const path = require('path');

// Helper function to parse Brazilian currency format
function parseCurrency(value) {
  if (!value || value === '') return 0;
  
  // Remove R$, spaces, and convert comma to dot
  const cleaned = value
    .replace(/R\$\s*/g, '')
    .replace(/\./g, '')  // Remove thousands separator
    .replace(',', '.')   // Convert decimal comma to dot
    .replace(/[^\d.-]/g, ''); // Remove any non-numeric chars except - and .
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

// Helper function to parse date
function parseDate(dateStr) {
  if (!dateStr) return null;
  
  // Expected format: DD/MM/YYYY
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;
  
  const day = parseInt(parts[0]);
  const month = parseInt(parts[1]) - 1; // JS months are 0-based
  const year = parseInt(parts[2]);
  
  return new Date(year, month, day);
}

// Unit mapping based on CSV file names and database
const unitMapping = {
  'GP': { id: 1, name: 'Don Juarez Grão Pará' },   // Grão Pará
  'BT': { id: 3, name: 'Beer Truck' },              // Beer Truck  
  'AP': { id: 5, name: 'Apollonio' }                // Apollonio
};

function processCSVFile(filePath, unitCode) {
  console.log(`\n=== Processing ${filePath} ===`);
  
  const unit = unitMapping[unitCode];
  if (!unit) {
    console.error(`Unknown unit code: ${unitCode}`);
    return [];
  }
  
  const csvContent = fs.readFileSync(filePath, 'utf8');
  const lines = csvContent.split('\n');
  const results = [];
  
  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const columns = line.split(',');
    if (columns.length < 4) continue;
    
    const dateStr = columns[0]?.trim();
    const initialFund = parseCurrency(columns[2]);
    const cashSales = parseCurrency(columns[3]);
    const withdrawals = parseCurrency(columns[4]);
    const notes = columns[6] || null;
    
    const date = parseDate(dateStr);
    if (!date) {
      console.log(`Skipping row ${i}: Invalid date ${dateStr}`);
      continue;
    }
    
    const record = {
      datetime: date.toISOString(),
      unitId: unit.id,
      operation: 'fechamento',
      initialFund: initialFund,
      cashSales: cashSales,
      withdrawals: withdrawals,
      debitSales: 0, // Not in CSV
      creditSales: 0, // Not in CSV  
      pixSales: 0, // Not in CSV
      createdBy: 'admin-import',
      notes: notes
    };
    
    results.push(record);
    console.log(`✓ ${dateStr} - Unit: ${unit.name} - Cash: R$ ${cashSales.toFixed(2)}`);
  }
  
  console.log(`Total records processed: ${results.length}`);
  return results;
}

function main() {
  console.log('🔄 Starting Cash Register Closures Import');
  
  const files = [
    { path: 'attached_assets/Fechamento caixa 2025 - GP_1753755499750.csv', unit: 'GP' },
    { path: 'attached_assets/Fechamento caixa 2025 - BT_1753755876049.csv', unit: 'BT' },
    { path: 'attached_assets/Fechamento caixa 2025 - AP_1753755876049.csv', unit: 'AP' }
  ];
  
  const allRecords = [];
  
  for (const file of files) {
    if (fs.existsSync(file.path)) {
      const records = processCSVFile(file.path, file.unit);
      allRecords.push(...records);
    } else {
      console.error(`File not found: ${file.path}`);
    }
  }
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`Total records to import: ${allRecords.length}`);
  
  // Group by unit
  const byUnit = allRecords.reduce((acc, record) => {
    const unitName = Object.values(unitMapping).find(u => u.id === record.unitId)?.name || 'Unknown';
    if (!acc[unitName]) acc[unitName] = 0;
    acc[unitName]++;
    return acc;
  }, {});
  
  Object.entries(byUnit).forEach(([unit, count]) => {
    console.log(`  ${unit}: ${count} records`);
  });
  
  // Write SQL file
  const sqlLines = [
    '-- Cash Register Closures Import',
    '-- Generated automatically from CSV files',
    '',
    'INSERT INTO cash_register_closures (',
    '  datetime, unit_id, operation, initial_fund, cash_sales, withdrawals,',
    '  debit_sales, credit_sales, pix_sales, created_by, notes, created_at, updated_at',
    ') VALUES'
  ];
  
  allRecords.forEach((record, index) => {
    const values = [
      `'${record.datetime}'`,
      record.unitId,
      `'${record.operation}'`,
      `'${record.initialFund.toFixed(2)}'`,
      `'${record.cashSales.toFixed(2)}'`,
      `'${record.withdrawals.toFixed(2)}'`,
      `'${record.debitSales.toFixed(2)}'`,
      `'${record.creditSales.toFixed(2)}'`,
      `'${record.pixSales.toFixed(2)}'`,
      `'${record.createdBy}'`,
      record.notes ? `'${record.notes.replace(/'/g, "''")}'` : 'NULL',
      'NOW()',
      'NOW()'
    ];
    
    const comma = index === allRecords.length - 1 ? ';' : ',';
    sqlLines.push(`  (${values.join(', ')})${comma}`);
  });
  
  const sqlContent = sqlLines.join('\n');
  fs.writeFileSync('cash-closures-import.sql', sqlContent);
  
  console.log('\n✅ Import complete!');
  console.log('📄 SQL file created: cash-closures-import.sql');
  console.log('🎯 Run: npm run db:push && psql $DATABASE_URL -f cash-closures-import.sql');
}

main();