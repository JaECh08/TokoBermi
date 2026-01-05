// Scroll to Top Function
function scrollToTop() {
    const contentContainer = document.querySelector('.content-container');
    if (contentContainer) {
        contentContainer.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
}

// Show/Hide Back to Top Buttons on Scroll
const contentContainer = document.querySelector('.content-container');
if (contentContainer) {
    contentContainer.addEventListener('scroll', function () {
        const scrollTop = this.scrollTop;
        const backToTopBtns = [
            document.getElementById('backToTopBtn'),
            document.getElementById('backToTopBtnIncoming'),
            document.getElementById('backToTopBtnOutgoing')
        ];

        backToTopBtns.forEach(btn => {
            if (btn) {
                if (scrollTop > 300) {
                    btn.classList.add('show');
                } else {
                    btn.classList.remove('show');
                }
            }
        });
    });
}

window.scrollToTop = scrollToTop;
