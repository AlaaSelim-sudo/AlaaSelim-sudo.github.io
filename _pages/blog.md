---
layout: default
permalink: /blog/
title: Blog
nav: false
pagination:
  enabled: true
  collection: posts
  permalink: /page/:num/
  per_page: 5
  sort_field: date
  sort_reverse: true
---

<div class="post">
  <div class="header-bar">
    <h1>Blog</h1>
    <h2>Longer essays and notes will be added here.</h2>
  </div>

  {% assign featured_posts = site.posts | where: "featured", "true" %}
  {% if site.posts.size > 0 %}
    <ul>
    {% for post in site.posts %}
      <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a> — {{ post.date | date: "%b %d, %Y" }}</li>
    {% endfor %}
    </ul>
  {% else %}
    <p>No long-form posts yet. See the <a href="{{ '/news/' | relative_url }}">news page</a> for short updates.</p>
  {% endif %}
</div>
