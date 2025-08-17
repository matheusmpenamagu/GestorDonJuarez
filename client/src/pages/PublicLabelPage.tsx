import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Loader2, Check, LogOut, QrCode, Minus, Plus } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import QRCodeLib from "qrcode";

// Componente para cada card de etiqueta
const LabelCard = ({ label }: { label: any }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  
  // Gerar identificador de 6 dígitos a partir do identifier completo
  const generateSixDigitId = (identifier: string) => {
    // Extrair apenas os últimos 6 dígitos numéricos do timestamp
    const match = identifier.match(/(\d+)/g);
    if (match && match.length > 0) {
      const timestamp = match[match.length - 2]; // Pega o timestamp antes do número final
      return timestamp.slice(-6); // Últimos 6 dígitos
    }
    return '000000';
  };

  const sixDigitId = generateSixDigitId(label.identifier);

  useEffect(() => {
    // Gerar QR code com o ID de 6 dígitos
    QRCodeLib.toDataURL(sixDigitId, {
      width: 80,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    })
    .then(url => setQrCodeUrl(url))
    .catch(err => console.error('Error generating QR code:', err));
  }, [sixDigitId]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 text-center shadow-sm">
      <div className="text-xs font-bold text-orange-600 mb-1">
        {sixDigitId}
      </div>
      {qrCodeUrl && (
        <img 
          src={qrCodeUrl} 
          alt={`QR ${sixDigitId}`}
          className="w-full h-auto"
        />
      )}
    </div>
  );
};

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
  const [quantity, setQuantity] = useState<number>(1);
  
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
      
      const url = `/api/products?categoryId=${categoryId}&includeShelfLifeFilter=true`;
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
    console.log('⏰ [SHELF-LIFE] === FETCHING SHELF LIFE ===');
    console.log('⏰ [SHELF-LIFE] Product ID:', productId);
    
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (pinUser?.sessionId) {
        console.log('⏰ [SHELF-LIFE] Using PIN sessionId:', pinUser.sessionId);
        headers['Authorization'] = `Bearer ${pinUser.sessionId}`;
      }
      
      const url = `/api/labels/shelf-lifes?productId=${productId}`;
      console.log('⏰ [SHELF-LIFE] Request URL:', url);
      
      const response = await fetch(url, {
        credentials: 'include',
        headers
      });
      
      console.log('⏰ [SHELF-LIFE] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('⏰ [SHELF-LIFE] Response data:', data);
        if (data.length > 0) {
          console.log('✅ [SHELF-LIFE] Shelf life found:', data[0]);
          setShelfLife(data[0]);
        } else {
          console.log('❌ [SHELF-LIFE] No shelf life data found for product');
        }
      } else {
        const errorData = await response.json();
        console.log('❌ [SHELF-LIFE] Failed to fetch shelf life:', errorData);
      }
    } catch (error) {
      console.error('❌ [SHELF-LIFE] Error fetching shelf life:', error);
    }
    console.log('⏰ [SHELF-LIFE] === END FETCHING SHELF LIFE ===');
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
    console.log('🛍️ [PRODUCT-SELECT] Selected product:', product);
    setSelectedProduct(product);
    console.log('🛍️ [PRODUCT-SELECT] Fetching portions and shelf life...');
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
    console.log('🔢 [QUANTITY] === QUANTITY SELECTION ===');
    console.log('🔢 [QUANTITY] Selected quantity:', quantity);
    console.log('🔢 [QUANTITY] Current state check:');
    console.log('🔢 [QUANTITY] - selectedProduct:', selectedProduct);
    console.log('🔢 [QUANTITY] - selectedPortion:', selectedPortion);
    console.log('🔢 [QUANTITY] - selectedStorage:', selectedStorage);
    console.log('🔢 [QUANTITY] - shelfLife:', shelfLife);
    console.log('🔢 [QUANTITY] - pinUser:', pinUser);
    
    setSelectedQuantity(quantity);
    setStep('confirmation');
    console.log('🔢 [QUANTITY] Calling generatePreview() with quantity:', quantity);
    generatePreview(quantity);
    console.log('🔢 [QUANTITY] === END QUANTITY SELECTION ===');
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

  const generatePreview = (quantity?: number) => {
    const quantityToUse = quantity || selectedQuantity;
    console.log('📋 [PREVIEW] === GENERATING PREVIEW LABELS ===');
    console.log('📋 [PREVIEW] Checking required data...');
    console.log('📋 [PREVIEW] - selectedProduct:', selectedProduct);
    console.log('📋 [PREVIEW] - selectedPortion:', selectedPortion);
    console.log('📋 [PREVIEW] - selectedStorage:', selectedStorage);
    console.log('📋 [PREVIEW] - shelfLife:', shelfLife);
    console.log('📋 [PREVIEW] - pinUser:', pinUser);
    console.log('📋 [PREVIEW] - quantityToUse:', quantityToUse);
    
    if (!selectedProduct || !selectedPortion || !selectedStorage || !shelfLife || !pinUser) {
      console.log('❌ [PREVIEW] Missing required data, aborting preview generation');
      return;
    }

    const today = new Date();
    const productionDate = today.toISOString().split('T')[0];
    console.log('📋 [PREVIEW] Production date:', productionDate);
    
    let expiryDays = 0;
    switch (selectedStorage) {
      case 'frozen':
        expiryDays = shelfLife.frozenDays;
        break;
      case 'cooled':
        expiryDays = shelfLife.chilledDays; // Correct property name
        break;
      case 'ambient':
        expiryDays = shelfLife.roomTemperatureDays; // Correct property name
        break;
    }

    console.log('📋 [PREVIEW] Storage method:', selectedStorage, 'Expiry days:', expiryDays);

    const expiryDate = new Date(today);
    expiryDate.setDate(expiryDate.getDate() + expiryDays);
    console.log('📋 [PREVIEW] Expiry date:', expiryDate.toISOString().split('T')[0]);

    const labels: Label[] = [];
    for (let i = 0; i < quantityToUse; i++) {
      const label = {
        productId: selectedProduct.id,
        responsibleId: pinUser.id,
        portionId: selectedPortion.id,
        storageMethod: selectedStorage,
        quantity: 1,
        productionDate,
        expiryDate: expiryDate.toISOString().split('T')[0],
        identifier: `${selectedProduct.code}-${Date.now() + i}-${i + 1}`,
      };
      labels.push(label);
      console.log(`📋 [PREVIEW] Generated label ${i + 1}:`, label);
    }
    
    console.log('📋 [PREVIEW] Total labels generated:', labels.length);
    setGeneratedLabels(labels);
    console.log('📋 [PREVIEW] Labels set in state, preview generation complete');
    console.log('📋 [PREVIEW] === END GENERATING PREVIEW LABELS ===');
  };



  const handleConfirmGeneration = async () => {
    console.log('🏷️ [GENERATE] === STARTING LABEL GENERATION ===');
    console.log('🏷️ [GENERATE] Generated labels count:', generatedLabels.length);
    console.log('🏷️ [GENERATE] First label sample:', generatedLabels[0]);
    console.log('🏷️ [GENERATE] PIN user:', pinUser);
    
    if (generatedLabels.length === 0) {
      console.log('❌ [GENERATE] No labels to generate, exiting');
      return;
    }

    setLoading(true);
    try {
      const sessionId = pinUser?.sessionId;
      console.log('🏷️ [GENERATE] Session ID:', sessionId);
      
      if (!sessionId) {
        throw new Error('Usuário não autenticado');
      }

      // Create labels in database one by one
      let successCount = 0;
      console.log('🏷️ [GENERATE] Starting to create labels individually...');
      
      for (let i = 0; i < generatedLabels.length; i++) {
        const label = generatedLabels[i];
        console.log(`🏷️ [GENERATE] Creating label ${i + 1}/${generatedLabels.length}:`, label);
        
        try {
          const response = await fetch('/api/labels', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${sessionId}`,
            },
            body: JSON.stringify(label),
          });

          console.log(`🏷️ [GENERATE] Label ${i + 1} response status:`, response.status);
          console.log(`🏷️ [GENERATE] Label ${i + 1} response headers:`, Array.from(response.headers.entries()));

          if (!response.ok) {
            const errorData = await response.json();
            console.error(`❌ [GENERATE] Error creating label ${i + 1}:`, errorData);
            continue; // Skip this label and continue with next
          }
          
          const responseData = await response.json();
          console.log(`✅ [GENERATE] Label ${i + 1} created successfully:`, responseData);
          successCount++;
        } catch (labelError) {
          console.error(`❌ [GENERATE] Exception creating label ${i + 1}:`, labelError);
          continue; // Skip this label and continue with next
        }
      }

      console.log('🏷️ [GENERATE] Generation complete. Success count:', successCount);

      if (successCount > 0) {
        toast({
          title: "Etiquetas geradas com sucesso!",
          description: `${successCount} de ${generatedLabels.length} etiqueta(s) foram criadas`,
        });
        
        console.log('🏷️ [GENERATE] Success toast shown, starting reset timer...');
        
        // Reset all states and go back to pin entry after 2 seconds
        setTimeout(() => {
          console.log('🏷️ [GENERATE] Resetting all states and returning to PIN screen...');
          setStep('pin');
          setPinUser(null);
          setPin('');
          setSelectedUnit(null);
          setSelectedCategory(null);
          setSelectedProduct(null);
          setSelectedPortion(null);
          setSelectedStorage(null);
          setSelectedQuantity(1);
          setQuantity(1);
          setGeneratedLabels([]);
          setUnits([]);
          setCategories([]);
          setProducts([]);
          setPortions([]);
          setShelfLife(null);
          console.log('🏷️ [GENERATE] Reset complete!');
        }, 2000);
      } else {
        throw new Error('Nenhuma etiqueta foi criada com sucesso');
      }

    } catch (error) {
      console.error('❌ [GENERATE] Fatal error creating labels:', error);
      toast({
        title: "Erro ao gerar etiquetas",
        description: "Houve um problema ao gerar as etiquetas. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log('🏷️ [GENERATE] === END LABEL GENERATION ===');
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
                      <p className="text-gray-600">{shelfLife.chilledDays} dias</p>
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
                      <p className="text-gray-600">{shelfLife.roomTemperatureDays} dias</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {step === 'quantity' && (
            <div>
              <h2 className="text-xl font-semibold mb-6 text-center">Quantidade de Etiquetas</h2>
              <div className="flex items-center justify-center space-x-6">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-16 h-16 text-2xl font-bold"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  -
                </Button>
                
                <div className="text-center">
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={quantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value) || 1;
                      setQuantity(Math.max(1, Math.min(999, value)));
                    }}
                    className="w-24 h-16 text-3xl font-bold text-center border-2 border-gray-300 rounded-lg focus:border-orange-500 focus:outline-none"
                  />
                  <p className="text-gray-600 text-sm mt-2">
                    {quantity === 1 ? 'etiqueta' : 'etiquetas'}
                  </p>
                </div>
                
                <Button
                  variant="outline"
                  size="lg"
                  className="w-16 h-16 text-2xl font-bold"
                  onClick={() => setQuantity(Math.min(999, quantity + 1))}
                  disabled={quantity >= 999}
                >
                  +
                </Button>
              </div>
              
              <div className="flex justify-center mt-8">
                <Button
                  onClick={() => handleQuantitySelect(quantity)}
                  className="px-8 py-3 text-lg"
                >
                  Continuar
                </Button>
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
                      <p><strong>Porção:</strong> {selectedPortion?.quantity} {selectedPortion?.unitOfMeasure}</p>
                    </div>
                    <div>
                      <p><strong>Armazenamento:</strong> {
                        selectedStorage === 'frozen' ? 'Congelado' :
                        selectedStorage === 'cooled' ? 'Resfriado' : 'Ambiente'
                      }</p>
                      <p><strong>Quantidade:</strong> {selectedQuantity} etiqueta(s)</p>
                      <p><strong>Data de Manipulação:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
                      <p><strong>Data de Validade:</strong> {
                        generatedLabels.length > 0 
                          ? new Date(generatedLabels[0].expiryDate).toLocaleDateString('pt-BR')
                          : '-'
                      }</p>
                    </div>
                  </div>
                  
                  {generatedLabels.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="font-semibold mb-4">Prévia das Etiquetas:</p>
                      <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
                        {generatedLabels.map((label, index) => (
                          <LabelCard key={index} label={label} />
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
                  onClick={() => {
                    console.log('🖱️ [BUTTON] Generate button clicked!');
                    console.log('🖱️ [BUTTON] Loading state:', loading);
                    console.log('🖱️ [BUTTON] Generated labels count:', generatedLabels.length);
                    handleConfirmGeneration();
                  }}
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