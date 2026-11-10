// Sends the contact form to Web3Forms without leaving the page.
// Without JavaScript the form still works: it posts straight to Web3Forms.
(function () {
  var form = document.getElementById('contact-form');
  if (!form || !window.fetch) return;
  var status = document.getElementById('form-status');
  var button = form.querySelector('button[type="submit"]');

  function say(text, kind) {
    status.textContent = text;
    status.className = 'form-status' + (kind ? ' ' + kind : '');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.reportValidity()) return;

    var data = new FormData(form);
    var captcha = data.get('h-captcha-response');
    if (captcha !== null && !captcha) {
      say('Please complete the "I am human" check first.', 'error');
      return;
    }

    button.disabled = true;
    say('Sending…');
    fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (res.ok && res.body && res.body.success) {
          form.reset();
          if (window.hcaptcha && window.hcaptcha.reset) { try { window.hcaptcha.reset(); } catch (err) {} }
          say('Thanks! Your message is on its way. I will get back to you soon.', 'ok');
        } else {
          say((res.body && res.body.message) || 'Something went wrong. Please try again, or reach me on LinkedIn.', 'error');
        }
      })
      .catch(function () { say('Could not send right now. Please try again, or reach me on LinkedIn.', 'error'); })
      .then(function () { button.disabled = false; });
  });
})();
