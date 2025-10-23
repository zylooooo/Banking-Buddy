package com.BankingBuddy.transaction_service.utils;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.*;

@Target({ElementType.TYPE})
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = AtLeastOneFilterValidator.class)
@Documented
public @interface AtLeastOneFilter {
    String message() default "At least one filter must be provided (clientId, transaction, status, minAmount, maxAmount, startDate, or endDate)";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
