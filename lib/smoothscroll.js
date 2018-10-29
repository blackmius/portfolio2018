let timer, start, factor;

export default (target, duration=1000, layout=window) => {
    if (typeof layout === 'string') layout = document.getElementById(layout);
  	target = document.getElementById(target).offsetTop;

    let offset;
    if ('window' in layout) offset = layout.pageYOffset;
    else offset = layout.scrollTop;

    let delta  = target - offset;
    start = Date.now();
    factor = 0;

    if (timer) clearInterval(timer);
    timer = setInterval(() => {
        let y;
        factor = (Date.now() - start) / duration;
        if (factor >= 1) {
            clearInterval(timer);
            factor = 1;
        }
        y = factor * delta + offset;
        if ('window' in layout) layout.scrollBy(0, y - layout.pageYOffset)
        else layout.scrollTop += y - layout.scrollTop;
    }, 10);
};
