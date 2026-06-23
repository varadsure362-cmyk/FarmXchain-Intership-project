import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProductById, updateProduct } from "../api";
import { getAuthHeaders } from "../../utils/tokenUtils";
import "../../styles/editProduct.css";

function EditProductPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    cropType: "",
    soilType: "",
    pesticides: "",
    harvestDate: "",
    price: "",
    quantity: "",
    imageFile: null,
    imageUrl: "",
  });

  const [imagePreview, setImagePreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        // Using fetch directly or updating api.js
        const response = await fetch(`http://localhost:8080/api/products/${id}`, {
          headers: getAuthHeaders(),
        });
        
        if (!response.ok) throw new Error("Failed to fetch product");
        
        const data = await response.json();
        setForm({
          name: data.name || "",
          cropType: data.cropType || "",
          soilType: data.soilType || "",
          pesticides: data.pesticides || "",
          harvestDate: data.harvestDate || "",
          price: data.price || "",
          quantity: data.quantity || "",
          imageFile: null,
          imageUrl: data.imageUrl || "",
        });
        setImagePreview(data.imageUrl || "");
      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === "image" && files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
        setForm({ ...form, imageFile: file });
      };
      reader.readAsDataURL(file);
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("cropType", form.cropType);
      formData.append("soilType", form.soilType);
      formData.append("pesticides", form.pesticides);
      formData.append("harvestDate", form.harvestDate);
      formData.append("price", form.price);
      formData.append("quantity", form.quantity);
      
      if (form.imageFile) {
        formData.append("image", form.imageFile);
      }

      const response = await fetch(`http://localhost:8080/api/products/edit/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(), // Note: fetch with FormData should NOT have Content-Type: multipart/form-data manually set
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update product");
      }

      alert("Product updated successfully!");
      navigate("/farmer-dashboard");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="edit-product-page"><div className="form-container">Loading...</div></div>;
  if (error) return <div className="edit-product-page"><div className="form-container">Error: {error}</div></div>;

  return (
    <div className="edit-product-page">
      <div className="form-container">
        <div className="form-header">
          <h1>Edit Product</h1>
          <p>Update your crop details and image.</p>
        </div>

        <div className="form-card">
          <form onSubmit={handleSubmit} className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name" className="required">Product Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cropType" className="required">Crop Type</label>
                <input
                  type="text"
                  id="cropType"
                  name="cropType"
                  value={form.cropType}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="soilType" className="required">Soil Type</label>
                <input
                  type="text"
                  id="soilType"
                  name="soilType"
                  value={form.soilType}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pesticides" className="required">Pesticides</label>
                <input
                  type="text"
                  id="pesticides"
                  name="pesticides"
                  value={form.pesticides}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="harvestDate" className="required">Harvest Date</label>
                <input
                  type="date"
                  id="harvestDate"
                  name="harvestDate"
                  value={form.harvestDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="price" className="required">Price per kg (INR)</label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="quantity" className="required">Quantity (kg)</label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-section">
              <div className="form-group">
                <label htmlFor="image">Update Image</label>
                <label className="image-upload-area" htmlFor="image">
                  <div className="upload-icon">📷</div>
                  <h3>Click to change photo</h3>
                </label>
                <input
                  type="file"
                  id="image"
                  name="image"
                  accept="image/*"
                  onChange={handleChange}
                  className="file-input"
                />
                {imagePreview && (
                  <div className="image-preview">
                    <img className="preview-image" src={imagePreview} alt="Preview" />
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={() => navigate("/farmer-dashboard")}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default EditProductPage;
