---
layout: default
title: Past Updates
permalink: /updates/
---

<main class="container">
    <h1>Past Updates</h1>
    
    <div class="content">
        <p>This is an archive of my past "now" updates, showing what I was focused on at different points in time.</p>
        
        <div class="updates-list">
            {% assign sorted_updates = site.data.updates | sort: 'date' | reverse %}
            {% for update in sorted_updates %}
            <div class="update-item" style="margin-bottom: 3rem;">
                <h2>{{ update.title }}</h2>
                <p class="post-date">{{ update.date | date: "%B %Y" }}</p>
                {{ update.content | markdownify }}
                <hr>
            </div>
            {% endfor %}
        </div>
        
        <a href="{{ '/' | relative_url }}" class="back-to-home">← Back to home</a>
    </div>
</main>