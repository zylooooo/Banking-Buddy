package com.BankingBuddy.user_service;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class UserServiceApplicationTests {

	@Test
	void contextLoads() {
		// Test that Spring context loads successfully with Testcontainers
		// This ensures database connections work without real RDS/Aurora
	}
}
