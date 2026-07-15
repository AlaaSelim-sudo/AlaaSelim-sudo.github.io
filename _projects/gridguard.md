---
layout: page
title: GridGuard
description: Physics-informed LLM optimization for safer distribution-grid operation.
img: assets/img/gridguard.svg
importance: 4
category: work
related_publications: false
---

<div class="row justify-content-sm-center">
  <div class="col-sm-10 mt-3 mt-md-0">
    <img src="{{ '/assets/img/gridguard.svg' | relative_url }}" alt="GridGuard framework" class="img-fluid rounded z-depth-1">
  </div>
</div>
<div class="caption">
  GridGuard uses an LLM planning layer but checks candidate actions using power-system constraints before execution.
</div>


GridGuard explores how large language models can support distribution-grid operation when combined with physics-based screening and optimization. The goal is not to let an LLM directly control the grid, but to use it as a reasoning and planning layer whose actions are checked against power-system constraints.

The project studies restoration, voltage support, cyber-screening, and operator decision support using feeder simulation and constraint-aware validation.

**Keywords:** physics-informed LLMs, distribution systems, active distribution networks, safe optimization, operator decision support.

