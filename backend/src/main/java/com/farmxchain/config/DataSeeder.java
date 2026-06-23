package com.farmxchain.config;

import com.farmxchain.model.Product;
import com.farmxchain.model.User;
import com.farmxchain.repository.ProductRepository;
import com.farmxchain.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * DataSeeder — Only runs startup maintenance tasks.
 * ❌ Fake product seeding is DISABLED.
 *    Customers should only see real products listed by registered farmers.
 * ✅ Still auto-assigns retailer_id to products that are missing it.
 */
@Component
public class DataSeeder implements CommandLineRunner {

    private final ProductRepository productRepository;
    private final UserRepository userRepository;

    public DataSeeder(ProductRepository productRepository, UserRepository userRepository) {
        this.productRepository = productRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        // ✅ Seed default retailer and distributor if none exist
        seedDefaultUsers();

        // ✅ Only do maintenance: auto-assign retailer to products missing retailer_id
        autoAssignRetailerToProducts();

        System.out.println("[SEEDER] Startup check complete. Products in DB: "
                + productRepository.count());
    }

    private void seedDefaultUsers() {
        if (findAnyRetailerId() == null) {
            User retailer = new User();
            retailer.setName("Default Retailer");
            retailer.setEmail("retailer@farmxchain.com");
            retailer.setPassword("retailer123"); // Note: In production, password should be hashed
            retailer.setRole("retailer");
            userRepository.save(retailer);
            System.out.println("[SEEDER] Seeded default retailer: " + retailer.getEmail());
        }

        if (userRepository.findAll().stream().noneMatch(u -> "distributor".equalsIgnoreCase(u.getRole()))) {
            User distributor = new User();
            distributor.setName("Default Distributor");
            distributor.setEmail("distributor@farmxchain.com");
            distributor.setPassword("distributor123");
            distributor.setRole("distributor");
            userRepository.save(distributor);
            System.out.println("[SEEDER] Seeded default distributor: " + distributor.getEmail());
        }
    }

    /**
     * ✅ Auto-assign the first available retailer to products missing retailer_id.
     * Solves: "Checkout failed: Product missing retailer ID"
     */
    private void autoAssignRetailerToProducts() {
        Long retailerId = findAnyRetailerId();
        if (retailerId == null) {
            System.out.println("[SEEDER] No retailer registered yet. Skipping auto-assign.");
            return;
        }

        List<Product> unassigned = productRepository.findAll()
                .stream()
                .filter(p -> p.getRetailerId() == null)
                .toList();

        if (!unassigned.isEmpty()) {
            unassigned.forEach(p -> p.setRetailerId(retailerId));
            productRepository.saveAll(unassigned);
            System.out.println("[SEEDER] Auto-assigned retailerId=" + retailerId
                    + " to " + unassigned.size() + " products missing retailer_id");
        }
    }

    private Long findAnyRetailerId() {
        return userRepository.findAll().stream()
                .filter(u -> "retailer".equalsIgnoreCase(u.getRole()))
                .map(User::getId)
                .findFirst()
                .orElse(null);
    }
}
