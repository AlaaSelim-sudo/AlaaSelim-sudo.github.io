---
layout: page
permalink: /repositories/
title: Software
nav: true
nav_order: 6
---

# Software and Code

Selected GitHub repositories related to power-system resilience, cyber-physical security, reinforcement learning, grid-forming resources, and distribution-system simulation.

{% if site.data.repositories.github_repos %}

<div class="repositories d-flex flex-wrap flex-md-row flex-column justify-content-between align-items-center">
  {% for repo in site.data.repositories.github_repos %}
    {% include repository/repo.liquid repository=repo %}
  {% endfor %}
</div>

{% endif %}
