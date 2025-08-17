// Função para aplicar máscara de CNPJ no formato 99.999.999/9999-99
export function applyCnpjMask(value: string): string {
  // Remove todos os caracteres não numéricos
  const numbers = value.replace(/\D/g, '');
  
  // Limita a 14 dígitos
  const limitedNumbers = numbers.slice(0, 14);
  
  // Aplica a máscara
  return limitedNumbers
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1.$2')
    .replace(/\.(\d{3})\.(\d{3})(\d)/, '.$1.$2/$3')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

// Função para remover a máscara e retornar apenas números
export function removeCnpjMask(value: string): string {
  return value.replace(/\D/g, '');
}

// Função para validar se o CNPJ está no formato correto
export function isValidCnpjFormat(value: string): boolean {
  const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
  return cnpjRegex.test(value);
}

// Função para validar se o CNPJ é válido (algoritmo de verificação)
export function isValidCnpj(cnpj: string): boolean {
  const numbers = removeCnpjMask(cnpj);
  
  if (numbers.length !== 14) return false;
  
  // Rejeita CNPJs com todos os dígitos iguais
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  // Algoritmo de validação dos dígitos verificadores
  let sum = 0;
  let multiplier = 2;
  
  // Primeiro dígito verificador
  for (let i = 11; i >= 0; i--) {
    sum += parseInt(numbers[i]) * multiplier;
    multiplier = multiplier < 9 ? multiplier + 1 : 2;
  }
  
  let remainder = sum % 11;
  let firstDigit = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(numbers[12]) !== firstDigit) return false;
  
  // Segundo dígito verificador
  sum = 0;
  multiplier = 2;
  
  for (let i = 12; i >= 0; i--) {
    sum += parseInt(numbers[i]) * multiplier;
    multiplier = multiplier < 9 ? multiplier + 1 : 2;
  }
  
  remainder = sum % 11;
  let secondDigit = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(numbers[13]) === secondDigit;
}