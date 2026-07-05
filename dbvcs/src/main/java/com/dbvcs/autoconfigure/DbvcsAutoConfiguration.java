package com.dbvcs.autoconfigure;

import com.dbvcs.core.DbvcsService;
import com.dbvcs.validation.EntityAnnotationValidator;
import com.dbvcs.validation.ValidationRuleRegistry;
import com.dbvcs.versioning.SchemaVersionStore;
import com.dbvcs.web.DbvcsApiController;
import com.dbvcs.web.DbvcsUiController;
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
    public SchemaVersionStore schemaVersionStore() {
        return new SchemaVersionStore(properties.getOutputDir());
    }

    @Bean
    @ConditionalOnMissingBean
    public DbvcsService dbvcsService(SchemaVersionStore store) {
        return new DbvcsService(store, properties.getBasePackages());
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
                registry.addResourceHandler("/dbvcs/", "/dbvcs/**")
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
        ClassLoader classLoader = applicationContext.getClassLoader();

        // Run annotation validation before schema scanning
        EntityAnnotationValidator validator = applicationContext.getBean(EntityAnnotationValidator.class);
        validator.validate(classLoader);

        DbvcsService svc = applicationContext.getBean(DbvcsService.class);
        svc.initialize(classLoader);
    }
}
