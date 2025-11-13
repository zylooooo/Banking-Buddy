package com.BankingBuddy.transaction_service.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Serializable wrapper for Spring Data Page to enable Redis caching
 * 
 * Spring's PageImpl cannot be deserialized by Jackson because it lacks
 * a no-argument constructor. This DTO solves that problem while preserving
 * all pagination metadata needed by the frontend.
 * 
 * Best Practice: Keep API responses simple and serializable for caching
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PageDTO<T> {
    private List<T> content;
    private int page;
    private int size;
    private long totalElements;
    private int totalPages;
    private boolean first;
    private boolean last;
    private boolean empty;
    
    /**
     * Factory method to create PageDTO from Spring Data Page
     * 
     * @param page Spring Data Page object
     * @return Serializable PageDTO
     */
    public static <T> PageDTO<T> from(Page<T> page) {
        return PageDTO.<T>builder()
                .content(page.getContent())
                .page(page.getNumber())
                .size(page.getSize())
                .totalElements(page.getTotalElements())
                .totalPages(page.getTotalPages())
                .first(page.isFirst())
                .last(page.isLast())
                .empty(page.isEmpty())
                .build();
    }
}

