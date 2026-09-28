// Scale the fixed Letter sheet to the screen; never reflow the document.
const guideViewport = document.querySelector('.guide-viewport');
if (guideViewport) {
  const fitGuide = () => {
    guideViewport.style.setProperty('--page-scale', Math.min(1, guideViewport.clientWidth / 816));
    document.documentElement.classList.add('guide-scaled');
  };
  fitGuide();
  if ('ResizeObserver' in window) new ResizeObserver(fitGuide).observe(guideViewport);
  else window.addEventListener('resize', fitGuide);
}
