(function () {
    const buttons = document.querySelectorAll('.tab-btn');
    const frames = document.querySelectorAll('iframe');
    const frameByTab = {};
    frames.forEach((f) => {
        const name = f.getAttribute('data-src').split('/')[0];
        frameByTab[name] = f;
    });

    function resizeFrame(frame) {
        try {
            const doc = frame.contentDocument;
            if (!doc) return;
            const h = Math.max(
                doc.body ? doc.body.scrollHeight : 0,
                doc.documentElement ? doc.documentElement.scrollHeight : 0
            );
            if (h > 0) frame.style.height = h + 'px';
        } catch (e) { /* ignore */ }
    }

    function activate(tab) {
        buttons.forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
        frames.forEach((f) => f.classList.remove('active'));

        const frame = frameByTab[tab];
        if (!frame) return;

        if (!frame.getAttribute('src')) {
            frame.setAttribute('src', frame.getAttribute('data-src'));
            frame.addEventListener('load', () => resizeFrame(frame));
        }

        frame.classList.add('active');
        document.body.style.width = frame.getAttribute('data-w') + 'px';
        resizeFrame(frame);
    }

    buttons.forEach((btn) => {
        btn.addEventListener('click', () => activate(btn.dataset.tab));
    });

    const observer = new MutationObserver(() => {
        const active = document.querySelector('iframe.active');
        if (active) resizeFrame(active);
    });
    observer.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true
    });

    setInterval(() => {
        const active = document.querySelector('iframe.active');
        if (active) resizeFrame(active);
    }, 800);

    activate('sisdm');
})();
