window.HELP_IMPROVE_VIDEOJS = false;

function initSlickCarousel(selector) {
  const carousel = $(selector);
  if (!carousel.length || carousel.hasClass('slick-initialized')) {
    return;
  }

  carousel.slick({
    dots: true,
    infinite: true,
    speed: 300,
    slidesToShow: 1,
    autoplay: false,
    initialSlide: 0,
  });
}

$(document).ready(function () {
  // Check for click events on the navbar burger icon
  $(".navbar-burger").click(function () {
    $(".navbar-burger").toggleClass("is-active");
    $(".navbar-menu").toggleClass("is-active");
  });

  // Initialize buildup carousel
  initSlickCarousel('#buildup-carousel');

  // Initialize RBY1 teleoperation carousel
  initSlickCarousel('#rby1-carousel');

  // Initialize zero-shot carousel
  initSlickCarousel('#zero-shot-carousel');

  // Initialize robot evaluation carousel
  initSlickCarousel('#robot-eval-carousel');
});

$(window).on("load", function () {
  initSlickCarousel('#buildup-carousel');
  initSlickCarousel('#rby1-carousel');
  initSlickCarousel('#zero-shot-carousel');
  initSlickCarousel('#robot-eval-carousel');

  // Reset gifs once everything is loaded to synchronize playback.
  $('.preload').attr('src', function (i, a) {
    $(this).attr('src', '').removeClass('preload').attr('src', a);
  });

  $('.author-portrait').each(function () {
    $(this).mouseover(function () {
      $(this).find('.depth').css('top', '-100%');
    });
    $(this).mouseout(function () {
      $(this).find('.depth').css('top', '0%');
    });
  });


  const position = { x: 0, y: 0 }
  const box = $('.hyper-space');
  const cursor = $('.hyper-space-cursor');
  interact('.hyper-space-cursor').draggable({
    listeners: {
      start(event) {
        console.log(event.type, event.target)
      },
      move(event) {
        position.x += event.dx
        position.y += event.dy

        event.target.style.transform =
          `translate(${position.x}px, ${position.y}px)`

        let childPos = cursor.offset();
        let parentPos = box.offset();
        let childSize = cursor.outerWidth();
        let point = {
          x: (childPos.left - parentPos.left),
          y: (childPos.top - parentPos.top)
        };
        point = {
          x: (point.x) / (box.innerWidth() - childSize),
          y: (point.y) / (box.innerHeight() - childSize)
        }
        updateHyperGrid(point);
      },
    },
    modifiers: [
      interact.modifiers.restrictRect({
        restriction: 'parent'
      })
    ]
  });

});

Number.prototype.clamp = function (min, max) {
  return Math.min(Math.max(this, min), max);
};


function updateHyperGrid(point) {
  const n = 20 - 1;
  let top = Math.round(n * point.y.clamp(0, 1)) * 100;
  let left = Math.round(n * point.x.clamp(0, 1)) * 100;
  $('.hyper-grid-rgb > img').css('left', -left + '%');
  $('.hyper-grid-rgb > img').css('top', -top + '%');
}
