import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import {
  Package,
  Truck,
  TrendingUp,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import "../styles/DistributorDashboard.css";
import { getAuthHeaders, isTokenValid } from "../utils/tokenUtils";

const DistributorDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [activeTab, setActiveTab] = useState("orders");
  const { isDark } = useTheme();

  // ✅ Fetch distributor orders from backend
  useEffect(() => {
    const fetchDistributorOrders = async () => {
      try {
        if (!isTokenValid()) {
          setOrders([]);
          return;
        }

        const response = await fetch(
          "http://localhost:8080/api/orders/distributor",
          {
            headers: getAuthHeaders(),
          },
        );

        if (!response.ok) {
          setOrders([]);
          return;
        }

        const data = await response.json();
        setOrders(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch distributor orders:", error);
        alert("Failed to load distributor orders: " + error.message);
        setOrders([]);
      }
    };

    fetchDistributorOrders();
  }, []);

  // Load inventory from backend for the authenticated retailer/distributor
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        if (!isTokenValid()) {
          setInventory([]);
          return;
        }
        const resp = await fetch(
          "http://localhost:8080/api/products/retailer/inventory",
          {
            headers: getAuthHeaders(),
          },
        );
        if (!resp.ok) {
          setInventory([]);
          return;
        }
        const data = await resp.json();
        const products = Array.isArray(data?.products) ? data.products : [];
        // Map backend products to table-friendly shape without changing UI
        const mapped = products.map((p) => ({
          id: p.id,
          product: p.name || p.cropType || "Unknown",
          quantity: `${p.quantity ?? 0}kg`,
          // Backend doesn't provide location/expiryDate; use safe placeholders
          location: "Warehouse A",
          expiryDate: p.harvestDate || "-",
        }));
        setInventory(mapped);
      } catch (err) {
        setInventory([]);
      }
    };
    fetchInventory();
  }, []);

  // ✅ Update order status via backend API
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      if (!isTokenValid()) {
        alert("Please login to update order status");
        return;
      }

      let endpoint;
      if (newStatus === "Shipped") {
        endpoint = `http://localhost:8080/api/orders/${orderId}/ship`;
      } else if (newStatus === "DELIVERED") {
        endpoint = `http://localhost:8080/api/orders/${orderId}/deliver`;
      } else {
        // Processing or other states not handled by backend yet
        return;
      }

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        alert(
          `Failed to update order: ${errorData.message || "Unknown error"}`,
        );
        return;
      }

      // Refresh orders after successful update
      const ordersResponse = await fetch(
        "http://localhost:8080/api/orders/distributor",
        {
          headers: getAuthHeaders(),
        },
      );
      const data = await ordersResponse.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to update order status:", error);
      alert("Failed to update order status");
    }
  };

  const handleReceiveOrder = async (orderId) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    // Update inventory locally (backend doesn't track distributor inventory yet)
    order.items?.forEach((item) => {
      const existingItem = inventory.find(
        (inv) => inv.product === item.productName,
      );
      if (existingItem) {
        const currentQty = parseInt(existingItem.quantity);
        const newQty = currentQty - item.quantity;
        setInventory((prevInventory) =>
          prevInventory.map((inv) =>
            inv.product === item.productName
              ? { ...inv, quantity: `${newQty}kg` }
              : inv,
          ),
        );
      }
    });

    // Update order status via backend
    await updateOrderStatus(orderId, "DELIVERED");
  };

  const stats = [
    {
      label: "Total Orders",
      value: orders.length,
      icon: Package,
      color: "from-blue-500 to-cyan-600",
    },
    {
      label: "Ready to Ship",
      value: orders.filter((o) => o.status === "PACKED").length,
      icon: Clock,
      color: "from-yellow-500 to-amber-600",
    },
    {
      label: "Shipped",
      value: orders.filter((o) => o.status === "SHIPPED").length,
      icon: Truck,
      color: "from-purple-500 to-pink-600",
    },
    {
      label: "Delivered",
      value: orders.filter((o) => o.status === "DELIVERED").length,
      icon: CheckCircle,
      color: "from-green-500 to-emerald-600",
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "PACKED":    return "bg-orange-100 text-orange-800";
      case "SHIPPED":   return "bg-purple-100 text-purple-800";
      case "DELIVERED": return "bg-green-100 text-green-800";
      default:          return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "PACKED":    return <Package size={16} className="inline mr-1" />;
      case "SHIPPED":   return <Truck size={16} className="inline mr-1" />;
      case "DELIVERED": return <CheckCircle size={16} className="inline mr-1" />;
      default:          return <Clock size={16} className="inline mr-1" />;
    }
  };

  // USD->INR conversion rate for distributor totals (env override supported)
  const usdToInrRate = Number(process.env.REACT_APP_USD_TO_INR_RATE) || 82;

  return (
    <div className="distributor-dashboard">
      {/* Header */}
      <header className="distributor-header">
        <div className="distributor-header-container">
          <h1>Distributor Dashboard</h1>
          <p>Manage orders and inventory</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="distributor-main">
        {/* Stats Grid */}
        <div className="stats-grid">
          {stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div key={idx} className="stat-card">
                <div className="stat-header">
                  <p className="stat-label">{stat.label}</p>
                  <div className={`stat-icon bg-gradient-to-br ${stat.color}`}>
                    <Icon size={24} />
                  </div>
                </div>
                <p className="stat-value">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="dashboard-tabs">
          {[
            { id: "orders", label: "Orders", count: orders.length },
            { id: "inventory", label: "Inventory", count: inventory.length },
            { id: "analytics", label: "Analytics" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
            >
              {tab.label} {tab.count && `(${tab.count})`}
            </button>
          ))}
        </div>

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <div className="dashboard-table-container">
            <div className="overflow-x-auto">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Items</th>
                    <th>Total</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan="6">
                        <div className="empty-state">
                          <div className="empty-state-icon">
                            <AlertCircle size={40} />
                          </div>
                          <p className="empty-state-text">No orders yet</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id}>
                        <td className="table-id">#{order.id}</td>
                        <td className="table-muted">
                          {order.items?.map((item, idx) => (
                            <div key={idx}>
                              {item.productName || item.name} ×{item.quantity}
                            </div>
                          ))}
                        </td>
                        <td className="table-id">
                          ₹{Math.round(Number(order.totalAmount || order.total || 0))}
                        </td>
                        <td className="table-muted">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN") : "—"}
                        </td>
                        <td>
                          <span className={`status-badge ${getStatusColor(order.status)}`}>
                            {getStatusIcon(order.status)}
                            {order.status}
                          </span>
                        </td>
                        <td>
                          {/* Distributor sees PACKED orders → marks SHIPPED */}
                          {order.status === "PACKED" && (
                            <button
                              onClick={() => updateOrderStatus(order.id, "Shipped")}
                              className="action-btn btn-ship"
                            >
                              🚚 Ship
                            </button>
                          )}
                          {/* After SHIPPED → mark DELIVERED */}
                          {order.status === "SHIPPED" && (
                            <button
                              onClick={() => handleReceiveOrder(order.id)}
                              className="action-btn btn-fulfill"
                            >
                              ✅ Deliver
                            </button>
                          )}
                          {order.status === "DELIVERED" && (
                            <span className="text-xs text-green-600 font-medium">🎉 Done</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === "inventory" && (
          <div className="dashboard-table-container">
            <div className="overflow-x-auto">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Location</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => (
                    <tr key={item.id}>
                      <td className="table-id">{item.product}</td>
                      <td className="table-muted">{item.quantity}</td>
                      <td className="table-muted">{item.location}</td>
                      <td className="table-muted">{item.expiryDate}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            parseInt(item.quantity) > 30
                              ? "status-fulfilled"
                              : "status-pending"
                          }`}
                        >
                          {parseInt(item.quantity) > 30
                            ? "✓ Good Stock"
                            : "⚠ Low Stock"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === "analytics" && (
          <div className="analytics-grid">
            <div className="analytics-card">
              <div className="analytics-header">
                <div className="analytics-icon bg-gradient-to-br from-blue-500 to-cyan-600">
                  <Package size={24} />
                </div>
                <p className="analytics-label">Total Orders</p>
              </div>
              <p className="analytics-value">{orders.length}</p>
            </div>

            <div className="analytics-card">
              <div className="analytics-header">
                <div className="analytics-icon bg-gradient-to-br from-purple-500 to-pink-600">
                  <TrendingUp size={24} />
                </div>
                <p className="analytics-label">Inventory Value</p>
              </div>
              <p className="analytics-value">
                {(() => {
                  const inrTotal = inventory.reduce((sum, item) => {
                    const pricePerKg = item.product.includes("Tomatoes")
                      ? 50
                      : item.product.includes("Peppers")
                        ? 60
                        : 40;
                    return sum + parseInt(item.quantity) * pricePerKg;
                  }, 0);
                  const inrValue = Math.round(inrTotal);
                  return `₹${inrValue}`;
                })()}
              </p>
            </div>

            <div className="analytics-card">
              <div className="analytics-header">
                <div className="analytics-icon bg-gradient-to-br from-green-500 to-emerald-600">
                  <CheckCircle size={24} />
                </div>
                <p className="analytics-label">Completion Rate</p>
              </div>
              <p className="analytics-value">
                {orders.length > 0
                  ? Math.round(
                      (orders.filter((o) => o.status === "DELIVERED").length /
                        orders.length) *
                        100,
                    )
                  : 0}
                %
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DistributorDashboard;
