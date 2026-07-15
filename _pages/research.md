---
layout: page
title: Research
permalink: /research/
nav: true
nav_order: 2
---

# Research

My research focuses on resilient energy systems at the intersection of power systems, AI, optimization, cyber-physical security, and critical infrastructure. A central goal is to move grid operation from reactive recovery toward anticipatory, verified, and operator-friendly decision support.

<div class="row justify-content-sm-center">
  <div class="col-sm-10 mt-3 mt-md-0">
    <img src="{{ '/assets/img/research_overview.svg' | relative_url }}" alt="Research overview" class="img-fluid rounded z-depth-1">
  </div>
</div>
<div class="caption">
  Research overview connecting power-system physics, AI and optimization, cyber-physical security, and critical infrastructure.
</div>

## Core themes

### Resilient energy systems

I develop methods for preparing, operating, and restoring power systems under extreme events, cyber-physical disturbances, and uncertainty. This includes distribution-system restoration, microgrid operation, dynamic recovery, and restoration-compatible coordination of large flexible loads.

### AI and optimization for power systems

I work on safe reinforcement learning, model predictive control, physics-informed machine learning, and LLM-based decision support. The goal is to use AI as a planning and reasoning layer while keeping actions constrained by voltage, frequency, thermal, and service-continuity limits.

### Cyber-physical security

I study cyber attacks on grid communication and control systems, including false-data injection, malicious Volt-VAR modifications, load-altering attacks, and topology/control manipulation. My work emphasizes detection, mitigation, and testbed-based validation.

### Data centers and critical infrastructure

I study how data centers, hospitals, and other critical facilities can interact with the electric grid as flexible but service-constrained assets. This includes data-center support for restoration, hospital energy resilience, backup power coordination, and safe operation during compound outage events.

## Representative project figures

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    <img src="{{ '/assets/img/data_center_restoration.svg' | relative_url }}" alt="Data center restoration concept" class="img-fluid rounded z-depth-1">
  </div>
</div>
<div class="caption">
  Data centers can be modeled as restoration-compatible assets with controllable grid exchange, on-site generation, battery support, and IT flexibility.
</div>

<div class="row">
  <div class="col-sm mt-3 mt-md-0">
    <img src="{{ '/assets/img/gridguard.svg' | relative_url }}" alt="GridGuard concept" class="img-fluid rounded z-depth-1">
  </div>
</div>
<div class="caption">
  GridGuard uses LLM reasoning only as a planning layer, with final actions screened through power-system constraints.
</div>
