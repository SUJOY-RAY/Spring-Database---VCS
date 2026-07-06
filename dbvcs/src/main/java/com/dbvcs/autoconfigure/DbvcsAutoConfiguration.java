package com.dbvcs.autoconfigure;

import com.dbvcs.core.DbvcsService;
import com.dbvcs.validation.EntityAnnotationValidator;
import com.dbvcs.validation.ValidationRuleRegistry;
import com.dbvcs.versioning.InMemorySchemaVersionStore;
import com.dbvcs.versioning.SchemaVersionStore;
import com.dbvcs.web.DbvcsApiController;
import com.dbvcs.web.DbvcsUiController;
import org.springframework.beans.factory.NoSuchBeanDefinitionException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.event.ContextRefreshedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Spring Boot auto-configuration for dbvcs.
 *
 * <p>Activated automatically via {@code META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports}.
 *
 * <h3>Configuration Options</h3>
 * <p>Configure DBVCS via properties in application.properties or application.yml:
 * <pre>{@code
 * dbvcs.enabled=true
 * dbvcs.validation.fail-on-violation=true
 * dbvcs.scanning.packages=com.example.entity,com.example.model
 * dbvcs.api.enabled=true
 * dbvcs.ui.enabled=true
 * }</pre>
 *
 * <p>Or define a {@link ValidationRuleRegistry} bean for compile-time safe config:
 * <pre>{@code
 * @Bean
 * public ValidationRuleRegistry dbvcsValidationRules() {
 *     return ValidationRuleRegistry.create()
 *         .failOnViolation()
 *         .forAll(EntityDescription.class);
 * }
 * }</pre>
 */
@AutoConfiguration
@ConditionalOnProperty(prefix = "dbvcs", name = "enabled", havingValue = "true", matchIfMissing = true)
@EnableConfigurationProperties(DbvcsProperties.class)
@ConditionalOnWebApplication
public class DbvcsAutoConfiguration {

    private final DbvcsProperties properties;
    private final ApplicationContext applicationContext;
    private final AtomicBoolean initialized = new AtomicBoolean(false);

    public DbvcsAutoConfiguration(DbvcsProperties properties, ApplicationContext applicationContext) {
        this.properties = properties;
        this.applicationContext = applicationContext;
    }

    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = "dbvcs.versioning", name = "enabled", havingValue = "true")
    public SchemaVersionStore schemaVersionStore() {
        return new SchemaVersionStore(properties.getVersioning().getStorageDir());
    }

    @Bean
    @ConditionalOnMissingBean
    public SchemaVersionStore schemaVersionStoreDefault() {
        // Use in-memory store when versioning is disabled
        return new InMemorySchemaVersionStore();
    }

    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = "dbvcs.scanning", name = "enabled", havingValue = "true", matchIfMissing = true)
    public DbvcsService dbvcsService(SchemaVersionStore store) {
        String packages = properties.getScanning().getPackages();
        return new DbvcsService(store, packages);
    }

    @Bean
    @ConditionalOnMissingBean
    public DbvcsApiController dbvcsApiController(DbvcsService service) {
        return new DbvcsApiController(service);
    }

    @Bean
    @ConditionalOnMissingBean
    public DbvcsUiController dbvcsUiController() {
        return new DbvcsUiController();
    }

    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = "dbvcs.validation", name = "enabled", havingValue = "true", matchIfMissing = true)
    public EntityAnnotationValidator entityAnnotationValidator(
            @Autowired(required = false) ValidationRuleRegistry registry) {
        EntityAnnotationValidator validator = new EntityAnnotationValidator(properties);
        if (registry != null) {
            validator.setRegistry(registry);
        }
        return validator;
    }

    /**
     * Register the static UI resources from the jar's {@code /static/dbvcs/} classpath location.
     */
    @Bean
    public WebMvcConfigurer dbvcsResourceHandler() {
        return new WebMvcConfigurer() {
            @Override
            public void addResourceHandlers(ResourceHandlerRegistry registry) {
                String uiPath = properties.getUi().getPath();
                registry.addResourceHandler(uiPath + "/", uiPath + "/**")
                        .addResourceLocations("classpath:/static/dbvcs/");
            }
        };
    }

    /**
     * Trigger the schema scan after the application context is fully refreshed,
     * so all entity classes are loaded and available.
     * Guard against double-fire (root context + web context both emit this event).
     */
    @EventListener(ContextRefreshedEvent.class)
    public void onContextRefreshed() {
        if (!initialized.compareAndSet(false, true)) return;
        
        if (!properties.isEnabled()) return;
        
        ClassLoader classLoader = applicationContext.getClassLoader();

        // Run annotation validation before schema scanning
        if (properties.getValidation().isEnabled()) {
            try {
                EntityAnnotationValidator validator = applicationContext.getBean(EntityAnnotationValidator.class);
                validator.validate(classLoader);
            } catch (NoSuchBeanDefinitionException ignored) {
                // Validation bean not available
            }
        }

        // Scan schema
        if (properties.getScanning().isEnabled()) {
            try {
                DbvcsService svc = applicationContext.getBean(DbvcsService.class);
                svc.initialize(classLoader);
            } catch (NoSuchBeanDefinitionException ignored) {
                // Service bean not available
            }
        }
    }
}
