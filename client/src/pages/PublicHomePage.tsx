export default function PublicHomePage() {
  const buttons = [
    {
      title: "Vuca - Produção",
      url: "https://donjuarez.vucasolution.com.br/retaguarda/pg_producao_separacaodeprodutos.php",
      color: "bg-blue-600 hover:bg-blue-700"
    },
    {
      title: "Vuca - Pedidos da cozinha", 
      url: "https://donjuarez.vucasolution.com.br/frentedeloja/kds.php",
      color: "bg-green-600 hover:bg-green-700"
    },
    {
      title: "Gerar etiquetas",
      url: "https://gestor.donjuarez.com.br/public/etiquetas",
      color: "bg-orange-600 hover:bg-orange-700"
    },
    {
      title: "Baixar etiquetas",
      url: "https://gestor.donjuarez.com.br/public/baixa-etiquetas",
      color: "bg-red-600 hover:bg-red-700"
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      {/* Logo Don Juarez */}
      <div className="mb-12">
        <img 
          src="https://res.cloudinary.com/vuca-solution/image/upload//w_160,h_160,c_fill,q_auto,fl_lossy/v1731617934/storage.vucasolution.com.br/donjuarez/arqs/vucafood/logo/hzuwflhue7divopktvu4.svg"
          alt="Don Juarez Logo"
          className="w-40 h-40 object-contain"
        />
      </div>

      {/* Botões Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        {buttons.map((button, index) => (
          <a
            key={index}
            href={button.url}
            className={`
              ${button.color}
              text-white font-bold text-xl py-8 px-6 rounded-lg
              transform transition-all duration-200 
              hover:scale-105 hover:shadow-lg
              active:scale-95
              text-center cursor-pointer
              min-h-[120px] flex items-center justify-center
            `}
          >
            {button.title}
          </a>
        ))}
      </div>
    </div>
  );
}