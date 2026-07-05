package com.spring.mockspring.entity;

import com.dbvcs.annotation.*;
import com.dbvcs.annotation.enums.*;
import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "categories")
@Comment("Organises products into a self-referencing hierarchy of categories and sub-categories.")
@Domain(name = DomainType.INVENTORY, description = "Product domain")
@Criticality(level = CriticalityLevel.MEDIUM, description = "Drives navigation UX; errors cause misclassification but not transaction failures")
@TableType(type = TableTypeValue.MASTER, description = "Reference taxonomy master data")
@DataClassification(level = DataClassificationLevel.PUBLIC, description = "Category names and descriptions are publicly displayed")
@AccessLevel(level = AccessLevelValue.PUBLIC)
@DataRetention(type = RetentionType.INDEFINITE, description = "Categories retained as long as products reference them")
@UpdateStrategy(value = UpdateType.UPSERT)
@RefreshFrequency(value = Frequency.WEEKLY)
@ApiExposed
@PublicApi
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Comment("Unique display name of the category as shown in the storefront navigation.")
    @Searchable
    @IndexedFor(purpose = "Category name lookup for storefront navigation and admin search")
    @Column(nullable = false, unique = true, length = 80)
    private String name;

    @Comment("Optional long-form description shown on the category landing page.")
    @Column(length = 255)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_id")
    private Category parent;

    @OneToMany(mappedBy = "parent", fetch = FetchType.LAZY)
    private List<Category> children;

    @ManyToMany(mappedBy = "categories")
    private List<Product> products;

    public Category() {}

    public Long getId() { return id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Category getParent() { return parent; }
    public void setParent(Category parent) { this.parent = parent; }
    public List<Category> getChildren() { return children; }
    public List<Product> getProducts() { return products; }
}
