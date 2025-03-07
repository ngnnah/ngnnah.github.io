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
            {% for update in site.updates reversed %}
            <div class="update-item">
                <p>{{ update.date | date: "%B %Y" }}</p>
                {{ update.content }}
                <hr>
            </div>
            {% endfor %}
        </div>
        
        <a href="{{ '/' | relative_url }}" class="back-to-home">← Back to home</a>
    </div>
</main>

