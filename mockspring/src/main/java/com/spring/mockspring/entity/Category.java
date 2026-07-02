package com.spring.mockspring.entity;

import com.dbvcs.annotation.*;
import com.dbvcs.annotation.enums.*;
import jakarta.persistence.*;
import java.util.List;

@Entity
@Table(name = "categories")
@DbvcsComment("Organises products into a self-referencing hierarchy of categories and sub-categories.")
@BusinessModule(name = ModuleType.PRODUCT, description = "Product taxonomy and categorisation")
@Domain(name = DomainType.INVENTORY, description = "Product domain")
@Purpose(value = "Defines the product category hierarchy", description = "Self-referencing tree used for storefront navigation and product classification")
@Criticality(level = CriticalityLevel.MEDIUM, description = "Drives navigation UX; errors cause misclassification but not transaction failures")
@TableType(type = TableTypeValue.MASTER, description = "Reference taxonomy master data")
@MasterData
@LookupTable
@ReferenceData("Product category taxonomy")
@BusinessOwner("Product Management Team")
@TechnicalOwner("Catalogue Engineering")
@DataClassification(level = DataClassificationLevel.PUBLIC, description = "Category names and descriptions are publicly displayed")
@AccessLevel(level = AccessLevelValue.PUBLIC)
@LawfulBasis(type = LawfulBasisType.LEGITIMATE_INTERESTS, description = "Core product taxonomy data")
@DataRetention(type = RetentionType.INDEFINITE, description = "Categories retained as long as products reference them")
@Lifecycle(value = LifecycleStage.ACTIVE)
@UpdateStrategy(value = UpdateType.UPSERT)
@RefreshFrequency(value = Frequency.WEEKLY)
@DataQualityLevel(level = QualityLevel.HIGH)
@DataQuality(rules = {"name must be unique", "circular parent references must not be allowed"})
@ApiExposed
@PublicApi
public class Category {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @DbvcsComment("Unique display name of the category as shown in the storefront navigation.")
    @BusinessKey
    @NaturalKey
    @Searchable
    @IndexedFor(purpose = "Category name lookup for storefront navigation and admin search")
    @Column(nullable = false, unique = true, length = 80)
    private String name;

    @DbvcsComment("Optional long-form description shown on the category landing page.")
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
