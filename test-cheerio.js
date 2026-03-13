const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('post-content.html', 'utf8');
const $ = cheerio.load(html, null, false);

$('h3').each((i, el) => {
    const title = $(el).text();
    const $siblings = $(el).nextUntil('hr, h2, h3');

    const $wrapper = $('<div class="event-card-marker" data-event-title="' + title + '"></div>');
    $(el).before($wrapper);
    $wrapper.append(el);
    $wrapper.append($siblings);
});

console.log($.html().substring(0, 1500));
console.log('\n--- SUCCESS ---');
