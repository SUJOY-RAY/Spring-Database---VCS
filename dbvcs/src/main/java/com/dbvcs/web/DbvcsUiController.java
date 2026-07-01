package com.dbvcs.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Serves the dbvcs UI index page for the root and trailing-slash paths.
 */
@Controller
public class DbvcsUiController {

    @GetMapping({"/dbvcs", "/dbvcs/"})
    public String index() {
        return "redirect:/dbvcs/index.html";
    }
}
