// Teste completo do mapeamento de categorias
async function testCategoryMapping() {
  console.log('🧪 Testando upload completo com múltiplos produtos...');
  
  const formData = new FormData();
  const csvContent = `COD,PRODUTO,CATEGORIA,UNIDADE,MEDIDA,VALOR ATUAL
3001,TAMPA GROWLER,EMBALAGEM,DON JUAREZ / GRÃO PARÁ,UN,2.50
3002,RÓTULO CERVEJA,EMBALAGEM,DON JUAREZ / APOLLONIO,UN,0.75
3003,CAIXA PAPELÃO,EMBALAGEM,DON JUAREZ / GRÃO PARÁ,UN,3.20
4001,LÚPULO CASCADE,MATERIA PRIMA,DON JUAREZ / GRÃO PARÁ,KG,85.50
4002,MALTE PILSEN,MATERIA PRIMA,DON JUAREZ / APOLLONIO,KG,12.30`;
  
  const blob = new Blob([csvContent], { type: 'text/csv' });
  formData.append('file', blob, 'test-multiplos-produtos.csv');
  
  try {
    const response = await fetch('http://localhost:5000/api/products/upload', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    console.log('📊 Status HTTP:', response.status);
    console.log('📋 Resultado:', JSON.stringify(result, null, 2));
    
    if (result.stats) {
      console.log(`✅ Criados: ${result.stats.created}, Atualizados: ${result.stats.updated}, Erros: ${result.stats.errors}`);
    }
    
  } catch (error) {
    console.error('💥 Erro no teste:', error.message);
  }
}

testCategoryMapping();