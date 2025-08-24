import { ShoppingCart } from 'lucide-react';

export default function ComprasPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          <ShoppingCart className="inline-block mr-3 h-8 w-8 text-orange-600" />
          Compras
        </h1>
        <p className="text-gray-600">
          Sistema de gestão de compras e análise de estoque
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-8 text-center">
        <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">
          Página em Construção
        </h2>
        <p className="text-gray-500">
          As funcionalidades de compras serão implementadas em breve.
        </p>
      </div>
    </div>
  );
}