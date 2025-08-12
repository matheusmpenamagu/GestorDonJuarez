// Script para criar um colaborador de teste
import { storage } from './server/storage.js';
import { hashPassword } from './server/localAuth.js';

async function createTestEmployee() {
  try {
    console.log('🔄 Creating test employee...');
    
    // Hash da senha "123456" para teste
    const hashedPassword = await hashPassword('123456');
    
    const testEmployee = {
      email: 'test@dontjuarez.com',
      password: hashedPassword,
      firstName: 'Colaborador',
      lastName: 'Teste',
      whatsapp: '11999999999',
      roleId: null,
      employmentTypes: ['Funcionário'],
      avatar: '👤',
      isActive: true
    };

    const employee = await storage.createEmployee(testEmployee);
    console.log('✅ Test employee created successfully:', employee.email);
    console.log('📧 Email:', employee.email);
    console.log('🔑 Senha: 123456');
    
  } catch (error) {
    console.error('❌ Error creating test employee:', error);
  }
  
  process.exit(0);
}

createTestEmployee();