/* 8s slow-load recovery (MOBILE_SPEC §1.5.6). Rationale: foot of src/main.tsx. */
;(function () {
  var body = document.body
  var retry = document.getElementById('boot-retry')

  if (retry) {
    retry.addEventListener('click', function () {
      window.location.reload()
    })
  }

  window.setTimeout(function () {
    if (body.dataset.boot !== 'ready') body.dataset.boot = 'slow'
  }, 8000)
})()
