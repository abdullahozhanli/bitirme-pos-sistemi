import React, { useMemo, useState } from 'react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../ui/sheet';
import { ScrollArea } from '../ui/scroll-area';
import { 
  Search, 
  ShoppingCart, 
  Clock, 
  Plus, 
  Minus, 
  Trash2, 
  Settings,
  UtensilsCrossed,
} from 'lucide-react';
import { menuItems } from '../../data/mockData';

export default function MenuPage() {
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState({});
  const [cart, setCart] = useState([]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory = selectedCategory === 'Tümü' || item.category === selectedCategory;
      const lowerSearch = searchTerm.toLowerCase();
      const matchesSearch =
        item.name.toLowerCase().includes(lowerSearch) ||
        item.description.toLowerCase().includes(lowerSearch);
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchTerm]);

  const handleAddToCart = (item) => {
    const selectedVariant = selectedVariants[item.id];
    const variant = item.variants?.find((v) => v.name === selectedVariant);
    const finalPrice = item.price + (variant?.priceModifier || 0);

    const existingItem = cart.find((c) => c.menuItemId === item.id && c.variant === selectedVariant);

    if (existingItem) {
      setCart(
        cart.map((c) => (c.id === existingItem.id ? { ...c, quantity: c.quantity + 1 } : c))
      );
    } else {
      setCart([
        ...cart,
        {
          id: `${item.id}-${selectedVariant || 'default'}-${Date.now()}`,
          menuItemId: item.id,
          name: item.name,
          price: finalPrice,
          quantity: 1,
          variant: selectedVariant,
        },
      ]);
    }
  };

  const handleUpdateQuantity = (cartItemId, change) => {
    setCart(
      cart
        .map((item) =>
          item.id === cartItemId
            ? { ...item, quantity: Math.max(1, item.quantity + change) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const handleRemoveFromCart = (cartItemId) => {
    setCart(cart.filter((item) => item.id !== cartItemId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  const handlePlaceOrder = () => {
    console.log('Sipariş verildi:', cart);
    setCart([]);
    setIsCartOpen(false);
  };

  const categories = useMemo(
    () => ['Tümü', ...Array.from(new Set(menuItems.map((i) => i.category)))],
    []
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-40 bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-[var(--brand-brown)] to-[var(--brand-coffee)] rounded-lg flex items-center justify-center">
                <UtensilsCrossed className="w-6 h-6 text-white" />
              </div>
              <span className="text-lg font-semibold">Restoran Menüsü</span>
            </div>

            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="px-3 py-1">Masa: 5</Badge>
              <Button onClick={() => setIsCartOpen(true)} className="gap-2 bg-gray-900 hover:bg-gray-800">
                <ShoppingCart className="w-4 h-4" />
                {`Sepet (${cart.reduce((sum, item) => sum + item.quantity, 0)})`}
              </Button>
              <Button variant="outline" size="icon" className="border-gray-300">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-3xl font-bold">Menümüz</h2>
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Menüde ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 border-gray-300 focus:border-[var(--brand-brown)] focus:ring-[var(--brand-brown)]"
              />
            </div>
            <Button onClick={() => setIsCartOpen(true)} className="gap-2 bg-gray-900 hover:bg-gray-800 whitespace-nowrap">
              <ShoppingCart className="w-4 h-4" />
              Sepet
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 mb-8">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                className={`rounded-full px-6 transition-all duration-200 ${
                  selectedCategory === category
                    ? 'bg-gray-900 hover:bg-gray-800 text-white shadow-md'
                    : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                {category}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-xl transition-shadow duration-300 border border-gray-200">
              <div className="aspect-[4/3] overflow-hidden bg-gray-100">
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 flex-1">{item.name}</h3>
                  <span className="text-xl font-bold text-black whitespace-nowrap">
                    {item.price.toFixed(2)}₺
                  </span>
                </div>

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {item.tags.map((tag, idx) => (
                      <Badge key={idx} className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-0.5">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>{item.prepTime} dk</span>
                </div>

                {item.allergens && item.allergens.length > 0 && (
                  <p className="text-xs text-gray-500">Alerjenler: {item.allergens.join(', ')}</p>
                )}

                {item.variants && item.variants.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">Boyut Seçin:</p>
                    <div className="grid grid-cols-3 gap-2">
                      {item.variants.map((variant) => {
                        const isSelected = selectedVariants[item.id] === variant.name;
                        return (
                          <Button
                            key={variant.name}
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            onClick={() =>
                              setSelectedVariants((prev) => ({
                                ...prev,
                                [item.id]: variant.name,
                              }))
                            }
                            className={`text-xs py-2 h-auto transition-all duration-200 ${
                              isSelected
                                ? 'bg-[#1a1a1a] hover:bg-[#333333] text-white border-[#1a1a1a]'
                                : 'bg-white border-[#cccccc] hover:bg-[#f5f5f5] text-[#1a1a1a]'
                            }`}
                          >
                            <div className="flex flex-col items-center" style={{ borderRadius: 8 }}>
                              <span className="font-medium">{variant.name}</span>
                              {variant.priceModifier !== 0 && (
                                <span className="text-[10px] opacity-80">
                                  {variant.priceModifier > 0 ? '+' : ''}
                                  {variant.priceModifier.toFixed(2)}₺
                                </span>
                              )}
                            </div>
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Button
                  onClick={() => handleAddToCart(item)}
                  className="w-full text-white py-6 text-base font-semibold transition-all duration-200"
                  style={{ backgroundColor: '#000000', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#222222')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#000000')}
                >
                  Sepete Ekle
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-2xl font-bold">Sepetim</SheetTitle>
          </SheetHeader>

          <div className="flex flex-col h-full py-6">
            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
                <ShoppingCart className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-500">Sepetiniz boş</p>
                <p className="text-sm text-gray-400 mt-2">Menüden ürün ekleyin</p>
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 -mx-6 px-6">
                  <div className="space-y-4">
                    {cart.map((cartItem) => (
                      <div
                        key={cartItem.id}
                        className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{cartItem.name}</p>
                          {cartItem.variant && (
                            <p className="text-xs text-gray-500 mt-1">{cartItem.variant}</p>
                          )}
                          <p className="text-sm font-semibold text-black mt-1">
                            {cartItem.price.toFixed(2)}₺
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full border-gray-300"
                            onClick={() => handleUpdateQuantity(cartItem.id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{cartItem.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full border-gray-300"
                            onClick={() => handleUpdateQuantity(cartItem.id, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleRemoveFromCart(cartItem.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="border-t pt-6 space-y-4 mt-6">
                  <div className="flex items-center justify-between text-xl font-bold">
                    <span>Toplam:</span>
                    <span className="text-black">
                      {cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)}₺
                    </span>
                  </div>

                  <Button
                    className="w-full text-white py-6 text-base font-semibold"
                    style={{ backgroundColor: '#0b0b1a', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: 'all 0.25s ease', fontFamily: 'Poppins, Inter, Segoe UI, Roboto, sans-serif' }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1a1a2e')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0b0b1a')}
                    onClick={handlePlaceOrder}
                  >
                    Sipariş Ver
                  </Button>

                  <Button
                    className="w-full text-white py-6 text-base font-semibold"
                    style={{ backgroundColor: '#0b0b1a', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.2)', transition: 'all 0.25s ease', fontFamily: 'Poppins, Inter, Segoe UI, Roboto, sans-serif' }}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1a1a2e')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#0b0b1a')}
                    onClick={handleClearCart}
                  >
                    Sepeti Temizle
                  </Button>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}


