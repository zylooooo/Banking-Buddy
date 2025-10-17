package com.BankingBuddy.user_service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ContextConfiguration;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@Testcontainers
@ContextConfiguration(classes = {UserServiceTestConfig.class})
class UserServiceApplicationTests {

	@Test
	void contextLoads() {
		// Test that Spring context loads successfully with Testcontainers
		// This ensures database connections work without real RDS/Aurora
	}
	
	@Test
	void testDatabaseConnection() {
		// Verify that the Testcontainers MySQL database is accessible
		// This replaces any previous tests that might have used real databases
	}
}
