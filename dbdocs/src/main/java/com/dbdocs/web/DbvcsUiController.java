package com.dbdocs.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Serves the dbdocs UI index page for the root and trailing-slash paths.
 */
@Controller
public class DbvcsUiController {

    @GetMapping({"/dbdocs", "/dbdocs/"})
    public String index() {
        return "redirect:/dbdocs/index.html";
    }
}
