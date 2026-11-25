---
layout: default
title: Past updates
permalink: /updates/
---

<div class="page">
  <header class="page-head">
    <h1>Past updates</h1>
    <p class="lede">My past "now" updates: what I was focused on at different points in time.</p>
  </header>

  {% assign sorted_updates = site.data.updates | sort: 'date' | reverse %}
  {% for update in sorted_updates %}
  <article class="card update">
    <h2>{{ update.title }}</h2>
    <time datetime="{{ update.date | date_to_xmlschema }}">{{ update.date | date: "%B %Y" }}</time>
    <div class="prose">{{ update.content | markdownify }}</div>
  </article>
  {% endfor %}

  <a class="back" href="{{ '/' | relative_url }}">← Home</a>
</div>
