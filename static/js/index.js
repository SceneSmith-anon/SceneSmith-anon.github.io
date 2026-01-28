window.HELP_IMPROVE_VIDEOJS = false;

// Get all the embed sources before initializing Slick
var embedSources = [];
$(document).ready(function () {
  // Check for click events on the navbar burger icon
  $(".navbar-burger").click(function () {
    $(".navbar-burger").toggleClass("is-active");
    $(".navbar-menu").toggleClass("is-active");
  });

  $('.results-item').each(function(index) {
    var embedElement = $(this).find('embed')[0];
    var src = embedElement ? embedElement.getAttribute('src') : null; 
    console.log("Found source for slide " + index + ":", src);
    
    embedSources[index] = src;

    if (src) {
      // Initially remove the src so it doesn't load right away
      embedElement.removeAttribute('src');  
      $(this).find('.content.is-centered').prepend(
        '<div class="loading-placeholder" style="position:absolute;top:0;left:0;width:100%;height:100%;display:flex;justify-content:center;align-items:center;background:#f5f5f5;z-index:1;">Loading simulation...</div>'
      );
    }
  });

  // Initialize Slick carousel
  $('.results-carousel').slick({
    dots: true,
    infinite: true,
    speed: 300,
    slidesToShow: 1,
    autoplay: false,
    initialSlide: 0,
    // Ensure this is called after slick initialization
    init: function(event, slick) {
      console.log("Slick carousel initialized.");
      loadCurrentSlide(); // Load initial slide when carousel is fully initialized
    }
  });

  // Load the current slide when it changes
  $('.results-carousel').on('afterChange', function(event, slick, currentSlide) {
    loadCurrentSlide(currentSlide);
  });

  // Load the initial slide
  loadCurrentSlide(0); // Ensure we load slide 0 immediately after initialization
});

// Function to load the source for the current slide
function loadCurrentSlide(currentIndex) {
  // Get the source for the current slide
  var source = embedSources[currentIndex];
  console.log("Loading slide", currentIndex, "with source:", source);
  
  if (source) {
    var $currentSlide = $('.results-item').eq(currentIndex + 1);
    var embedElement = $currentSlide.find('embed')[0];

    // Only set the source if it isn't already set (prevents re-setting unnecessarily)
    if (!embedElement.hasAttribute('src')) {
      embedElement.setAttribute('src', source);  // Set the src attribute
      console.log("Set source for slide " + currentIndex);
    }
    
    // Remove the loading placeholder after a delay
    setTimeout(function() {
      $currentSlide.find('.loading-placeholder').fadeOut();
    }, 500);
  }
}


$(window).on("load", function () {
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