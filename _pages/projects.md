---
layout: page
title: Projects
permalink: /projects/
description: Selected research and software projects.
nav: true
nav_order: 3
display_categories: [work]
horizontal: true
---

# Projects

These projects represent my current research direction in resilient energy systems, AI-assisted grid operation, cyber-physical security, data-center grid integration, and critical-facility energy resilience.

<div class="projects">
{% assign sorted_projects = site.projects | sort: "importance" %}
<div class="container">
  <div class="row row-cols-1 row-cols-md-2">
  {% for project in sorted_projects %}
    {% include projects_horizontal.liquid %}
  {% endfor %}
  </div>
</div>
</div>
