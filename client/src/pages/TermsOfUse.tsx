import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsOfUse() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-orange-600 mb-2">
            Termos de Uso
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
            <CardTitle className="text-orange-600">1. Aceitação dos Termos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Estes Termos de Uso ("Termos") regem o acesso e uso do sistema de gestão operacional 
              "Gestor Don Juarez" ("Sistema" ou "Plataforma"), operado pela Don Juarez Cervejaria 
              Artesanal ("Don Juarez", "nós", "nosso" ou "empresa").
            </p>
            <p>
              Ao acessar ou utilizar nosso Sistema, você ("usuário" ou "você") concorda em ficar 
              vinculado a estes Termos e a nossa Política de Privacidade. Se você não concorda 
              com qualquer parte destes termos, não deve utilizar nosso Sistema.
            </p>
          </CardContent>
        </Card>

        {/* Definições */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">2. Definições</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-semibold mb-2">Para fins destes Termos, entende-se por:</p>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><strong>Sistema:</strong> Plataforma web de gestão operacional Don Juarez</li>
                <li><strong>Usuário:</strong> Colaborador autorizado da Don Juarez com acesso ao Sistema</li>
                <li><strong>Conta:</strong> Perfil de acesso individual criado para cada usuário</li>
                <li><strong>Dados Operacionais:</strong> Informações relacionadas às atividades empresariais</li>
                <li><strong>Conteúdo:</strong> Todas as informações, dados, textos e materiais no Sistema</li>
                <li><strong>Serviços:</strong> Funcionalidades e recursos disponibilizados pelo Sistema</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Elegibilidade */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">3. Elegibilidade e Acesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">3.1 Requisitos de Acesso</h4>
              <p>O acesso ao Sistema é restrito a:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 mt-2">
                <li>Colaboradores ativos da Don Juarez Cervejaria Artesanal</li>
                <li>Usuários maiores de 18 anos</li>
                <li>Pessoas autorizadas pela administração da empresa</li>
                <li>Usuários com credenciais válidas fornecidas pela empresa</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">3.2 Criação de Conta</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Contas são criadas exclusivamente pela administração da empresa</li>
                <li>Não há possibilidade de auto-registro</li>
                <li>Cada usuário é responsável por manter a confidencialidade de suas credenciais</li>
                <li>O compartilhamento de contas é estritamente proibido</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Uso Permitido */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">4. Uso Permitido do Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">4.1 Finalidades Autorizadas</h4>
              <p>O Sistema deve ser utilizado exclusivamente para:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 mt-2">
                <li>Atividades relacionadas ao trabalho na Don Juarez</li>
                <li>Gestão operacional e administrativa autorizada</li>
                <li>Controle de estoque e produtos</li>
                <li>Monitoramento de equipamentos e processos</li>
                <li>Comunicação oficial relacionada ao trabalho</li>
                <li>Registro e acompanhamento de atividades operacionais</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">4.2 Responsabilidades do Usuário</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Manter credenciais de acesso seguras e confidenciais</li>
                <li>Utilizar o Sistema de forma ética e profissional</li>
                <li>Inserir dados precisos e atualizados</li>
                <li>Respeitar a confidencialidade das informações empresariais</li>
                <li>Reportar imediatamente qualquer problema de segurança</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Uso Proibido */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">5. Uso Proibido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>É expressamente proibido utilizar o Sistema para:</p>
            
            <div>
              <h4 className="font-semibold mb-2">5.1 Atividades Ilícitas</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Qualquer atividade ilegal ou não autorizada</li>
                <li>Violação de direitos de propriedade intelectual</li>
                <li>Fraude, falsificação ou manipulação de dados</li>
                <li>Atividades que violem leis trabalhistas ou comerciais</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">5.2 Segurança e Integridade</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Tentativas de acesso não autorizado</li>
                <li>Interferência no funcionamento do Sistema</li>
                <li>Introdução de vírus, malware ou códigos maliciosos</li>
                <li>Bypass de medidas de segurança implementadas</li>
                <li>Engenharia reversa ou tentativas de decompilação</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">5.3 Uso Inadequado</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Compartilhamento de credenciais de acesso</li>
                <li>Uso para finalidades pessoais não relacionadas ao trabalho</li>
                <li>Sobrecarga intencional dos recursos do Sistema</li>
                <li>Extração não autorizada de dados</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Propriedade Intelectual */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">6. Propriedade Intelectual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">6.1 Direitos da Don Juarez</h4>
              <p>
                Todos os direitos de propriedade intelectual relacionados ao Sistema, incluindo 
                mas não limitado a:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 mt-2">
                <li>Código-fonte, design e funcionalidades</li>
                <li>Marca "Don Juarez" e elementos visuais</li>
                <li>Documentação e materiais de treinamento</li>
                <li>Metodologias e processos implementados</li>
              </ul>
              <p className="mt-2">
                São de propriedade exclusiva da Don Juarez ou de seus licenciadores.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">6.2 Dados Empresariais</h4>
              <p>
                Todos os dados operacionais, relatórios e informações geradas através do Sistema 
                pertencem à Don Juarez e são considerados informações confidenciais da empresa.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Privacidade */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">7. Privacidade e Proteção de Dados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              O tratamento de dados pessoais no Sistema é regido pela nossa 
              <a href="/privacidade" className="text-orange-600 hover:text-orange-700 underline">
                Política de Privacidade
              </a>, que faz parte integrante destes Termos.
            </p>
            
            <div>
              <h4 className="font-semibold mb-2">7.1 Compromissos</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Cumprimento da Lei Geral de Proteção de Dados (LGPD)</li>
                <li>Implementação de medidas de segurança adequadas</li>
                <li>Transparência no tratamento de dados pessoais</li>
                <li>Respeito aos direitos dos titulares de dados</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Disponibilidade */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">8. Disponibilidade e Manutenção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">8.1 Disponibilidade do Sistema</h4>
              <p>
                Embora nos esforcemos para manter o Sistema disponível 24/7, não garantimos 
                disponibilidade ininterrupta devido a:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 mt-2">
                <li>Manutenção programada e atualizações</li>
                <li>Problemas técnicos ou de infraestrutura</li>
                <li>Circunstâncias além de nosso controle</li>
                <li>Necessidades de segurança ou conformidade</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">8.2 Notificações</h4>
              <p>
                Tentaremos fornecer aviso prévio razoável sobre manutenções programadas que 
                possam afetar significativamente o uso do Sistema.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Limitação de Responsabilidade */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">9. Limitação de Responsabilidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">9.1 Exclusões</h4>
              <p>
                Na máxima extensão permitida por lei, a Don Juarez não será responsável por:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 mt-2">
                <li>Danos indiretos, incidentais ou consequenciais</li>
                <li>Perda de dados resultante de uso inadequado</li>
                <li>Interrupções temporárias do serviço</li>
                <li>Danos resultantes de acesso não autorizado</li>
                <li>Uso do Sistema em violação a estes Termos</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">9.2 Responsabilidade do Usuário</h4>
              <p>
                O usuário é responsável por qualquer dano resultante do uso inadequado do Sistema 
                ou violação destes Termos.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Suspensão e Cancelamento */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">10. Suspensão e Cancelamento de Acesso</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">10.1 Suspensão Imediata</h4>
              <p>Podemos suspender ou cancelar seu acesso imediatamente em caso de:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-700 mt-2">
                <li>Violação destes Termos de Uso</li>
                <li>Atividade suspeita ou não autorizada</li>
                <li>Término da relação de trabalho com a Don Juarez</li>
                <li>Risco à segurança do Sistema ou dados</li>
                <li>Solicitação de autoridades competentes</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">10.2 Consequências</h4>
              <p>
                Após a suspensão ou cancelamento, o usuário perde imediatamente o direito de 
                acessar o Sistema e deve cessar qualquer uso dos Serviços.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Modificações */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">11. Modificações nos Termos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Reservamo-nos o direito de modificar estes Termos a qualquer momento. As alterações 
              entrarão em vigor imediatamente após a publicação da versão atualizada.
            </p>
            
            <div>
              <h4 className="font-semibold mb-2">11.1 Notificação</h4>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                <li>Alterações significativas serão comunicadas via Sistema ou e-mail</li>
                <li>Uso continuado constitui aceitação dos novos termos</li>
                <li>Usuários devem revisar os Termos periodicamente</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Lei Aplicável */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">12. Lei Aplicável e Jurisdição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. 
              Qualquer disputa será submetida à jurisdição exclusiva dos tribunais de 
              Minas Gerais, Brasil.
            </p>
            
            <div>
              <h4 className="font-semibold mb-2">12.1 Resolução de Conflitos</h4>
              <p>
                As partes comprometem-se a buscar a resolução amigável de conflitos antes 
                de recorrer às vias judiciais, priorizando a mediação e arbitragem quando aplicável.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">13. Contato e Suporte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              Para dúvidas, suporte técnico ou questões relacionadas a estes Termos:
            </p>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Don Juarez - Cervejaria Artesanal</h4>
              <p className="text-sm space-y-1">
                <strong>Suporte Técnico:</strong> suporte@donjuarez.com.br<br/>
                <strong>Jurídico:</strong> juridico@donjuarez.com.br<br/>
                <strong>WhatsApp:</strong> (33) 3641-3517<br/>
                <strong>Horário de atendimento:</strong> Segunda a sexta, 8h às 18h
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Disposições Finais */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-orange-600">14. Disposições Finais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">14.1 Integralidade</h4>
              <p>
                Estes Termos, juntamente com a Política de Privacidade, constituem o acordo 
                completo entre as partes sobre o uso do Sistema.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">14.2 Severabilidade</h4>
              <p>
                Se qualquer disposição destes Termos for considerada inválida, as demais 
                disposições permanecerão em pleno vigor e efeito.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-2">14.3 Renúncia</h4>
              <p>
                A falha em exercer qualquer direito previsto nestes Termos não constitui 
                renúncia a tal direito.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-2">
            © 2025 Don Juarez - Cervejaria Artesanal. Todos os direitos reservados.
          </p>
          <p className="text-xs text-gray-400 mb-4">
            Estes termos estão em conformidade com o Marco Civil da Internet (Lei nº 12.965/2014) 
            e demais legislações aplicáveis.
          </p>
          <div className="flex justify-center space-x-4 text-sm">
            <a href="/privacidade" className="text-orange-600 hover:text-orange-700 underline">
              Política de Privacidade
            </a>
            <span className="text-gray-300">|</span>
            <a href="/termos-de-uso" className="text-orange-600 hover:text-orange-700 underline">
              Termos de Uso
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}