(function () {
  var p = new URLSearchParams(location.search);
  if (!p.has('name') && !p.has('phone') && !p.has('city')) return;

  // After React renders, update all internal nav links to carry params forward
  function updateLinks() {
    var links = document.querySelectorAll('a[href]');
    links.forEach(function (link) {
      var href = link.getAttribute('href');
      if (href && /^[a-zA-Z][a-zA-Z0-9-]*\.html/.test(href) && !href.includes('?') && !href.startsWith('http')) {
        link.setAttribute('href', href + '?' + p.toString());
      }
    });
  }

  setTimeout(updateLinks, 800);
  setTimeout(updateLinks, 2000);
})();
