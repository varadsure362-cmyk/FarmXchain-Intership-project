import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { addProduct as addProductApi } from "../api";
import "../../styles/addProduct.css";

function AddProductPage() {
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
  });

  const [imagePreview, setImagePreview] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = "Product name is required";
    if (!form.cropType.trim()) newErrors.cropType = "Crop type is required";
    if (!form.soilType.trim()) newErrors.soilType = "Soil type is required";
    if (!form.pesticides.trim())
      newErrors.pesticides = "Pesticides info required";
    if (!form.harvestDate) newErrors.harvestDate = "Harvest date is required";
    if (!form.price || isNaN(form.price) || parseFloat(form.price) <= 0)
      newErrors.price = "Valid price is required";
    if (!form.quantity || isNaN(form.quantity) || parseInt(form.quantity) <= 0)
      newErrors.quantity = "Valid quantity is required";
    if (!form.imageFile) newErrors.imageFile = "Product image is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));

    if (name === "image" && files && files.length > 0) {
      const file = files[0];
      setForm((prev) => ({ ...prev, imageFile: file }));
      
      const reader = new FileReader();
      reader.onload = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // Mock coordinates if not available
      const lat = (Math.random() * 180 - 90).toFixed(6);
      const lng = (Math.random() * 360 - 180).toFixed(6);

      const formData = new FormData();
      formData.append("image", form.imageFile);
      formData.append("name", form.name);
      formData.append("cropType", form.cropType);
      formData.append("soilType", form.soilType);
      formData.append("pesticides", form.pesticides);
      formData.append("harvestDate", form.harvestDate);
      formData.append("price", form.price);
      formData.append("quantity", form.quantity);
      formData.append("latitude", lat);
      formData.append("longitude", lng);

      await addProductApi(formData);
      
      alert("Product added successfully!");
      navigate("/farmer-dashboard");
    } catch (error) {
      console.error("Failed to save product:", error);
      alert("Error: " + error.message);
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    navigate("/farmer-dashboard");
  };

  return (
    <div className="add-product-page">
      <div className="form-container">
        <div className="form-header">
          <h1>Add New Product</h1>
          <p>Capture crop details for full traceability.</p>
        </div>

        <div className="form-card">
          <form onSubmit={handleSubmit} className="form-section">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name" className="required">
                  Product Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  className={errors.name ? "error" : ""}
                  placeholder="e.g., Premium Golden Rice"
                />
                {errors.name && (
                  <span className="error-text">{errors.name}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="cropType" className="required">
                  Crop Type
                </label>
                <input
                  type="text"
                  id="cropType"
                  name="cropType"
                  value={form.cropType}
                  onChange={handleChange}
                  className={errors.cropType ? "error" : ""}
                  placeholder="e.g., Organic Rice, Wheat, Corn"
                />
                {errors.cropType && (
                  <span className="error-text">{errors.cropType}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="soilType" className="required">
                  Soil Type
                </label>
                <input
                  type="text"
                  id="soilType"
                  name="soilType"
                  value={form.soilType}
                  onChange={handleChange}
                  className={errors.soilType ? "error" : ""}
                  placeholder="e.g., Black Soil, Loamy Soil"
                />
                {errors.soilType && (
                  <span className="error-text">{errors.soilType}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pesticides" className="required">
                  Pesticides Used
                </label>
                <input
                  type="text"
                  id="pesticides"
                  name="pesticides"
                  value={form.pesticides}
                  onChange={handleChange}
                  className={errors.pesticides ? "error" : ""}
                  placeholder="e.g., Neem Oil, Pyrethroids"
                />
                {errors.pesticides && (
                  <span className="error-text">{errors.pesticides}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="harvestDate" className="required">
                  Harvest Date
                </label>
                <input
                  type="date"
                  id="harvestDate"
                  name="harvestDate"
                  value={form.harvestDate}
                  onChange={handleChange}
                  className={errors.harvestDate ? "error" : ""}
                />
                {errors.harvestDate && (
                  <span className="error-text">{errors.harvestDate}</span>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="price" className="required">
                  Price per kg (INR)
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  step="0.01"
                  value={form.price}
                  onChange={handleChange}
                  className={errors.price ? "error" : ""}
                  placeholder="e.g., 50"
                />
                {errors.price && (
                  <span className="error-text">{errors.price}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="quantity" className="required">
                  Quantity (kg)
                </label>
                <input
                  type="number"
                  id="quantity"
                  name="quantity"
                  value={form.quantity}
                  onChange={handleChange}
                  className={errors.quantity ? "error" : ""}
                  placeholder="e.g., 500"
                />
                {errors.quantity && (
                  <span className="error-text">{errors.quantity}</span>
                )}
              </div>
            </div>

            <div className="form-section">
              <div className="form-group">
                <label htmlFor="image" className="required">Upload Image</label>
                <label className={`image-upload-area ${errors.imageFile ? "error" : ""}`} htmlFor="image">
                  <div className="upload-icon">📷</div>
                  <h3>{form.imageFile ? form.imageFile.name : "Click to upload"}</h3>
                  <p>
                    High-quality field photo helps buyers trust the product.
                  </p>
                </label>
                <input
                  type="file"
                  id="image"
                  name="image"
                  accept="image/*"
                  onChange={handleChange}
                  className="file-input"
                />
                {errors.imageFile && (
                  <span className="error-text">{errors.imageFile}</span>
                )}
                {imagePreview && (
                  <div className="image-preview">
                    <img
                      className="preview-image"
                      src={imagePreview}
                      alt="Preview"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn-submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Saving..." : "Save Product"}
              </button>
              <button
                type="button"
                className="btn-cancel"
                onClick={handleBack}
                disabled={isSubmitting}
              >
                Back
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AddProductPage;
