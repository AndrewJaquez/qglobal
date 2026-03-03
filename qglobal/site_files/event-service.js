document.addEventListener("DOMContentLoaded", function () {
    // Disable right-click on the entire page
    document.addEventListener("contextmenu", function (event) {
        event.preventDefault();
    });

    const observer = new MutationObserver(() => {
        document.querySelectorAll("*").forEach((el) => {
            el.addEventListener("contextmenu", function (event) {
                event.preventDefault();
            });
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
});
