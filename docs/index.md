---
layout: home

hero:
  name: WreckCheck
  text: Ship with fewer surprises.
  tagline: A release-readiness scanner for the failures that quietly derail deploys — from leaked credentials to a Docker image running as root.
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: Explore checks
      link: /checks

features:
  - title: One release verdict
    details: Turn many small risks into a clear, policy-aware score and ship recommendation.
  - title: Local by design
    details: Scan the working tree on your machine. WreckCheck does not upload your project.
  - title: CI-native output
    details: Use JSON, SARIF, GitHub annotations, and a configurable failure threshold where releases happen.
---

## Why WreckCheck?
<div class="release-panel" aria-label="Example WreckCheck scan result">
  <div class="release-panel__top"><span class="release-panel__dot"></span><span class="release-panel__dot"></span><span class="release-panel__dot"></span> wreckcheck</div>
  <div class="release-panel__body">
    <div class="release-panel__label">SHIP READINESS</div>
    <div class="release-panel__score">84<span>/ 100</span></div>
    <div class="release-panel__bar"></div>
    <div class="release-panel__verdict">✓ SAFE TO SHIP</div>
    <div class="release-panel__meta"><span>0 active issues</span><span>local scan</span></div>
  </div>
</div>

<p class="home-note">Start with <code>npx wreckcheck .</code> and make the next release a little less eventful.</p>
