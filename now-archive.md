---
layout: default
title: Past Updates
permalink: /now-archive/
---

<main class="container">
    <h1>Past Updates</h1>
    
    <div class="content">
        <p>This is an archive of my past "now" updates, showing what I was focused on at different points in time.</p>
        
        <div class="updates-list">
            {% for update in site.now-archive reversed %}
            <div class="update-item">
                <h2>{{ update.title }}</h2>
                {{ update.content }}
                <hr>
            </div>
            {% endfor %}
        </div>
        
        <a href="{{ '/' | relative_url }}" class="back-to-home">← Back to home</a>
    </div>
</main>