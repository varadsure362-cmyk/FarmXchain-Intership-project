import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getAuthHeaders } from "../utils/tokenUtils";
import "../styles/ProductDetail.css";

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8080/api/products/${id}`, {
          headers: getAuthHeaders(),
        });
        
        if (!response.ok) throw new Error("Product not found");
        
        const data = await response.json();
        setProduct(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  if (loading) return <div className="product-detail">Loading...</div>;
  if (error) return <div className="product-detail-error">❌ {error}</div>;
  if (!product) return <div className="product-detail-error">❌ Product not found</div>;

  return (
    <div className="product-detail">
      <div className="product-detail-card">
        {/* Title */}
        <h1>{product.name || product.cropType}</h1>
        <p className="crop-subtitle">{product.name ? product.cropType : ""}</p>

        {/* Image */}
        <div className="product-image">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.cropType} />
          ) : (
            <div className="no-image">No Image Available</div>
          )}
        </div>

        {/* Info Section */}
        <div className="product-info">
          <div className="info-row">
            <span className="label">Price</span>
            <span className="value price-value">₹{Math.round(product.price)} / kg</span>
          </div>
          <div className="info-row">
            <span className="label">Available Quantity</span>
            <span className="value">{product.quantity} kg</span>
          </div>
          <div className="info-row">
            <span className="label">Soil Type</span>
            <span className="value">{product.soilType}</span>
          </div>
          <div className="info-row">
            <span className="label">Pesticides</span>
            <span className="value">{product.pesticides}</span>
          </div>
          <div className="info-row">
            <span className="label">Harvest Date</span>
            <span className="value">{product.harvestDate}</span>
          </div>
          <div className="info-row">
            <span className="label">Location</span>
            <span className="value">
              {product.latitude}, {product.longitude}
              <a
                href={`https://www.google.com/maps?q=${product.latitude},${product.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="map-link"
              >
                🌍 View on Map
              </a>
            </span>
          </div>
        </div>

        {/* Verification Badge */}
        <div className="verification-badge">
          ✅ Verified Product - Trusted Source
        </div>
        
        <button className="back-btn" onClick={() => navigate(-1)}>
          ⬅️ Back
        </button>
      </div>
    </div>
  );
}

export default ProductDetail;
