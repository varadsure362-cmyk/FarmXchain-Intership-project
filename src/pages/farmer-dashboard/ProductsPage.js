import { useNavigate } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import { useState, useEffect } from "react";
import { getFarmerProducts, deleteProduct } from "../api";
import { getAuthenticatedUser } from "../../utils/tokenUtils";
import "../../styles/products.css";

function ProductsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ✅ Fetch products from backend
  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = getAuthenticatedUser();
      if (!user?.id) throw new Error("User not authenticated");
      
      const data = await getFarmerProducts(user.id);
      setProducts(data);
      setFilteredProducts(data);
    } catch (err) {
      console.error("Failed to fetch products:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // ✅ Dynamic Base URL for QR Code
  const getBaseUrl = () => {
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      return "http://localhost:3000";
    }
    return "https://farmchainx.netlify.app";
  };

  // ✅ Delete product
  const handleDeleteProduct = async (productId) => {
    if (window.confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct(productId);
        alert("Product deleted successfully!");
        fetchProducts(); // Refresh list
      } catch (err) {
        alert("Failed to delete product: " + err.message);
      }
    }
  };

  // ✅ Download QR Code
  const downloadQRCode = (id, name) => {
    try {
      const canvas = document.getElementById(`qrcode-${id}`);
      if (!canvas) throw new Error("QR canvas not found");

      const pngUrl = canvas.toDataURL("image/png");
      const safeName = (name || "product")
        .toString()
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-");

      const link = document.createElement("a");
      link.href = pngUrl;
      link.download = `${safeName}-qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download QR:", err);
    }
  };

  // ✅ Filter products locally
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(products);
    } else {
      const q = searchQuery.toLowerCase();
      setFilteredProducts(
        products.filter(
          (prod) =>
            (prod.name || "").toLowerCase().includes(q) ||
            (prod.cropType || "").toLowerCase().includes(q) ||
            (prod.soilType || "").toLowerCase().includes(q)
        )
      );
    }
  }, [searchQuery, products]);

  return (
    <div className="products-page">
      <div className="products-container">
        {/* 🔹 Header */}
        <div className="products-header">
          <h1>Farm Products</h1>
          <p>Manage your agricultural products and track their journey</p>
        </div>

        {/* 🔹 Actions Bar */}
        <div className="products-actions">
          <input
            type="text"
            placeholder="Search by crop or soil..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "8px",
              border: "1px solid #d1d5db",
              fontSize: "14px",
              flex: 1,
              maxWidth: "400px",
            }}
          />

          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              className="btn-add-product"
              onClick={() => navigate("/add-product")}
            >
              <span>➕</span> Add Product
            </button>
          </div>
        </div>

        {/* 🔹 Error State */}
        {error && (
          <div className="error-banner" style={{ color: "red", padding: "1rem", background: "#fee2e2", borderRadius: "8px", marginBottom: "1rem" }}>
            ⚠️ Error: {error}
          </div>
        )}

        {/* 🔹 Loading State */}
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "3rem",
              fontSize: "1.25rem",
            }}
          >
            ⏳ Loading products...
          </div>
        ) : filteredProducts.length === 0 ? (
          // 🔹 Empty State
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>No products found</h3>
            <p>Try adjusting your search or add a new product.</p>
            <button
              className="btn-add-product"
              onClick={() => navigate("/add-product")}
            >
              <span>➕</span> Add Your First Product
            </button>
          </div>
        ) : (
          // 🔹 Products Grid
          <div className="products-grid">
            {filteredProducts.map((prod, index) => (
              <div key={prod.id || index} className="product-card">
                {/* Product Image */}
                <img
                  src={
                    prod.imageUrl ||
                    "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDQwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTAwIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Q0E3QTciPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4="
                  }
                  alt={prod.cropType}
                  className="product-image"
                  onError={(e) => {
                    e.target.src =
                      "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDQwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjx0ZXh0IHg9IjIwMCIgeT0iMTAwIiBkb21pbmFudC1iYXNlbGluZT0ibWlkZGxlIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM5Q0E3QTciPk5vIEltYWdlPC90ZXh0Pgo8L3N2Zz4=";
                  }}
                />

                {/* Product Content */}
                <div className="product-content">
                  <h3 className="product-name">{prod.name || prod.cropType}</h3>
                  <p className="product-subtitle" style={{ fontSize: "12px", color: "#6b7280", marginBottom: "0.5rem" }}>
                    {prod.name ? prod.cropType : ""}
                  </p>

                  <div className="product-meta">
                    <div className="meta-item">
                      <strong>Price:</strong> ₹{prod.price ? Math.round(prod.price) : "N/A"} / kg
                    </div>
                    <div className="meta-item">
                      <strong>Quantity:</strong> {prod.quantity || 0} kg
                    </div>
                    <div className="meta-item">
                      <strong>Soil:</strong> {prod.soilType}
                    </div>
                    <div className="meta-item">
                      <strong>Harvest:</strong> {prod.harvestDate}
                    </div>
                  </div>

                  {/* QR Code */}
                  <div
                    style={{
                      textAlign: "center",
                      padding: "1rem 0",
                      borderTop: "1px solid #e5e7eb",
                      borderBottom: "1px solid #e5e7eb",
                      marginBottom: "1rem",
                    }}
                  >
                    <QRCodeCanvas
                      id={`qrcode-${prod.id}`}
                      value={`${getBaseUrl()}/product/${prod.id}`}
                      size={100}
                    />
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        marginTop: "0.5rem",
                      }}
                    >
                      ID: {prod.id}
                    </div>
                    <button
                      onClick={() => downloadQRCode(prod.id, prod.cropType)}
                      style={{
                        marginTop: "0.5rem",
                        padding: "0.375rem 0.75rem",
                        background: "#10b981",
                        color: "white",
                        fontSize: "12px",
                        fontWeight: 600,
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                      }}
                    >
                      ⬇️ Download QR
                    </button>
                  </div>

                  {/* Actions */}
                  <div className="product-actions">
                    <button
                      className="btn-edit"
                      onClick={() => navigate(`/edit-product/${prod.id}`)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => handleDeleteProduct(prod.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductsPage;
