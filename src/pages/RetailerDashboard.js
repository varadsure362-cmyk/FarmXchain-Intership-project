import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  ShoppingCart,
  AlertCircle,
  Plus,
} from "lucide-react";
import { getRetailerInventory } from "./api";
import axiosInstance from "../api/axiosInstance";
import "../styles/RetailerDashboard.css";

const RetailerDashboard = () => {
  const { isDark } = useTheme();

  const [availableProducts, setAvailableProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [cart, setCart] = useState([]);
  const [orderHistory, setOrderHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("inventory");
  const [addedProductId, setAddedProductId] = useState(null);

  // ✅ Fetch retailer inventory
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);
      try {
        const retailerData = await getRetailerInventory();
        const mappedProducts = retailerData.products.map((product) => ({
          id: product.id,
          name: product.name || product.cropType,
          price: product.price || 2.5,
          supplier: `Farmer ID: ${product.farmerId}`,
          stock: product.quantity || 100,
          image: getProductEmoji(product),
          ...product,
        }));
        setAvailableProducts(mappedProducts);
      } catch (err) {
        console.error("Failed to fetch products:", err);
        setError(err.message);
        setAvailableProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // ✅ Fetch retailer orders (from customers)
  useEffect(() => {
    const fetchRetailerOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const response = await axiosInstance.get("/api/orders/retailer", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOrderHistory(response.data || []);
      } catch (error) {
        console.error("Failed to fetch retailer orders:", error);
        alert("Failed to load retailer orders: " + (error.response?.data?.message || error.message));
        setOrderHistory([]);
      }
    };
    fetchRetailerOrders();
  }, []);

  const getProductEmoji = (product) => {
    const name = (product?.name || product?.cropType || "").toLowerCase();
    if (name.includes("tomato")) return "🍅";
    if (name.includes("carrot")) return "🥕";
    if (name.includes("banana")) return "🍌";
    if (name.includes("potato")) return "🥔";
    if (name.includes("onion")) return "🧅";
    if (name.includes("mango")) return "🥭";
    if (name.includes("apple")) return "🍎";
    if (name.includes("wheat") || name.includes("rice")) return "🌾";
    if (name.includes("corn")) return "🌽";
    if (name.includes("pepper") || name.includes("chilli")) return "🌶️";
    return "📦";
  };

  const addToCart = (product) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(cart.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1500);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
    } else {
      setCart(cart.map((item) =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      ));
    }
  };

  // Retailers receive orders — they don't place them
  const placeOrder = () => {
    alert("Retailers receive orders from customers. Orders appear automatically when customers checkout your products.");
  };

  // ✅ Confirm order (PLACED → CONFIRMED)
  const handleConfirmOrder = async (orderId) => {
    try {
      const token = localStorage.getItem("token");
      await axiosInstance.put(`/api/orders/${orderId}/confirm`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const response = await axiosInstance.get("/api/orders/retailer", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrderHistory(response.data || []);
    } catch (err) {
      alert("Failed to confirm order: " + (err.response?.data?.message || err.message));
    }
  };

  // ✅ Pack order (CONFIRMED → PACKED), auto-assigns distributor
  const handlePackOrder = async (orderId) => {
    try {
      const token = localStorage.getItem("token");
      await axiosInstance.put(`/api/orders/${orderId}/pack`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const response = await axiosInstance.get("/api/orders/retailer", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrderHistory(response.data || []);
    } catch (err) {
      alert("Failed to pack order: " + (err.response?.data?.message || err.message));
    }
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const usdToInrRate = 83;

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      isDark
        ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white"
        : "bg-gradient-to-br from-emerald-50 via-white to-green-50"
    }`}>

      {/* Header */}
      <header className={`backdrop-blur-xl sticky top-0 z-40 transition-colors duration-200 ${
        isDark ? "bg-slate-800/80 border-b border-slate-700" : "bg-white/80 border-b border-white/50"
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
            Retailer Dashboard
          </h1>
          <p className={`mt-1 ${isDark ? "text-slate-300" : "text-gray-600"}`}>
            Manage inventory and fulfil customer orders
          </p>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-12">

        {/* Tabs */}
        <div className={`flex gap-4 mb-8 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
          {[
            { id: "inventory", label: "📦 Inventory" },
            { id: "cart", label: "🛒 Cart", badge: cart.length },
            { id: "orders", label: "📋 Customer Orders", badge: orderHistory.filter(o => o.status === "PLACED" || o.status === "CONFIRMED").length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-semibold transition-all border-b-2 relative ${
                activeTab === tab.id
                  ? "text-emerald-600 border-emerald-600"
                  : isDark
                    ? "text-slate-400 border-transparent hover:text-slate-300"
                    : "text-gray-600 border-transparent hover:text-gray-900"
              }`}
            >
              {tab.label}
              {tab.badge > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── INVENTORY TAB ── */}
        {activeTab === "inventory" && (
          <>
            {loading && (
              <p className={`text-center py-8 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Loading products...
              </p>
            )}
            {!loading && availableProducts.length === 0 && (
              <div className={`rounded-2xl p-12 text-center ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white/80 border border-gray-200"}`}>
                <p className="text-5xl mb-4">🌱</p>
                <p className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  No products assigned yet
                </p>
                <p className={`mt-2 text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Products listed by farmers will appear here once assigned to you.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {availableProducts.map((product) => (
                <div key={product.id} className={`backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition ${
                  isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white/80 border border-white/50"
                }`}>
                  <div className="h-32 bg-gradient-to-br from-emerald-200 to-green-300 flex items-center justify-center text-5xl">
                    {product.image}
                  </div>
                  <div className="p-6">
                    <h3 className={`text-lg font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
                      {product.name}
                    </h3>
                    <p className={`text-xs mb-3 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                      {product.supplier}
                    </p>
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-gray-700"}`}>Stock</span>
                        <span className={`text-sm font-bold ${product.stock > 50 ? "text-green-600" : "text-orange-600"}`}>
                          {product.stock} kg
                        </span>
                      </div>
                      <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? "bg-slate-700" : "bg-gray-200"}`}>
                        <div
                          className={`h-full transition-all ${product.stock > 50 ? "bg-gradient-to-r from-green-400 to-emerald-600" : "bg-gradient-to-r from-orange-400 to-red-600"}`}
                          style={{ width: `${Math.min(product.stock / 2, 100)}%` }}
                        />
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600 mb-4">
                      ₹{Math.round(product.price)}/kg
                    </p>
                    <button
                      onClick={() => addToCart(product)}
                      className={`w-full inline-flex items-center justify-center gap-2 py-2 rounded-lg font-semibold transition-all ${
                        addedProductId === product.id
                          ? isDark ? "bg-green-900/40 text-green-300" : "bg-green-100 text-green-900"
                          : "bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white"
                      }`}
                    >
                      <Plus size={18} />
                      {addedProductId === product.id ? "Added!" : "Add to Cart"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── CART TAB ── */}
        {activeTab === "cart" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className={`lg:col-span-2 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg ${
              isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white/80 border border-white/50"
            }`}>
              <div className={`p-6 border-b ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Shopping Cart</h2>
              </div>
              {cart.length === 0 ? (
                <div className="p-12 text-center">
                  <ShoppingCart size={48} className={`mx-auto mb-4 ${isDark ? "text-slate-500" : "text-gray-300"}`} />
                  <p className={`font-medium ${isDark ? "text-slate-400" : "text-gray-500"}`}>Your cart is empty</p>
                </div>
              ) : (
                <div className={`divide-y ${isDark ? "divide-slate-700" : "divide-gray-200"}`}>
                  {cart.map((item) => (
                    <div key={item.id} className={`p-6 transition ${isDark ? "hover:bg-slate-700/50" : "hover:bg-gray-50/50"}`}>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="text-4xl">{item.image}</div>
                          <div>
                            <p className={`font-bold ${isDark ? "text-white" : "text-gray-900"}`}>{item.name}</p>
                            <p className={`text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                              ₹{Math.round(item.price)}/kg
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="quantity-btn">−</button>
                          <span className={`w-12 text-center font-semibold ${isDark ? "text-white" : ""}`}>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="quantity-btn">+</button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                          ₹{Math.round(item.price * item.quantity)}
                        </p>
                        <button onClick={() => removeFromCart(item.id)} className="cart-remove-btn">Remove</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={`backdrop-blur-xl rounded-2xl p-6 shadow-lg h-fit ${
              isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white/80 border border-white/50"
            }`}>
              <h3 className={`text-xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-900"}`}>Order Summary</h3>
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span className={isDark ? "text-slate-300" : "text-gray-600"}>Subtotal</span>
                  <span className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                    ₹{Math.round(cartTotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className={isDark ? "text-slate-300" : "text-gray-600"}>Shipping</span>
                  <span className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>FREE</span>
                </div>
                <div className={`border-t pt-4 flex justify-between ${isDark ? "border-slate-700" : "border-gray-200"}`}>
                  <span className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Total</span>
                  <span className="text-lg font-bold text-emerald-600">₹{Math.round(cartTotal)}</span>
                </div>
              </div>
              <button
                onClick={placeOrder}
                disabled={cart.length === 0}
                className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Place Order
              </button>
            </div>
          </div>
        )}

        {/* ── ORDERS TAB ── */}
        {activeTab === "orders" && (
          <div className={`backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg ${
            isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white/80 border border-white/50"
          }`}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${isDark ? "border-slate-700 bg-slate-700/30" : "border-gray-200 bg-gray-50/50"}`}>
                    {["Order ID", "Items", "Total (₹)", "Date", "Status", "Actions"].map((h) => (
                      <th key={h} className={`px-6 py-4 text-left text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orderHistory.length === 0 ? (
                    <tr>
                      <td colSpan="6" className={`px-6 py-12 text-center ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        <div className="flex flex-col items-center">
                          <AlertCircle size={40} className={`mb-2 ${isDark ? "text-slate-600" : "text-gray-300"}`} />
                          <p className="font-medium">No customer orders yet</p>
                          <p className="text-sm mt-1 opacity-70">Orders appear here when customers buy products assigned to you</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    orderHistory.map((order) => (
                      <tr key={order.id} className={`border-b transition ${
                        isDark ? "border-slate-700 hover:bg-slate-700/50" : "border-gray-100 hover:bg-gray-50/50"
                      }`}>
                        <td className={`px-6 py-4 text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>#{order.id}</td>
                        <td className={`px-6 py-4 text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                          {order.items?.map((item, idx) => (
                            <div key={idx}>{item.productName || item.name} ×{item.quantity}</div>
                          ))}
                        </td>
                        <td className={`px-6 py-4 text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                          ₹{Math.round(Number(order.totalAmount || 0))}
                        </td>
                        <td className={`px-6 py-4 text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold ${
                            order.status === "PLACED"    ? "bg-yellow-100 text-yellow-800" :
                            order.status === "CONFIRMED" ? "bg-blue-100 text-blue-800" :
                            order.status === "PACKED"    ? "bg-orange-100 text-orange-800" :
                            order.status === "SHIPPED"   ? "bg-purple-100 text-purple-800" :
                            order.status === "DELIVERED" ? "bg-green-100 text-green-800" :
                            "bg-gray-100 text-gray-700"
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            {order.status === "PLACED" && (
                              <button
                                onClick={() => handleConfirmOrder(order.id)}
                                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition"
                              >
                                ✅ Confirm
                              </button>
                            )}
                            {order.status === "CONFIRMED" && (
                              <button
                                onClick={() => handlePackOrder(order.id)}
                                className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg transition"
                              >
                                📦 Pack
                              </button>
                            )}
                            {order.status === "PACKED" && (
                              <span className="text-xs text-gray-500 italic">Waiting for distributor…</span>
                            )}
                            {order.status === "SHIPPED" && (
                              <span className="text-xs text-purple-600 font-medium">🚚 In transit</span>
                            )}
                            {order.status === "DELIVERED" && (
                              <span className="text-xs text-green-600 font-medium">🎉 Delivered</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>
    </div>
  );
};

export default RetailerDashboard;
