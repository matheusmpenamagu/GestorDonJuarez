import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Loader2, Check, LogOut, QrCode } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type PinUser = {
  id: number;
  firstName: string;
  lastName: string;
  avatar: string;
  type: 'pin-session';
  sessionId: string;
};

type Unit = {
  id: number;
  name: string;
  address?: string;
};

type ProductCategory = {
  id: number;
  name: string;
  description?: string;
};

type Product = {
  id: number;
  code: string;
  name: string;
  categoryId: number;
  category?: ProductCategory;
};

type ProductPortion = {
  id: number;
  productId: number;
  quantity: number;
  unitOfMeasure: string;
  description?: string;
};

type ProductShelfLife = {
  id: number;
  productId: number;
  frozenDays: number;
  cooledDays: number;
  ambientDays: number;
};

type Label = {
  productId: number;
  responsibleId: number;
  portionId: number;
  storageMethod: 'frozen' | 'cooled' | 'ambient';
  quantity: number;
  productionDate: string;
  expiryDate: string;
  identifier: string;
};

type Step = 'pin' | 'unit' | 'category' | 'product' | 'portion' | 'storage' | 'quantity' | 'confirmation';

export default function PublicLabelPage() {
  const [step, setStep] = useState<Step>('pin');
  const [loading, setLoading] = useState(false);
  const [pinUser, setPinUser] = useState<PinUser | null>(null);
  const [pin, setPin] = useState('');
  
  // Selection states
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedPortion, setSelectedPortion] = useState<ProductPortion | null>(null);
  const [selectedStorage, setSelectedStorage] = useState<'frozen' | 'cooled' | 'ambient' | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1);
  
  // Data states
  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [portions, setPortions] = useState<ProductPortion[]>([]);
  const [shelfLife, setShelfLife] = useState<ProductShelfLife | null>(null);
  const [generatedLabels, setGeneratedLabels] = useState<Label[]>([]);

  // Auto-logout after 5 minutes of inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (pinUser) {
          handleLogout();
        }
      }, 5 * 60 * 1000); // 5 minutes
    };

    if (pinUser) {
      resetTimeout();
      
      // Reset timeout on any activity
      const handleActivity = () => resetTimeout();
      window.addEventListener('click', handleActivity);
      window.addEventListener('keypress', handleActivity);
      
      return () => {
        clearTimeout(timeout);
        window.removeEventListener('click', handleActivity);
        window.removeEventListener('keypress', handleActivity);
      };
    }

    return () => clearTimeout(timeout);
  }, [pinUser]);

  const handlePinEntry = (digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
    }
  };

  const handlePinBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handlePinSubmit = async () => {
    if (pin.length !== 4) {
      toast({
        title: "PIN incompleto",
        description: "Digite os 4 dígitos do PIN",
        variant: "destructive",
      });
      return;
    }

    console.log('📌 [CLIENT] === PIN SUBMIT ===');
    console.log('📌 [CLIENT] PIN entered:', pin);
    console.log('📌 [CLIENT] Document cookies before PIN:', document.cookie);

    setLoading(true);
    try {
      console.log('📌 [CLIENT] Making PIN request...');
      const response = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pin }),
      });

      console.log('📌 [CLIENT] PIN response status:', response.status);
      console.log('📌 [CLIENT] PIN response headers:', Array.from(response.headers.entries()));
      console.log('📌 [CLIENT] Document cookies after PIN:', document.cookie);

      if (response.ok) {
        const user = await response.json();
        console.log('✅ [CLIENT] PIN authenticated successfully:', user);
        setPinUser(user);
        setStep('unit');
        
        // Immediately fetch units after successful PIN
        console.log('📌 [CLIENT] Triggering units fetch...');
        await fetchUnits();
        
        toast({
          title: "Acesso autorizado",
          description: `Olá, ${user.firstName}!`,
        });
      } else {
        const error = await response.json();
        console.log('❌ [CLIENT] PIN authentication failed:', error);
        toast({
          title: "PIN inválido",
          description: error.message || "Verifique o PIN e tente novamente",
          variant: "destructive",
        });
        setPin('');
      }
    } catch (error) {
      console.error('❌ [CLIENT] PIN request error:', error);
      toast({
        title: "Erro de conexão",
        description: "Não foi possível validar o PIN",
        variant: "destructive",
      });
      setPin('');
    } finally {
      setLoading(false);
      console.log('📌 [CLIENT] === END PIN SUBMIT ===');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/pin-logout', { 
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
    
    // Reset all states
    setPinUser(null);
    setStep('pin');
    setPin('');
    setSelectedUnit(null);
    setSelectedCategory(null);
    setSelectedProduct(null);
    setSelectedPortion(null);
    setSelectedStorage(null);
    setSelectedQuantity(1);
    setGeneratedLabels([]);
    
    toast({
      title: "Sessão encerrada",
      description: "Digite seu PIN para continuar",
    });
  };

  const fetchUnits = async () => {
    console.log('🏢 [CLIENT] === FETCHING UNITS ===');
    console.log('🏢 [CLIENT] PIN User:', pinUser);
    console.log('🏢 [CLIENT] Document cookies:', document.cookie);
    
    try {
      console.log('🏢 [CLIENT] Making request to /api/units...');
      
      // Build headers with session ID if available
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      // Use sessionId from pinUser if available
      if (pinUser?.sessionId) {
        console.log('🏢 [CLIENT] Using PIN sessionId:', pinUser.sessionId);
        headers['Authorization'] = `Bearer ${pinUser.sessionId}`;
      }
      
      const response = await fetch('/api/units', {
        credentials: 'include',
        headers
      });
      
      console.log('🏢 [CLIENT] Response status:', response.status);
      console.log('🏢 [CLIENT] Response headers:', Array.from(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [CLIENT] Units fetched successfully:', data);
        setUnits(data);
      } else {
        const errorData = await response.json();
        console.log('❌ [CLIENT] Failed to fetch units:', errorData);
      }
    } catch (error) {
      console.error('❌ [CLIENT] Error fetching units:', error);
    }
    console.log('🏢 [CLIENT] === END FETCHING UNITS ===');
  };

  const fetchCategories = async () => {
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (pinUser?.sessionId) {
        headers['Authorization'] = `Bearer ${pinUser.sessionId}`;
      }
      
      const response = await fetch('/api/product-categories', {
        credentials: 'include',
        headers
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async (categoryId: number) => {
    console.log('🛍️ [CLIENT] === FETCHING PRODUCTS ===');
    console.log('🛍️ [CLIENT] Category ID:', categoryId);
    
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (pinUser?.sessionId) {
        console.log('🛍️ [CLIENT] Using PIN sessionId:', pinUser.sessionId);
        headers['Authorization'] = `Bearer ${pinUser.sessionId}`;
      }
      
      const url = `/api/products?categoryId=${categoryId}`;
      console.log('🛍️ [CLIENT] Request URL:', url);
      
      const response = await fetch(url, {
        credentials: 'include',
        headers
      });
      
      console.log('🛍️ [CLIENT] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [CLIENT] Products fetched successfully:', data.length, 'products');
        console.log('🛍️ [CLIENT] First few products:', data.slice(0, 3));
        setProducts(data);
      } else {
        const errorData = await response.json();
        console.log('❌ [CLIENT] Failed to fetch products:', errorData);
      }
    } catch (error) {
      console.error('❌ [CLIENT] Error fetching products:', error);
    }
    console.log('🛍️ [CLIENT] === END FETCHING PRODUCTS ===');
  };

  const fetchPortions = async (productId: number) => {
    console.log('🥄 [CLIENT] === FETCHING PORTIONS ===');
    console.log('🥄 [CLIENT] Product ID:', productId);
    
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (pinUser?.sessionId) {
        console.log('🥄 [CLIENT] Using PIN sessionId:', pinUser.sessionId);
        headers['Authorization'] = `Bearer ${pinUser.sessionId}`;
      }
      
      const url = `/api/labels/portions/product/${productId}`;
      console.log('🥄 [CLIENT] Request URL:', url);
      
      const response = await fetch(url, {
        credentials: 'include',
        headers
      });
      
      console.log('🥄 [CLIENT] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [CLIENT] Portions fetched successfully:', data.length, 'portions');
        console.log('🥄 [CLIENT] Portions:', data);
        setPortions(data);
      } else {
        const errorData = await response.json();
        console.log('❌ [CLIENT] Failed to fetch portions:', errorData);
      }
    } catch (error) {
      console.error('❌ [CLIENT] Error fetching portions:', error);
    }
    console.log('🥄 [CLIENT] === END FETCHING PORTIONS ===');
  };

  const fetchShelfLife = async (productId: number) => {
    try {
      const response = await fetch(`/api/labels/shelf-lifes?productId=${productId}`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setShelfLife(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching shelf life:', error);
    }
  };

  const handleUnitSelect = (unit: Unit) => {
    setSelectedUnit(unit);
    setStep('category');
    fetchCategories();
  };

  const handleCategorySelect = (category: ProductCategory) => {
    console.log('📋 [CLIENT] Selected category:', category);
    setSelectedCategory(category);
    setStep('product');
    fetchProducts(category.id);
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    fetchPortions(product.id);
    fetchShelfLife(product.id);
    setStep('portion');
  };

  const handlePortionSelect = (portion: ProductPortion) => {
    setSelectedPortion(portion);
    setStep('storage');
  };

  const handleStorageSelect = (storage: 'frozen' | 'cooled' | 'ambient') => {
    setSelectedStorage(storage);
    setStep('quantity');
  };

  const handleQuantitySelect = (quantity: number) => {
    setSelectedQuantity(quantity);
    setStep('confirmation');
    generatePreview();
  };

  // Função para converter unidades automaticamente baseado na quantidade
  const formatSmartUnit = (quantity: number, originalUnit: string): { quantity: number; unit: string } => {
    const normalizedUnit = originalUnit.toUpperCase();
    
    // Se a quantidade é >= 1, usa a unidade original
    if (quantity >= 1) {
      return { quantity, unit: originalUnit };
    }
    
    // Para quantidades < 1, converte para unidade menor
    switch (normalizedUnit) {
      case 'KG':
        return { 
          quantity: quantity * 1000, 
          unit: 'g' 
        };
      case 'L':
        return { 
          quantity: quantity * 1000, 
          unit: 'ml' 
        };
      default:
        // Para outras unidades, mantém como está
        return { quantity, unit: originalUnit };
    }
  };

  const generatePreview = () => {
    if (!selectedProduct || !selectedPortion || !selectedStorage || !shelfLife || !pinUser) return;

    const today = new Date();
    const productionDate = today.toISOString().split('T')[0];
    
    let expiryDays = 0;
    switch (selectedStorage) {
      case 'frozen':
        expiryDays = shelfLife.frozenDays;
        break;
      case 'cooled':
        expiryDays = shelfLife.cooledDays;
        break;
      case 'ambient':
        expiryDays = shelfLife.ambientDays;
        break;
    }

    const expiryDate = new Date(today);
    expiryDate.setDate(expiryDate.getDate() + expiryDays);

    const labels: Label[] = [];
    for (let i = 0; i < selectedQuantity; i++) {
      labels.push({
        productId: selectedProduct.id,
        responsibleId: pinUser.id,
        portionId: selectedPortion.id,
        storageMethod: selectedStorage,
        quantity: 1,
        productionDate,
        expiryDate: expiryDate.toISOString().split('T')[0],
        identifier: `${selectedProduct.code}-${Date.now()}-${i + 1}`,
      });
    }
    
    setGeneratedLabels(labels);
  };

  const handleConfirmGeneration = async () => {
    if (generatedLabels.length === 0) return;

    setLoading(true);
    try {
      const promises = generatedLabels.map(label =>
        fetch('/api/labels', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(label),
        })
      );

      await Promise.all(promises);

      toast({
        title: "Etiquetas geradas!",
        description: `${generatedLabels.length} etiqueta(s) criada(s) com sucesso`,
      });

      // Auto logout and reset
      setTimeout(() => {
        handleLogout();
      }, 3000);

    } catch (error) {
      toast({
        title: "Erro ao gerar etiquetas",
        description: "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    switch (step) {
      case 'unit':
        setStep('pin');
        break;
      case 'category':
        setStep('unit');
        setSelectedCategory(null);
        break;
      case 'product':
        setStep('category');
        setSelectedProduct(null);
        break;
      case 'portion':
        setStep('product');
        setSelectedPortion(null);
        break;
      case 'storage':
        setStep('portion');
        setSelectedStorage(null);
        break;
      case 'quantity':
        setStep('storage');
        setSelectedQuantity(1);
        break;
      case 'confirmation':
        setStep('quantity');
        break;
    }
  };

  // Load units when moving to unit step
  useEffect(() => {
    if (step === 'unit') {
      fetchUnits();
    }
  }, [step]);

  const renderPinEntry = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-orange-600">
            Sistema de Etiquetas
          </CardTitle>
          <p className="text-gray-600">Digite seu PIN de 4 dígitos</p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* PIN Display */}
          <div className="flex justify-center space-x-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className={`w-12 h-12 border-2 rounded-lg flex items-center justify-center text-xl font-bold ${
                  pin.length > i
                    ? 'border-orange-500 bg-orange-50 text-orange-600'
                    : 'border-gray-300 bg-white'
                }`}
              >
                {pin.length > i ? '●' : ''}
              </div>
            ))}
          </div>

          {/* Number Pad */}
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                size="lg"
                className="h-16 text-xl font-semibold"
                onClick={() => handlePinEntry(num.toString())}
                disabled={loading}
              >
                {num}
              </Button>
            ))}
            <Button
              variant="outline"
              size="lg"
              className="h-16 text-xl font-semibold"
              onClick={handlePinBackspace}
              disabled={loading || pin.length === 0}
            >
              ←
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-16 text-xl font-semibold"
              onClick={() => handlePinEntry('0')}
              disabled={loading}
            >
              0
            </Button>
            <Button
              size="lg"
              className="h-16 text-xl font-semibold bg-orange-600 hover:bg-orange-700"
              onClick={handlePinSubmit}
              disabled={loading || pin.length !== 4}
            >
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : '✓'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderStepContent = () => {
    if (step === 'pin') return renderPinEntry();

    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={handleBack}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Geração de Etiquetas
                </h1>
                {pinUser && (
                  <p className="text-gray-600">
                    {pinUser.avatar} {pinUser.firstName} {pinUser.lastName}
                  </p>
                )}
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>

          {/* Step Content */}
          {step === 'unit' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Selecione a Unidade</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {units.map((unit) => (
                  <Card
                    key={unit.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleUnitSelect(unit)}
                  >
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg">{unit.name}</h3>
                      {unit.address && (
                        <p className="text-gray-600 text-sm">{unit.address}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {step === 'category' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Selecione a Categoria</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categories.map((category) => (
                  <Card
                    key={category.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleCategorySelect(category)}
                  >
                    <CardContent className="p-6">
                      <h3 className="font-semibold text-lg">{category.name}</h3>
                      {category.description && (
                        <p className="text-gray-600 text-sm">{category.description}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {step === 'product' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Selecione o Produto</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                  <Card
                    key={product.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleProductSelect(product)}
                  >
                    <CardContent className="p-4">
                      <Badge variant="outline" className="mb-2">
                        {product.code}
                      </Badge>
                      <h3 className="font-semibold">{product.name}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {step === 'portion' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Selecione o Porcionamento</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {portions.map((portion) => {
                  const smartUnit = formatSmartUnit(portion.quantity, portion.unitOfMeasure);
                  return (
                    <Card
                      key={portion.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => handlePortionSelect(portion)}
                    >
                      <CardContent className="p-6">
                        <h3 className="font-semibold text-lg">
                          {smartUnit.quantity} {smartUnit.unit}
                        </h3>
                        {portion.description && (
                          <p className="text-gray-600 text-sm">{portion.description}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {step === 'storage' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Método de Armazenamento</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleStorageSelect('frozen')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-2">🧊</div>
                    <h3 className="font-semibold text-lg">Congelado</h3>
                    {shelfLife && (
                      <p className="text-gray-600">{shelfLife.frozenDays} dias</p>
                    )}
                  </CardContent>
                </Card>
                <Card
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleStorageSelect('cooled')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-2">❄️</div>
                    <h3 className="font-semibold text-lg">Resfriado</h3>
                    {shelfLife && (
                      <p className="text-gray-600">{shelfLife.cooledDays} dias</p>
                    )}
                  </CardContent>
                </Card>
                <Card
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleStorageSelect('ambient')}
                >
                  <CardContent className="p-6 text-center">
                    <div className="text-4xl mb-2">🌡️</div>
                    <h3 className="font-semibold text-lg">Ambiente</h3>
                    {shelfLife && (
                      <p className="text-gray-600">{shelfLife.ambientDays} dias</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {step === 'quantity' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Quantidade de Etiquetas</h2>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                {[1, 2, 3, 4, 5, 10, 15, 20, 25, 30].map((qty) => (
                  <Card
                    key={qty}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleQuantitySelect(qty)}
                  >
                    <CardContent className="p-6 text-center">
                      <h3 className="font-bold text-2xl">{qty}</h3>
                      <p className="text-gray-600 text-sm">
                        {qty === 1 ? 'etiqueta' : 'etiquetas'}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {step === 'confirmation' && (
            <div>
              <h2 className="text-xl font-semibold mb-4">Confirmação</h2>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-5 h-5" />
                    Resumo das Etiquetas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p><strong>Unidade:</strong> {selectedUnit?.name}</p>
                      <p><strong>Categoria:</strong> {selectedCategory?.name}</p>
                      <p><strong>Produto:</strong> {selectedProduct?.name}</p>
                    </div>
                    <div>
                      <p><strong>Porção:</strong> {selectedPortion?.quantity} {selectedPortion?.unit}</p>
                      <p><strong>Armazenamento:</strong> {
                        selectedStorage === 'frozen' ? 'Congelado' :
                        selectedStorage === 'cooled' ? 'Resfriado' : 'Ambiente'
                      }</p>
                      <p><strong>Quantidade:</strong> {selectedQuantity} etiqueta(s)</p>
                    </div>
                  </div>
                  
                  {generatedLabels.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="font-semibold mb-2">Prévia das Etiquetas:</p>
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        {generatedLabels.map((label, index) => (
                          <div key={index} className="flex justify-between text-xs bg-gray-50 p-2 rounded">
                            <span>{label.identifier}</span>
                            <span>Vence: {new Date(label.expiryDate).toLocaleDateString('pt-BR')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
              
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleBack}
                  disabled={loading}
                >
                  Voltar
                </Button>
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 flex-1"
                  onClick={handleConfirmGeneration}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : (
                    <Check className="w-5 h-5 mr-2" />
                  )}
                  Gerar Etiquetas
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return renderStepContent();
}