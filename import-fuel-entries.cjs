const fs = require('fs');
const { Pool, neonConfig } = require('@neondatabase/serverless');
const ws = require('ws');

neonConfig.webSocketConstructor = ws;

// Dados de abastecimento baseados no CSV fornecido
const fuelEntriesData = [
  { date: "2024-12-20", employee: "Matheus", vehicle: "Strada 2025", currentKm: 10, value: 364.55, liters: 10, fuel: "Gasolina Aditivada", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-01-10", employee: "Matheus", vehicle: "Strada 2025", currentKm: 662, value: 167.19, liters: 39, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-01-12", employee: "Matheus", vehicle: "Strada 2025", currentKm: 938, value: 176.81, liters: 41, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-01-24", employee: "Matheus", vehicle: "Strada 2025", currentKm: 1250, value: 100.00, liters: 24, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-02-22", employee: "JOAO PEDRO", vehicle: "Strada 2025", currentKm: 1629, value: 100.00, liters: 23, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-03-11", employee: "Matheus", vehicle: "Strada 2025", currentKm: 1741, value: 100.00, liters: 23, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-03-24", employee: "Matheus", vehicle: "Strada 2025", currentKm: 1863, value: 100.00, liters: 23, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-03-31", employee: "Matheus", vehicle: "Strada 2025", currentKm: 1929, value: 100.00, liters: 23, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-04-03", employee: "Matheus", vehicle: "Strada 2025", currentKm: 2137, value: 100.00, liters: 23, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-04-07", employee: "Matheus", vehicle: "Strada 2025", currentKm: 2372, value: 100.00, liters: 23, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-04-14", employee: "Matheus", vehicle: "Strada 2025", currentKm: 2498, value: 100.00, liters: 23, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-04-26", employee: "Matheus", vehicle: "Strada 2025", currentKm: 2599, value: 100.00, liters: 24, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-05-10", employee: "Matheus", vehicle: "Strada 2025", currentKm: 2727, value: 100.00, liters: 23, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-05-19", employee: "Matheus", vehicle: "Strada 2025", currentKm: 2820, value: 100.00, liters: 23, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-05-26", employee: "Matheus", vehicle: "Strada 2025", currentKm: 2965, value: 150.00, liters: 35, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-06-06", employee: "Matheus", vehicle: "Strada 2025", currentKm: 3140, value: 198.41, liters: 46, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-06-16", employee: "JULIMARCIO", vehicle: "Strada 2025", currentKm: 3417, value: 100.00, liters: 24, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-06-26", employee: "JULIMARCIO", vehicle: "Strada 2025", currentKm: 3534, value: 100.00, liters: 24, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-07-07", employee: "JULIMARCIO", vehicle: "Strada 2025", currentKm: 3648, value: 100.00, liters: 24, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-07-16", employee: "JULIMARCIO", vehicle: "Strada 2025", currentKm: 3763, value: 100.00, liters: 24, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-07-26", employee: "JULIMARCIO", vehicle: "Strada 2025", currentKm: 3962, value: 100.00, liters: 25, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-08-01", employee: "JULIMARCIO", vehicle: "Strada 2025", currentKm: 4102, value: 169.22, liters: 43, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-08-04", employee: "Matheus", vehicle: "Strada 2025", currentKm: 4548, value: 100.00, liters: 25, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" },
  { date: "2025-08-11", employee: "JULIMARCIO", vehicle: "Strada 2025", currentKm: 4686, value: 100.00, liters: 25, fuel: "Etanol", gasStation: "AUTO Posto São Jacinto" }
];

async function importFuelEntries() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('🚀 Iniciando importação dos abastecimentos...');
    
    // Buscar IDs de referência
    const employeesResult = await pool.query('SELECT id, first_name FROM employees');
    const vehiclesResult = await pool.query('SELECT id, name FROM vehicles');
    const fuelsResult = await pool.query('SELECT id, name FROM fuels');
    const gasStationsResult = await pool.query('SELECT id, name FROM gas_stations');
    
    const employeeMap = new Map(employeesResult.rows.map(emp => [emp.first_name, emp.id]));
    const vehicleMap = new Map(vehiclesResult.rows.map(veh => [veh.name, veh.id]));
    const fuelMap = new Map(fuelsResult.rows.map(fuel => [fuel.name, fuel.id]));
    const gasStationMap = new Map(gasStationsResult.rows.map(gs => [gs.name, gs.id]));
    
    console.log('📋 Mapeamentos encontrados:');
    console.log('- Funcionários:', [...employeeMap.keys()]);
    console.log('- Veículos:', [...vehicleMap.keys()]);
    console.log('- Combustíveis:', [...fuelMap.keys()]);
    console.log('- Postos:', [...gasStationMap.keys()]);
    
    let imported = 0;
    let skipped = 0;
    
    for (const entry of fuelEntriesData) {
      try {
        // Mapear IDs
        const employeeId = entry.employee ? employeeMap.get(entry.employee) : null;
        const vehicleId = vehicleMap.get(entry.vehicle);
        const fuelId = fuelMap.get(entry.fuel);
        const gasStationId = entry.gasStation ? gasStationMap.get(entry.gasStation) : null;
        
        if (!vehicleId) {
          console.warn(`⚠️ Veículo "${entry.vehicle}" não encontrado`);
          skipped++;
          continue;
        }
        
        if (!fuelId) {
          console.warn(`⚠️ Combustível "${entry.fuel}" não encontrado`);
          skipped++;
          continue;
        }
        
        if (entry.employee && !employeeId) {
          console.warn(`⚠️ Funcionário "${entry.employee}" não encontrado`);
          skipped++;
          continue;
        }
        
        if (entry.gasStation && !gasStationId) {
          console.warn(`⚠️ Posto "${entry.gasStation}" não encontrado`);
          skipped++;
          continue;
        }
        
        // Verificar se já existe registro para mesma data, veículo e km
        const existingCheck = await pool.query(
          'SELECT id FROM fuel_entries WHERE date = $1 AND vehicle_id = $2 AND current_km = $3',
          [entry.date, vehicleId, entry.currentKm]
        );
        
        if (existingCheck.rows.length > 0) {
          console.log(`⏭️ Abastecimento já existe: ${entry.date} - ${entry.vehicle} - ${entry.currentKm}km`);
          skipped++;
          continue;
        }
        
        // Inserir abastecimento
        await pool.query(`
          INSERT INTO fuel_entries (
            date, employee_id, vehicle_id, current_km, 
            value, liters, fuel_id, gas_station_id, 
            created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        `, [
          entry.date,
          employeeId,
          vehicleId,
          entry.currentKm,
          entry.value,
          entry.liters,
          fuelId,
          gasStationId
        ]);
        
        console.log(`✅ Importado: ${entry.date} - ${entry.vehicle} - ${entry.currentKm}km - R$ ${entry.value}`);
        imported++;
        
      } catch (error) {
        console.error(`❌ Erro ao importar entrada ${entry.date}:`, error.message);
        skipped++;
      }
    }
    
    console.log('\n🎉 Importação concluída!');
    console.log(`✅ Importados: ${imported} abastecimentos`);
    console.log(`⏭️ Ignorados: ${skipped} abastecimentos`);
    
  } catch (error) {
    console.error('❌ Erro na importação:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  importFuelEntries()
    .then(() => {
      console.log('✅ Script executado com sucesso');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro ao executar script:', error);
      process.exit(1);
    });
}

module.exports = { importFuelEntries };