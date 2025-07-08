import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-orange-600 mb-2">
            Política de Privacidade
          </h1>
          <p className="text-lg text-gray-600">
            Gestor Don Juarez - Sistema de Gestão Operacional
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Última atualização: {new Date().toLocaleDateString('pt-BR')}
          </p>
        </div>

        {/* Introdução */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">1. Introdução</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              A Don Juarez está comprometida em proteger a privacidade e segurança dos dados pessoais 
              de nossos usuários. Esta Política de Privacidade descreve como coletamos, utilizamos, 
              armazenamos e protegemos suas informações pessoais no nosso sistema de gestão operacional.
            </p>
            <p>
              Ao utilizar nosso sistema, você concorda com as práticas descritas nesta política.
            </p>
          </CardContent>
        </Card>

        {/* Dados Coletados */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">2. Dados Coletados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">2.1 Dados de Identificação</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Nome completo</li>
                <li>Endereço de e-mail</li>
                <li>Número de telefone/WhatsApp</li>
                <li>Cargo e função na empresa</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">2.2 Dados Operacionais</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Registros de ponto e horários de trabalho</li>
                <li>Atividades realizadas no sistema</li>
                <li>Dados de contagem de estoque</li>
                <li>Histórico de interações via WhatsApp</li>
                <li>Logs de acesso e utilização do sistema</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">2.3 Dados Técnicos</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Endereço IP</li>
                <li>Informações do navegador</li>
                <li>Data e hora de acesso</li>
                <li>Páginas visitadas no sistema</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Finalidades */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">3. Finalidades do Tratamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Utilizamos seus dados pessoais para as seguintes finalidades:</p>
            
            <div>
              <h4 className="font-semibold mb-2">3.1 Gestão Operacional</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Controle de acesso ao sistema</li>
                <li>Monitoramento de atividades operacionais</li>
                <li>Gestão de estoque e produtos</li>
                <li>Controle de ponto e jornada de trabalho</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">3.2 Comunicação</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Envio de notificações operacionais via WhatsApp</li>
                <li>Comunicação sobre contagens de estoque</li>
                <li>Alertas de sistema e manutenção</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">3.3 Segurança e Auditoria</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Prevenção de fraudes e uso indevido</li>
                <li>Auditoria de atividades no sistema</li>
                <li>Cumprimento de obrigações legais</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Base Legal */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">4. Base Legal para o Tratamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>O tratamento de seus dados pessoais está fundamentado nas seguintes bases legais:</p>
            
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>Execução de contrato:</strong> Para cumprimento das obrigações trabalhistas e operacionais</li>
              <li><strong>Interesse legítimo:</strong> Para gestão operacional e segurança do sistema</li>
              <li><strong>Consentimento:</strong> Para comunicações não essenciais via WhatsApp</li>
              <li><strong>Cumprimento de obrigação legal:</strong> Para atender exigências trabalhistas e fiscais</li>
            </ul>
          </CardContent>
        </Card>

        {/* Compartilhamento */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">5. Compartilhamento de Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Seus dados pessoais são tratados com confidencialidade e não são compartilhados com 
              terceiros, exceto nas seguintes situações:
            </p>
            
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Quando exigido por lei ou ordem judicial</li>
              <li>Para prestadores de serviços técnicos (hosting, manutenção) sob acordo de confidencialidade</li>
              <li>Para integração com serviços de WhatsApp Business API (Meta)</li>
              <li>Em caso de reestruturação empresarial, com manutenção das proteções</li>
            </ul>
          </CardContent>
        </Card>

        {/* Segurança */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">6. Segurança dos Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Implementamos medidas técnicas e organizacionais para proteger seus dados:</p>
            
            <div>
              <h4 className="font-semibold mb-2">6.1 Medidas Técnicas</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Criptografia de dados em trânsito (HTTPS/TLS)</li>
                <li>Criptografia de dados em repouso</li>
                <li>Controle de acesso baseado em funções</li>
                <li>Monitoramento de segurança e logs de auditoria</li>
                <li>Backup automático e recuperação de dados</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">6.2 Medidas Organizacionais</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Treinamento de equipe sobre proteção de dados</li>
                <li>Políticas internas de segurança da informação</li>
                <li>Controle de acesso físico e lógico</li>
                <li>Procedimentos de resposta a incidentes</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Retenção */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">7. Retenção de Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Mantemos seus dados pessoais pelo tempo necessário para:</p>
            
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>Dados de colaboradores ativos:</strong> Durante a vigência do contrato de trabalho</li>
              <li><strong>Dados históricos operacionais:</strong> 5 anos após o término da relação trabalhista</li>
              <li><strong>Logs de sistema:</strong> 12 meses para fins de segurança</li>
              <li><strong>Dados de auditoria:</strong> Conforme exigências legais (até 10 anos)</li>
            </ul>
            
            <p className="text-sm text-gray-600 mt-4">
              Após os períodos de retenção, os dados são anonimizados ou eliminados de forma segura.
            </p>
          </CardContent>
        </Card>

        {/* Direitos */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">8. Seus Direitos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Como titular de dados pessoais, você possui os seguintes direitos:</p>
            
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li><strong>Acesso:</strong> Obter informações sobre seus dados pessoais</li>
              <li><strong>Retificação:</strong> Solicitar correção de dados incorretos ou incompletos</li>
              <li><strong>Eliminação:</strong> Solicitar exclusão de dados desnecessários</li>
              <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado</li>
              <li><strong>Oposição:</strong> Opor-se ao tratamento em certas circunstâncias</li>
              <li><strong>Revogação:</strong> Retirar consentimento quando aplicável</li>
              <li><strong>Informação:</strong> Ser informado sobre o tratamento de seus dados</li>
            </ul>
            
            <div className="bg-orange-50 p-4 rounded-lg mt-4">
              <p className="text-sm">
                <strong>Para exercer seus direitos, entre em contato conosco:</strong><br/>
                📧 E-mail: privacidade@donjuarez.com.br<br/>
                📱 WhatsApp: (33) 3641-3517<br/>
                📍 Endereço: Disponível mediante solicitação
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Cookies */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">9. Cookies e Tecnologias Similares</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Utilizamos cookies e tecnologias similares para:</p>
            
            <ul className="list-disc list-inside space-y-2 text-gray-700">
              <li>Manter sua sessão ativa no sistema</li>
              <li>Lembrar preferências de usuário</li>
              <li>Analisar o uso do sistema para melhorias</li>
              <li>Garantir a segurança das operações</li>
            </ul>
            
            <p className="text-sm text-gray-600 mt-4">
              Você pode gerenciar cookies através das configurações do seu navegador, mas isso pode 
              afetar o funcionamento do sistema.
            </p>
          </CardContent>
        </Card>

        {/* Menores */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">10. Menores de Idade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Nosso sistema é destinado exclusivamente para uso corporativo por colaboradores 
              maiores de 18 anos. Não coletamos intencionalmente dados de menores de idade.
            </p>
            
            <p>
              Caso identifiquemos dados de menores, tomaremos medidas imediatas para removê-los 
              do sistema, conforme a legislação aplicável.
            </p>
          </CardContent>
        </Card>

        {/* Alterações */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">11. Alterações na Política</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Esta Política de Privacidade pode ser atualizada periodicamente para refletir 
              mudanças em nossas práticas ou na legislação aplicável.
            </p>
            
            <p>
              Notificaremos sobre alterações significativas através do próprio sistema e/ou 
              por e-mail. Recomendamos que revise esta política regularmente.
            </p>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">12. Contato e Encarregado de Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Para dúvidas, solicitações ou reclamações relacionadas ao tratamento de dados pessoais:
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Don Juarez - Cervejaria Artesanal</h4>
              <p className="text-sm space-y-1">
                <strong>Encarregado de Proteção de Dados (DPO):</strong> Matheus Mattos Pena<br/>
                <strong>E-mail:</strong> privacidade@donjuarez.com.br<br/>
                <strong>WhatsApp:</strong> (33) 3641-3517<br/>
                <strong>Horário de atendimento:</strong> Segunda a sexta, 8h às 18h
              </p>
            </div>
            
            <p className="text-sm text-gray-600 mt-4">
              Caso não obtenha resposta satisfatória, você pode contatar a Autoridade Nacional 
              de Proteção de Dados (ANPD) através do site <strong>gov.br/anpd</strong>.
            </p>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-2">
            © 2025 Don Juarez - Cervejaria Artesanal. Todos os direitos reservados.
          </p>
          <p className="text-xs text-gray-400">
            Esta política está em conformidade com a Lei Geral de Proteção de Dados (LGPD) - Lei nº 13.709/2018
          </p>
        </div>
      </div>
    </div>
  );
}