(function () {
  var p = new URLSearchParams(location.search);
  var newName  = p.get('name');
  var newPhone = p.get('phone');
  var newCity  = p.get('city');
  var newEmail = p.get('email');

  if (!newName && !newPhone && !newCity) return;

  var OLD = {
    name:   'Wagsworth & Co.',
    phone1: '(614) 555·0142',
    phone2: '(614) 555-0142',
    tel:    '+16145550142',
    city1:  'Clintonville, Columbus, Ohio',
    city2:  'Clintonville, Columbus',
    city3:  'Columbus, Ohio',
    city4:  'Columbus, OH',
    email:  'hi@wagsworth.studio',
    insta:  '@wagsworth.studio',
  };

  var newTel   = newPhone ? '+1' + newPhone.replace(/[^0-9]/g, '') : OLD.tel;
  var finalEmail = newEmail || OLD.email;

  function walkNode(node) {
    if (node.nodeType === 3) {
      var t = node.textContent;
      var orig = t;
      if (newName) {
        t = t.split(OLD.name).join(newName);
      }
      if (newPhone) {
        t = t.split(OLD.phone1).join(newPhone);
        t = t.split(OLD.phone2).join(newPhone);
      }
      if (newCity) {
        t = t.split(OLD.city1).join(newCity);
        t = t.split(OLD.city2).join(newCity);
        t = t.split(OLD.city3).join(newCity);
        t = t.split(OLD.city4).join(newCity);
      }
      if (newEmail) {
        t = t.split(OLD.email).join(finalEmail);
      }
      if (t !== orig) node.textContent = t;
    } else if (node.nodeType === 1) {
      var tag = node.tagName;
      if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return;

      var href = node.getAttribute('href');
      if (href) {
        if (href === 'tel:' + OLD.tel) {
          node.setAttribute('href', 'tel:' + newTel);
        } else if (href === 'mailto:' + OLD.email && newEmail) {
          node.setAttribute('href', 'mailto:' + finalEmail);
        } else if (/^[a-zA-Z][a-zA-Z0-9-]*\.html/.test(href) && !href.startsWith('http')) {
          var base = href.split('?')[0];
          node.setAttribute('href', base + '?' + p.toString());
        }
      }

      var aria = node.getAttribute('aria-label');
      if (aria && newPhone) {
        var fixedAria = aria.split(OLD.phone1).join(newPhone).split(OLD.phone2).join(newPhone);
        if (fixedAria !== aria) node.setAttribute('aria-label', fixedAria);
      }

      for (var i = 0; i < node.childNodes.length; i++) {
        walkNode(node.childNodes[i]);
      }
    }
  }

  function run() {
    walkNode(document.body);
    if (newName) {
      document.title = document.title.replace(/Wagsworth[^——]*(?=[——]|$)/, newName + ' ');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
