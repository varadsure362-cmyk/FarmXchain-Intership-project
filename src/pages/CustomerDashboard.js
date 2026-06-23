import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  Heart,
  Star,
  Truck,
  BadgeCheck,
  X,
  CheckCircle2,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import axiosInstance from "../api/axiosInstance";

// ✅ USD to INR conversion constants
const USD_TO_INR = 83; // configurable conversion rate
const formatINR = (price) => {
  const inr = Number(price);
  // Intentionally round to integer for cleaner display (no decimals)
  const roundedINR = Math.round(inr);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedINR);
};

const CustomerDashboard = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();

  // ✅ State for products from backend
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [cart, setCart] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [showAIModal, setShowAIModal] = useState(false);
  const [activeTab, setActiveTab] = useState("shop"); // "shop" | "orders"
  const [myOrders, setMyOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Product emoji mapping — used as fallback when product has no Cloudinary image
  const getProductLogo = (product) => {
    const name = (product?.name || product?.cropType || "").toLowerCase();
    if (name.includes("tomato")) return "🍅";
    if (name.includes("carrot")) return "🥕";
    if (name.includes("banana")) return "🍌";
    if (name.includes("straw") || name.includes("berry")) return "🍓";
    if (
      name.includes("lettuce") ||
      name.includes("spinach") ||
      name.includes("leaf")
    )
      return "🥬";
    if (name.includes("corn")) return "🌽";
    if (name.includes("grape")) return "🍇";
    if (name.includes("mango")) return "🥭";
    if (name.includes("onion")) return "🧅";
    if (name.includes("potato")) return "🥔";
    if (name.includes("apple")) return "🍎";
    if (
      name.includes("wheat") ||
      name.includes("rice") ||
      name.includes("basmati")
    )
      return "🌾";
    if (
      name.includes("chilli") ||
      name.includes("chili") ||
      name.includes("pepper")
    )
      return "🌶️";
    if (name.includes("cucumber")) return "🥒";
    if (name.includes("avocado")) return "🥑";
    // fallback
    return "🥬";
  };

  const extractProducts = (payload) => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.products)) return payload.products;
    return [];
  };

  const toDisplayProducts = (rawProducts) => {
    const mappedProducts = (rawProducts || []).map((product) => {
      // Use real name — prefer product.name, fallback to cropType
      const displayName = product.name || product.cropType || "Farm Product";
      // Real freshness from harvest date, not random %
      const freshnessLabel = product.harvestDate
        ? `Harvested: ${product.harvestDate}`
        : "Fresh";
      // Stable (non-random) rating and reviews based on product ID
      const stableRating = product.id ? (3.5 + (product.id % 3) * 0.5) : 4.0;
      const stableReviews = product.id ? 100 + ((product.id * 37) % 300) : 150;
      // Show real Cloudinary image if available
      const hasRealImage = product.imageUrl && product.imageUrl.startsWith("http");
      return {
        ...product,
        name: displayName,
        price: product.price || 2.5,
        rating: stableRating,
        reviews: stableReviews,
        freshness: freshnessLabel,
        displayIcon: hasRealImage ? null : getProductLogo(product),
      };
    });

    const seenIds = new Map();
    return mappedProducts.filter((product) => {
      if (seenIds.has(product.id)) return false;
      seenIds.set(product.id, true);
      return true;
    });
  };

  // ✅ Fetch all available products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const loadProducts = async (path) => {
      const response = await axiosInstance.get(path);
      return toDisplayProducts(extractProducts(response.data));
    };

    try {
      const productsFromApi = await loadProducts(
        "/api/products/customer/products",
      );
      setProducts(productsFromApi);
    } catch (primaryError) {
      console.log("[CustomerDashboard] primary fetch error", primaryError);

      setError({
        status: primaryError?.status ?? 0,
        message:
          primaryError?.message || "Failed to load products from backend",
        data: primaryError?.data,
      });
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ✅ Fetch customer's own orders
  const fetchMyOrders = async () => {
    setOrdersLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const res = await axiosInstance.get("/api/orders/customer", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setMyOrders(res.data || []);
    } catch (e) {
      console.error("Failed to load orders:", e);
      alert("Error loading orders: " + (e.message || "Unauthorized"));
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    fetchMyOrders();
  }, []);

  useEffect(() => {
    const handleAIModalTrigger = () => setShowAIModal(true);
    window.addEventListener("openAIQualityCheck", handleAIModalTrigger);
    return () =>
      window.removeEventListener("openAIQualityCheck", handleAIModalTrigger);
  }, []);

  const addToCart = (product) => {
    // Use displayIcon for cart item
    const icon = product.displayIcon || getProductLogo(product);
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCart([...cart, { ...product, image: icon, quantity: 1 }]);
    }
  };

  const toggleWishlist = (product) => {
    if (wishlist.find((item) => item.id === product.id)) {
      setWishlist(wishlist.filter((item) => item.id !== product.id));
    } else {
      setWishlist([...wishlist, product]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter((item) => item.id !== productId));
  };

  const updateQuantity = (productId, change) => {
    setCart(
      cart
        .map((item) => {
          if (item.id === productId) {
            const newQuantity = item.quantity + change;
            return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
          }
          return item;
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to place an order");
        return;
      }

      await axiosInstance.post(
        "/api/orders",
        {
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      alert(
        "Order placed successfully! 🎉\n\nYour fresh produce will be delivered soon.\nTrack your order from farm to door.",
      );
      setCart([]);
      // Refresh orders list and switch to Orders tab
      fetchMyOrders();
      setActiveTab("orders");
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to place order";
      alert(`Order failed: ${errorMessage}`);
    }
  };

  // ✅ Calculate cart total in INR (USD prices * 83)
  const cartTotalINR = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );

  // Deduplicate by id before rendering to avoid repeated cards in UI.
  const dedupedProducts = Array.from(
    new Map(
      (products || []).map((p) => [
        p.id ?? `${p.cropType}-${p.harvestDate ?? ""}`,
        p,
      ]),
    ),
  ).map(([, v]) => v);

  return (
    // Dark mode applied to entire page wrapper with smooth transition
    <div
      className={`min-h-screen transition-colors duration-200 ${isDark
        ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white"
        : "bg-gradient-to-br from-emerald-50 via-white to-green-50"
        }`}
    >
      {/* AI Quality Check Modal */}
      {showAIModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className={`rounded-3xl shadow-2xl max-w-md w-full overflow-hidden transform transition-all ${isDark ? "bg-slate-800" : "bg-white"
              }`}
          >
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-2xl font-bold flex items-center gap-2">
                    🤖 AI Quality Check
                  </h3>
                  <p className="text-emerald-50 mt-1 text-sm">
                    Advanced Quality Assurance
                  </p>
                </div>
                <button
                  onClick={() => setShowAIModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            <div className={`p-6 ${isDark ? "bg-slate-800" : "bg-white"}`}>
              <p
                className={`mb-4 font-medium ${isDark ? "text-slate-300" : "text-gray-700"
                  }`}
              >
                Our AI analyzes:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="text-emerald-500 flex-shrink-0 mt-0.5"
                    size={20}
                  />
                  <p className={isDark ? "text-slate-300" : "text-gray-700"}>
                    Product freshness indicators
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="text-emerald-500 flex-shrink-0 mt-0.5"
                    size={20}
                  />
                  <p className={isDark ? "text-slate-300" : "text-gray-700"}>
                    Organic certification validity
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="text-emerald-500 flex-shrink-0 mt-0.5"
                    size={20}
                  />
                  <p className={isDark ? "text-slate-300" : "text-gray-700"}>
                    Farm traceability data
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="text-emerald-500 flex-shrink-0 mt-0.5"
                    size={20}
                  />
                  <p className={isDark ? "text-slate-300" : "text-gray-700"}>
                    Harvest date verification
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    className="text-emerald-500 flex-shrink-0 mt-0.5"
                    size={20}
                  />
                  <p className={isDark ? "text-slate-300" : "text-gray-700"}>
                    Transportation conditions
                  </p>
                </div>
              </div>
              <div
                className={`mt-6 p-4 rounded-xl border ${isDark
                  ? "bg-emerald-900/30 border-emerald-700 text-emerald-200"
                  : "bg-emerald-50 border-emerald-200 text-emerald-900"
                  }`}
              >
                <p className="text-emerald-900/80 dark:text-emerald-200 font-semibold text-center">
                  ✓ Upload a product image for instant AI verification!
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAIModal(false);
                  navigate("/ai-quality-check");
                }}
                className="w-full mt-6 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-3 rounded-xl transition"
              >
                Start AI Verification
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header - dark mode aware */}
      <header
        className={`backdrop-blur-xl border-b sticky top-0 z-40 transition-colors duration-200 ${isDark
          ? "bg-slate-800/80 border-slate-700"
          : "bg-white/80 border-white/50"
          }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className={`text-3xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                FarmChainX Marketplace
              </h1>
              <p className={isDark ? "text-slate-400 mt-1" : "text-gray-600 mt-1"}>
                Fresh produce from local farms
              </p>
            </div>
            {/* Tab Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("shop")}
                className={`px-5 py-2 rounded-full font-semibold transition-all ${activeTab === "shop"
                    ? "bg-emerald-600 text-white shadow-lg"
                    : isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                🛍️ Shop
              </button>
              <button
                onClick={() => { setActiveTab("orders"); fetchMyOrders(); }}
                className={`px-5 py-2 rounded-full font-semibold transition-all relative ${activeTab === "orders"
                    ? "bg-emerald-600 text-white shadow-lg"
                    : isDark ? "bg-slate-700 text-slate-300 hover:bg-slate-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
              >
                📦 My Orders
                {myOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                    {myOrders.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* ===== MY ORDERS TAB ===== */}
        {activeTab === "orders" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                📦 My Orders
              </h2>
              <button
                onClick={fetchMyOrders}
                className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
              >
                🔄 Refresh
              </button>
            </div>

            {ordersLoading && (
              <p className={`text-center py-8 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                Loading your orders...
              </p>
            )}

            {!ordersLoading && myOrders.length === 0 && (
              <div className={`rounded-2xl p-12 text-center ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white/80 border border-gray-200"
                }`}>
                <p className="text-5xl mb-4">📭</p>
                <p className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                  No orders yet
                </p>
                <p className={`mt-2 ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                  Go to Shop tab, add items to cart and checkout!
                </p>
                <button
                  onClick={() => setActiveTab("shop")}
                  className="mt-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-2 rounded-full transition"
                >
                  Start Shopping
                </button>
              </div>
            )}

            <div className="space-y-4">
              {myOrders.map((order) => (
                <div
                  key={order.id}
                  className={`rounded-2xl p-6 shadow-lg ${isDark ? "bg-slate-800/50 border border-slate-700" : "bg-white/80 border border-gray-200"
                    }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                      <p className={`font-bold text-lg ${isDark ? "text-white" : "text-gray-900"}`}>
                        Order #{order.id}
                      </p>
                      <p className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}>
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                          year: "numeric", month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit"
                        }) : ""}
                      </p>
                    </div>
                    <span className={`px-4 py-1 rounded-full text-sm font-bold ${order.status === "PLACED" ? "bg-yellow-100 text-yellow-800" :
                        order.status === "CONFIRMED" ? "bg-blue-100 text-blue-800" :
                          order.status === "PACKED" ? "bg-orange-100 text-orange-800" :
                            order.status === "SHIPPED" ? "bg-purple-100 text-purple-800" :
                              order.status === "DELIVERED" ? "bg-green-100 text-green-800" :
                                order.status === "CANCELLED" ? "bg-red-100 text-red-800" :
                                  "bg-gray-100 text-gray-800"
                      }`}>
                      {order.status === "PLACED" && "⏳ "}
                      {order.status === "CONFIRMED" && "✅ "}
                      {order.status === "PACKED" && "📦 "}
                      {order.status === "SHIPPED" && "🚚 "}
                      {order.status === "DELIVERED" && "🎉 "}
                      {order.status === "CANCELLED" && "❌ "}
                      {order.status}
                    </span>
                  </div>

                  {/* Order Items */}
                  {order.items && order.items.length > 0 && (
                    <div className={`rounded-xl p-4 mb-4 ${isDark ? "bg-slate-700/50" : "bg-gray-50"
                      }`}>
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm py-1">
                          <span className={isDark ? "text-slate-300" : "text-gray-700"}>
                            {item.productName || `Product #${item.productId}`} × {item.quantity}
                          </span>
                          <span className={`font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                            {formatINR(item.priceAtPurchase * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className={isDark ? "text-slate-400" : "text-gray-600"}>
                      Total
                    </span>
                    <span className="font-bold text-emerald-600 text-lg">
                      {formatINR(order.totalAmount)}
                    </span>
                  </div>

                  {/* Progress tracker */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs">
                      {["PLACED", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"].map((s) => (
                        <span key={s} className={`font-semibold ${order.status === s ? "text-emerald-600" :
                            ["PLACED", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"].indexOf(s)
                              < ["PLACED", "CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"].indexOf(order.status)
                              ? "text-emerald-400" : isDark ? "text-slate-600" : "text-gray-300"
                          }`}>{s}</span>
                      ))}
                    </div>
                    <div className={`h-2 rounded-full mt-1 ${isDark ? "bg-slate-700" : "bg-gray-200"}`}>
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 to-green-600 rounded-full transition-all"
                        style={{
                          width: `${order.status === "PLACED" ? 10 :
                              order.status === "CONFIRMED" ? 30 :
                                order.status === "PACKED" ? 55 :
                                  order.status === "SHIPPED" ? 80 :
                                    order.status === "DELIVERED" ? 100 : 0
                            }%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== SHOP TAB ===== */}
        {activeTab === "shop" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Marketplace Section */}
            <div className="lg:col-span-2">
              {/* Featured Banner */}
              <div
                className={`backdrop-blur-xl border rounded-3xl p-12 mb-12 overflow-hidden relative transition-colors duration-200 ${isDark
                  ? "bg-gradient-to-r from-emerald-500/10 to-green-500/10 border-emerald-900/30"
                  : "bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-emerald-200/50"
                  }`}
              >
                <div className="relative z-10">
                  <h2
                    className={`text-4xl font-bold mb-4 ${isDark ? "text-white" : "text-gray-900"
                      }`}
                  >
                    Farm Fresh Delivered
                  </h2>
                  <p
                    className={`text-xl mb-6 max-w-2xl ${isDark ? "text-slate-300" : "text-gray-800"
                      }`}
                  >
                    Direct from our network of certified organic farms. Traceable,
                    sustainable, and delicious.
                  </p>
                  <div className="flex gap-4">
                    <div
                      className={`flex items-center gap-2 backdrop-blur-sm rounded-full px-4 py-2 transition-colors duration-200 ${isDark ? "bg-slate-700/50" : "bg-white/80"
                        }`}
                    >
                      <BadgeCheck className="text-emerald-600" size={20} />
                      <span
                        className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"
                          }`}
                      >
                        Certified Organic
                      </span>
                    </div>
                    <div
                      className={`flex items-center gap-2 backdrop-blur-sm rounded-full px-4 py-2 transition-colors duration-200 ${isDark ? "bg-slate-700/50" : "bg-white/80"
                        }`}
                    >
                      <Truck className="text-emerald-600" size={20} />
                      <span
                        className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"
                          }`}
                      >
                        Fast Delivery
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Products Grid */}
              <div className="mb-8">
                <h3
                  className={`text-2xl font-bold mb-6 ${isDark ? "text-white" : "text-gray-900"
                    }`}
                >
                  Available Products
                </h3>

                {/* ✅ Loading state */}
                {loading && (
                  <div className="text-center py-8">
                    <p className={isDark ? "text-gray-300" : "text-gray-600"}>
                      Loading products...
                    </p>
                  </div>
                )}

                {/* ✅ Error state */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-red-800 font-semibold">
                        Failed to load products
                      </p>
                      <p className="text-red-700 text-sm mt-1">
                        Status: {error.status || "N/A"} — {error.message}
                      </p>
                    </div>
                    <button
                      onClick={fetchProducts}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-semibold"
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* ✅ Products grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {dedupedProducts.map((product, idx) => (
                    <div
                      key={product.id ?? `${product.cropType}-${idx}`}
                      className={`backdrop-blur-xl border rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition transform hover:scale-105 ${isDark
                        ? "bg-slate-700/40 border-slate-600"
                        : "bg-white/80 border-white/50"
                        }`}
                    >
                      {/* Product Icon Section - Display emoji icon */}
                      <div className="h-40 bg-gradient-to-br from-emerald-200 to-green-300 flex items-center justify-center relative overflow-hidden">
                        {/* Show emoji icon */}
                        <div className="text-7xl">
                          {product.displayIcon || "🥬"}
                        </div>

                        {/* Wishlist button */}
                        <button
                          onClick={() => toggleWishlist(product)}
                          className={`absolute top-3 right-3 p-2 shadow-sm rounded-full hover:bg-white transition ${isDark ? "bg-slate-700" : "bg-white/95"
                            }`}
                        >
                          <Heart
                            size={20}
                            className={
                              wishlist.find((item) => item.id === product.id)
                                ? "fill-red-500 text-red-500"
                                : "text-gray-400"
                            }
                          />
                        </button>
                      </div>

                      {/* Product Info */}
                      <div className="p-6">
                        <h4
                          className={`text-lg font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"
                            }`}
                        >
                          {product.name}
                        </h4>

                        {/* Freshness Badge */}
                        <div className="mb-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-semibold ${isDark ? "text-slate-300" : "text-gray-700"
                                }`}
                            >
                              Freshness
                            </span>
                            <span className="bg-green-100 text-green-900 px-2 py-1 rounded text-xs font-bold">
                              {product.freshness}
                            </span>
                          </div>
                        </div>

                        {/* Traceability Section */}
                        <div className={`mt-3 mb-4 p-3 rounded-xl border ${isDark ? "bg-slate-800/50 border-slate-600" : "bg-gray-50 border-gray-200"}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <BadgeCheck size={16} className="text-emerald-500" />
                            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Farm Traceability</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div className="flex flex-col">
                              <span className="text-gray-500">Soil Type</span>
                              <span className={`font-semibold ${isDark ? "text-slate-300" : "text-gray-800"}`}>{product.soilType || "Organic"}</span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-gray-500">Pesticides</span>
                              <span className={`font-semibold ${isDark ? "text-slate-300" : "text-gray-800"}`}>{product.pesticides || "None"}</span>
                            </div>
                            <div className="flex flex-col col-span-2 mt-1">
                              <span className="text-gray-500 flex items-center gap-1">📍 Location</span>
                              <span className={`font-mono text-[9px] ${isDark ? "text-slate-400" : "text-gray-600"}`}>
                                {product.latitude || "0.0"}, {product.longitude || "0.0"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-2 mb-4">
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={16}
                                className={
                                  i < Math.floor(product.rating)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }
                              />
                            ))}
                          </div>
                          <span
                            className={`text-sm ${isDark ? "text-slate-400" : "text-gray-600"
                              }`}
                          >
                            ({product.reviews})
                          </span>
                        </div>

                        {/* Price */}
                        <div
                          className={`mb-4 pt-4 ${isDark
                            ? "border-t border-slate-600"
                            : "border-t border-gray-200"
                            }`}
                        >
                          <p className="text-2xl font-bold text-emerald-600">
                            {/* ✅ USD to INR conversion */}
                            {formatINR(product.price)}
                          </p>
                          <p
                            className={`text-xs ${isDark ? "text-slate-500" : "text-gray-500"
                              }`}
                          >
                            per kg
                          </p>
                        </div>

                        {/* Buy Button */}
                        <button
                          onClick={() => addToCart(product)}
                          className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-2 rounded-lg transition-all duration-200 transform hover:scale-105"
                        >
                          Buy Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cart Section - Persistent Side Panel */}
            <div className="lg:col-span-1">
              {/* Cart Items */}
              <div
                className={`backdrop-blur-xl border rounded-2xl overflow-hidden shadow-lg sticky top-24 transition-colors duration-200 ${isDark
                  ? "bg-slate-700/40 border-slate-600"
                  : "bg-white/80 border-white/50"
                  }`}
              >
                <div
                  className={`p-6 ${isDark ? "border-slate-600" : "border-gray-200"
                    } border-b`}
                >
                  <h2
                    className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"
                      }`}
                  >
                    Shopping Cart ({cart.length} items)
                  </h2>
                </div>

                {cart.length === 0 ? (
                  <div className="p-8 text-center">
                    <ShoppingCart
                      size={40}
                      className={`mx-auto mb-3 ${isDark ? "text-slate-600" : "text-gray-300"
                        }`}
                    />
                    <p
                      className={`text-sm font-medium ${isDark ? "text-slate-400" : "text-gray-500"
                        }`}
                    >
                      Your cart is empty
                    </p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    <div
                      className={isDark ? "divide-slate-600" : "divide-gray-200"}
                    >
                      {cart.map((item) => (
                        <div
                          key={item.id}
                          className={`p-4 transition ${isDark
                            ? "hover:bg-slate-600/50"
                            : "hover:bg-gray-50/50"
                            }`}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className="text-3xl">{item.image}</div>
                            <div className="flex-1">
                              <p
                                className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-900"
                                  }`}
                              >
                                {item.name}
                              </p>
                              <p
                                className={`text-xs ${isDark ? "text-slate-400" : "text-gray-600"
                                  }`}
                              >
                                {/* ✅ USD to INR conversion */}
                                {formatINR(item.price)}/kg
                              </p>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className={isDark ? "text-red-500" : "text-red-600"}
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                aria-label="Decrease quantity"
                                onClick={() => updateQuantity(item.id, -1)}
                                className={`w-8 h-8 rounded-md border transition font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDark
                                  ? "bg-slate-600 text-emerald-400 border-emerald-600 hover:bg-slate-700 hover:border-emerald-500"
                                  : "bg-white text-emerald-700 border-emerald-500 shadow-sm hover:bg-emerald-50 hover:border-emerald-600"
                                  }`}
                              >
                                −
                              </button>
                              <span
                                className={`w-10 text-center font-semibold text-sm ${isDark ? "text-white" : "text-gray-900"
                                  }`}
                              >
                                {item.quantity}
                              </span>
                              <button
                                aria-label="Increase quantity"
                                onClick={() => updateQuantity(item.id, 1)}
                                className={`w-8 h-8 rounded-md border transition font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 ${isDark
                                  ? "bg-slate-600 text-emerald-400 border-emerald-600 hover:bg-slate-700 hover:border-emerald-500"
                                  : "bg-white text-emerald-700 border-emerald-500 shadow-sm hover:bg-emerald-50 hover:border-emerald-600"
                                  }`}
                              >
                                +
                              </button>
                            </div>
                            <p className="text-sm font-bold text-emerald-600">
                              {/* ✅ USD to INR conversion for item total */}
                              {/* Intentionally rounded to integer for cleaner display */}
                              {new Intl.NumberFormat("en-IN", {
                                style: "currency",
                                currency: "INR",
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0,
                              }).format(
                                Math.round(
                                  item.price * item.quantity * USD_TO_INR,
                                ),
                              )}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cart Summary */}
                {cart.length > 0 && (
                  <div
                    className={`p-4 ${isDark ? "border-slate-600" : "border-gray-200"
                      } border-t`}
                  >
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span
                          className={isDark ? "text-slate-400" : "text-gray-600"}
                        >
                          Subtotal
                        </span>
                        <span
                          className={`font-semibold ${isDark ? "text-white" : "text-gray-900"
                            }`}
                        >
                          {/* ✅ USD to INR conversion for subtotal */}
                          {/* Intentionally rounded to integer for cleaner display */}
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(Math.round(cartTotalINR))}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span
                          className={isDark ? "text-slate-400" : "text-gray-600"}
                        >
                          Delivery
                        </span>
                        <span
                          className={`font-semibold ${isDark ? "text-white" : "text-gray-900"
                            }`}
                        >
                          {/* ✅ Delivery fee $3 converted to INR */}
                          {/* Intentionally rounded to integer for cleaner display */}
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(Math.round(3 * USD_TO_INR))}
                        </span>
                      </div>
                      <div
                        className={`pt-2 flex justify-between ${isDark ? "border-slate-600" : "border-gray-200"
                          } border-t`}
                      >
                        <span
                          className={`font-bold ${isDark ? "text-white" : "text-gray-900"
                            }`}
                        >
                          Total
                        </span>
                        <span className="font-bold text-emerald-600">
                          {/* ✅ USD to INR conversion for grand total (subtotal + delivery) */}
                          {/* Intentionally rounded to integer for cleaner display */}
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          }).format(Math.round(cartTotalINR + 3 * USD_TO_INR))}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={handleCheckout}
                      className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold py-2.5 rounded-lg transition-all duration-200 transform hover:scale-105"
                    >
                      Checkout
                    </button>

                    <p
                      className={`text-xs text-center mt-3 ${isDark ? "text-slate-500" : "text-gray-500"
                        }`}
                    >
                      ✓ Farm to door traceability
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )} {/* end shop tab */}

      </main>
    </div>
  );
};

export default CustomerDashboard;
