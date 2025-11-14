package com.BankingBuddy.client_service.model.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Serializable wrapper for Spring Data Page to enable Redis caching.
 * Spring's PageImpl lacks a no-arg constructor required for Jackson deserialization.
 * 
 * This DTO solves two problems:
 * 1. PageImpl cannot be serialized/deserialized by Jackson (no no-arg constructor)
 * 2. PageImpl serialization is not guaranteed to be stable across Spring versions
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
     * Converts Spring Data Page to serializable PageDTO.
     * 
     * @param page Spring Data Page object
     * @return PageDTO with all pagination metadata
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

