package com.dbvcs.web;

import com.dbvcs.core.DbvcsService;
import com.dbvcs.model.SchemaSnapshot;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST endpoints that back the dbvcs UI.
 *
 * <p>All paths are prefixed with {@code /dbvcs/api}.
 */
@RestController
@RequestMapping("/dbvcs/api")
public class DbvcsApiController {

    private final DbvcsService service;

    public DbvcsApiController(DbvcsService service) {
        this.service = service;
    }

    /** Returns a list of all saved version numbers. */
    @GetMapping("/versions")
    public ResponseEntity<Map<String, Object>> versions() {
        List<Integer> all = service.getStore().allVersions();
        int latest = all.isEmpty() ? 0 : all.get(all.size() - 1);
        return ResponseEntity.ok(Map.of("versions", all, "latest", latest));
    }

    /** Returns the schema snapshot for a specific version. */
    @GetMapping("/versions/{version}")
    public ResponseEntity<SchemaSnapshot> version(@PathVariable("version") int version) {
        SchemaSnapshot snapshot = service.getStore().load(version);
        if (snapshot == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(snapshot);
    }

    /** Returns the latest schema snapshot. */
    @GetMapping("/schema")
    public ResponseEntity<SchemaSnapshot> latestSchema() {
        SchemaSnapshot snap = service.getActiveSnapshot();
        if (snap == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(snap);
    }
}
