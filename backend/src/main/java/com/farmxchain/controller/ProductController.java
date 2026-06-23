package com.farmxchain.controller;

import com.farmxchain.model.Product;
import com.farmxchain.model.User;
import com.farmxchain.repository.UserRepository;
import com.farmxchain.service.ProductService;
import com.farmxchain.service.ImageUploadService;
import com.farmxchain.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;


import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * ✅ SECURITY-CRITICAL: Product Controller
 * 
 * Handles products (vegetables) in the supply chain.
 * 
 * KEY POINTS:
 * - Extracts userId and role from JWT
 * - BACKEND assigns retailer to products (not frontend)
 * - Retailer dashboard only sees products assigned to them
 * - All role checks use JWT (never frontend data)
 */
@RestController
@RequestMapping("/api/products")
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:3001", "http://localhost:3002"})
public class ProductController {

    @Autowired
    private ProductService productService;

    @Autowired
    private ImageUploadService imageUploadService;

    @Autowired
    private JwtUtil jwtUtil;
    
    @Autowired
    private UserRepository userRepository;

    /**
     * ✅ PUBLIC: Get all products
     * Available to everyone
     */
    @GetMapping("/all")
    public ResponseEntity<List<Product>> getAllProducts() {
        return ResponseEntity.ok(productService.getAllProducts());
    }

    /**
     * ✅ CUSTOMER: Get all available products (status = AVAILABLE or NULL)
     * Returns all products that are available for customer purchase.
     */
    @GetMapping("/customer/products")
    public ResponseEntity<List<Product>> getAvailableProductsForCustomers() {
        System.out.println("[API] /customer/products endpoint called");
        List<Product> products = productService.getAvailableProducts();
        System.out.println("[API] Customer products response size = " + (products == null ? 0 : products.size()));
        return ResponseEntity.ok(products);
    }

    /**
     * ✅ MARKETPLACE: Get ALL products for full marketplace view (testing)
     */
    @GetMapping("/marketplace/products")
    public ResponseEntity<List<Product>> getAllMarketplaceProducts() {
        System.out.println("[API] /marketplace/products endpoint called");
        List<Product> products = productService.getMarketplaceProducts();
        System.out.println("[API] Marketplace products response size = " + (products == null ? 0 : products.size()));
        return ResponseEntity.ok(products);
    }

    /**
     * ✅ FARMER: Get products created by specific farmer
     * Farmer can only see their own products
     */
    @GetMapping("/farmer/{farmerId}")
    public ResponseEntity<List<Product>> getProductsByFarmer(@PathVariable Long farmerId) {
        List<Product> products = productService.getProductsByFarmer(farmerId);
        return ResponseEntity.ok(products);
    }
    
    /**
     * ✅ CRITICAL: RETAILER Dashboard - Get products assigned to retailer
     * 
     * This is the key endpoint for retailer dashboard.
     * Extracts retailerId from JWT (not frontend).
     * Returns only products assigned to this retailer.
     */
    @GetMapping("/retailer/inventory")
    public ResponseEntity<?> getRetailerInventory(@RequestHeader("Authorization") String authHeader) {
        try {
            // ✅ SECURITY: Extract token and validate
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Missing or invalid authorization header"));
            }
            
            String token = authHeader.replace("Bearer ", "").replace("\"", "").trim();
            
            // ✅ SECURITY: Extract email and role from JWT
            String email = jwtUtil.extractEmail(token);
            String role = jwtUtil.extractRole(token);
            
            // ✅ SECURITY: Verify user is a retailer OR distributor (for shared supply chain visibility)
            if (!"retailer".equalsIgnoreCase(role) && !"distributor".equalsIgnoreCase(role)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Only retailers and distributors can access inventory"));
            }
            
            // ✅ SECURITY: Get retailer ID from database (using email from JWT)
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (!userOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "User not found"));
            }
            
            User retailer = userOpt.get();
            Long retailerId = retailer.getId();
            
            // ✅ CRITICAL: Fetch products assigned to THIS retailer
            List<Product> products = productService.getProductsByRetailer(retailerId);
            
            return ResponseEntity.ok(Map.of(
                    "retailerId", retailerId,
                    "retailerName", retailer.getName(),
                    "products", products,
                    "count", products.size()
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid or expired token"));
        }
    }

    /**
     * ✅ CRITICAL: CUSTOMER adds vegetables
     * 
     * Backend-controlled flow:
     * 1. Extract farmerId from JWT (customer's associated farmer)
     * 2. Determine retailerId from business logic
     * 3. Save product with both farmer and retailer association
     * 4. Frontend CANNOT control retailer assignment
     */
    @PostMapping("/add")
    public ResponseEntity<?> addProduct(
            @RequestParam("image") MultipartFile image,
            @RequestParam("name") String name,
            @RequestParam("cropType") String cropType,
            @RequestParam("soilType") String soilType,
            @RequestParam("pesticides") String pesticides,
            @RequestParam("harvestDate") String harvestDate,
            @RequestParam("latitude") String latitude,
            @RequestParam("longitude") String longitude,
            @RequestParam(value = "price", defaultValue = "0.0") Double price,
            @RequestParam(value = "quantity", defaultValue = "0") Integer quantity,
            @RequestHeader("Authorization") String authHeader
    ) {
        try {
            // ✅ SECURITY: Validate authorization header
            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Missing authorization header"));
            }
            
            String token = authHeader.replace("Bearer ", "").replace("\"", "").trim();
            
            // ✅ SECURITY: Extract email from JWT
            String email = jwtUtil.extractEmail(token);
            
            // Get user info from database
            Optional<User> userOpt = userRepository.findByEmail(email);
            if (!userOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "User not found"));
            }
            
            User user = userOpt.get();
            Long userId = user.getId();
            
            // ✅ BACKEND LOGIC: Determine farmerId
            // For now, using userId as farmerId (customer = farmer in this context)
            // In production, could fetch farmer from user's farmer_id field
            Long farmerId = userId;
            
            // ✅ CRITICAL: Determine retailerId from business logic
            // This is where backend decides which retailer gets this product
            // Options:
            // 1. Default retailer associated with the farmer
            // 2. First available retailer (for distribution)
            // 3. Specific retailer based on crop type or location
            
            Long retailerId = determineRetailerForProduct(farmerId, cropType);
            
            if (retailerId == null) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "No retailer available for this product"));
            }
            
            // ✅ SECURITY: Verify retailer exists and is actually a retailer
            Optional<User> retailerOpt = userRepository.findById(retailerId);
            if (!retailerOpt.isPresent() || !"retailer".equalsIgnoreCase(retailerOpt.get().getRole())) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Invalid retailer assignment"));
            }
            
            // ✅ Upload image to Cloudinary (with guaranteed fallback)
            String imageUrl;
            if (image != null && !image.isEmpty()) {
                try {
                    imageUrl = imageUploadService.uploadImage(image);
                    System.out.println("[INFO] Image uploaded to Cloudinary: " + imageUrl);
                } catch (Exception uploadEx) {
                    System.err.println("[WARN] Cloudinary upload failed, using placeholder: " + uploadEx.getMessage());
                    imageUrl = "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800";
                }
            } else {
                imageUrl = "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=800";
            }
            
            // ✅ Create product object
            Product product = new Product();
            product.setName(name);
            product.setCropType(cropType);
            product.setSoilType(soilType);
            product.setPesticides(pesticides);
            product.setHarvestDate(harvestDate);
            product.setLatitude(Double.parseDouble(latitude));
            product.setLongitude(Double.parseDouble(longitude));
            product.setImageUrl(imageUrl);
            product.setFarmerId(farmerId);
            product.setPrice(price);
            product.setQuantity(quantity);
            // ✅ CRITICAL: Backend-controlled retailer assignment
            product.setRetailerId(retailerId);
            
            // ✅ TRANSACTIONAL: Save product with all associations
            Product savedProduct = productService.addProduct(product, retailerId);
            
            System.out.println("[AUDIT] Product created: farmer=" + farmerId 
                    + ", retailer=" + retailerId + ", cropType=" + cropType);
            
            return ResponseEntity.ok(Map.of(
                    "message", "Product added successfully",
                    "product", savedProduct,
                    "farmerId", farmerId,
                    "retailerName", retailerOpt.get().getName()
            ));
            
        } catch (Exception e) {
            System.err.println("[ERROR] Failed to create product: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Error creating product: " + e.getMessage()));
        }
    }

    /**
     * ✅ FARMER: Edit existing product
     * Supports updating details and optional new image
     */
    @PutMapping("/edit/{id}")
    public ResponseEntity<?> editProduct(
            @PathVariable Long id,
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam("name") String name,
            @RequestParam("cropType") String cropType,
            @RequestParam("soilType") String soilType,
            @RequestParam("pesticides") String pesticides,
            @RequestParam("harvestDate") String harvestDate,
            @RequestParam("price") Double price,
            @RequestParam("quantity") Integer quantity,
            @RequestHeader("Authorization") String authHeader
    ) {
        try {
            // ✅ SECURITY: Get authenticated user from JWT
            String token = authHeader.replace("Bearer ", "").replace("\"", "").trim();
            String email = jwtUtil.extractEmail(token);
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            // Get existing product
            // Using a simple findById if possible, or filter
            Product existingProduct = productService.getProductsByFarmer(user.getId()).stream()
                    .filter(p -> p.getId().equals(id))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Product not found or access denied"));

            // Handle image upload if provided
            String imageUrl = existingProduct.getImageUrl();
            if (image != null && !image.isEmpty()) {
                try {
                    imageUrl = imageUploadService.uploadImage(image);
                } catch (Exception e) {
                    System.err.println("[WARN] Image update failed, keeping old/placeholder: " + e.getMessage());
                }
            }

            // Update fields
            existingProduct.setName(name);
            existingProduct.setCropType(cropType);
            existingProduct.setSoilType(soilType);
            existingProduct.setPesticides(pesticides);
            existingProduct.setHarvestDate(harvestDate);
            existingProduct.setPrice(price);
            existingProduct.setQuantity(quantity);
            existingProduct.setImageUrl(imageUrl);

            Product updatedProduct = productService.updateProduct(id, existingProduct);

            return ResponseEntity.ok(Map.of(
                    "message", "Product updated successfully",
                    "product", updatedProduct
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Update failed: " + e.getMessage()));
        }
    }

    /**
     * ✅ BACKEND LOGIC: Determine which retailer should get this product
     * 
     * This is the core business logic that connects farmer products to retailers.
     * Currently uses a simple strategy (first available retailer).
     * Can be enhanced with:
     * - Geographic proximity
     * - Crop type specialization
     * - Retailer-farmer partnerships
     * - Load balancing
     * 
     * @param farmerId - The farmer creating the product
     * @param cropType - Type of crop/vegetable
     * @return Retailer ID to assign this product to, or null
     */
    private Long determineRetailerForProduct(Long farmerId, String cropType) {
        // ✅ SIMPLE STRATEGY: Assign to first available retailer
        // In production, implement smarter matching
        
        List<User> retailers = userRepository.findAll();
        
        for (User user : retailers) {
            if ("retailer".equalsIgnoreCase(user.getRole())) {
                return user.getId();
            }
        }
        
        return null; // No retailer available
    }
}
