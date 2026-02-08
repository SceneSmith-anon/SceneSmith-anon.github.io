// Lazy load videos when they enter the viewport
document.addEventListener("DOMContentLoaded", function() {
  const lazyVideos = [].slice.call(document.querySelectorAll("video.lazy-video"));
  console.log("Found lazy videos:", lazyVideos.length);

  if ("IntersectionObserver" in window) {
    let lazyVideoObserver = new IntersectionObserver(function(entries, observer) {
      entries.forEach(function(videoEntry) {
        if (videoEntry.isIntersecting) {
          let video = videoEntry.target;
          // Only add source if not already present
          if (!video.querySelector('source') && video.dataset.src) {
            let source = document.createElement('source');
            source.src = video.dataset.src;
            source.type = "video/mp4";
            video.appendChild(source);
            video.load();
            console.log("Source added and video.load() called");
          }
          lazyVideoObserver.unobserve(video);
        }
      });
    });

    lazyVideos.forEach(function(lazyVideo) {
      lazyVideoObserver.observe(lazyVideo);
    });
  } else {
    // Fallback: load all videos immediately if IntersectionObserver is not supported
    lazyVideos.forEach(function(video) {
      if (!video.querySelector('source') && video.dataset.src) {
        let source = document.createElement('source');
        source.src = video.dataset.src;
        source.type = "video/mp4";
        video.appendChild(source);
        video.load();
        console.log("Fallback: Source added and video.load() called");
      }
    });
  }
});

// Hide spinner when video is ready
document.addEventListener("DOMContentLoaded", function() {
  document.querySelectorAll('.video-wrapper').forEach(function(wrapper) {
    var video = wrapper.querySelector('video');
    var spinner = wrapper.querySelector('.video-spinner');
    if (video && spinner) {
      // Hide spinner when video can play
      video.addEventListener('canplay', function() {
        spinner.style.display = 'none';
      });
      // Optionally, show spinner again if video is waiting/buffering
      video.addEventListener('waiting', function() {
        spinner.style.display = '';
      });
      video.addEventListener('playing', function() {
        spinner.style.display = 'none';
      });
    }
  });
});

// Function to load video source for a specific slide element
function loadVideoForSlide(slideElement) {
  // Find the video wrapper within the slide
  const videoWrapper = slideElement.querySelector('.video-wrapper');
  if (!videoWrapper) return;

  const video = videoWrapper.querySelector('video.lazy-video');
  const spinner = videoWrapper.querySelector('.video-spinner');

  // Only load if video exists, has data-src, and has no source yet
  if (video && video.dataset.src && !video.querySelector('source')) {
    console.log("Loading video for active slide:", video.dataset.src);
    let source = document.createElement('source');
    source.src = video.dataset.src;
    source.type = "video/mp4";
    video.appendChild(source);
    video.load(); // Important: tell the video to load the new source

    // Handle spinner visibility
    if (spinner) {
      spinner.style.display = ''; // Show spinner initially
      video.addEventListener('canplay', () => spinner.style.display = 'none', { once: true }); // Hide when ready
      video.addEventListener('error', () => spinner.style.display = 'none', { once: true }); // Hide on error too
      // Optional: Show spinner on waiting/buffering (can be noisy)
      // video.addEventListener('waiting', () => spinner.style.display = '');
      // video.addEventListener('playing', () => spinner.style.display = 'none');
    }
  } else if (video && video.querySelector('source') && spinner) {
      // If source already exists (e.g., navigating back), ensure spinner is hidden if video is playable
      if (!video.paused || video.readyState >= 3) { // readyState 3 (HAVE_FUTURE_DATA) or 4 (HAVE_ENOUGH_DATA)
          spinner.style.display = 'none';
      }
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Hide spinner when video is ready
  document.querySelectorAll('.video-wrapper').forEach(function(wrapper) {
    var video = wrapper.querySelector('video');
    var spinner = wrapper.querySelector('.video-spinner');
    if (video && spinner) {
      // Hide spinner when video can play
      video.addEventListener('canplay', function() {
        spinner.style.display = 'none';
      });
      // Optionally, show spinner again if video is waiting/buffering
      video.addEventListener('waiting', function() {
        spinner.style.display = '';
      });
      video.addEventListener('playing', function() {
        spinner.style.display = 'none';
      });
    }
  });
});

// Add this function after DOM loaded
document.addEventListener('DOMContentLoaded', function() {
  // Add CSS for consistent carousel sizing
  const style = document.createElement('style');
  style.textContent = `
    .results-carousel .results-item {
      max-width: 100%;
      overflow: hidden;
    }
    .results-carousel .slick-prev, 
    .results-carousel .slick-next {
      z-index: 10;
    }
    .results-carousel .slick-dots {
      position: relative;
      bottom: 0;
      margin-top: 10px;
    }
    .video-wrapper {
      margin: 0 auto;
      max-width: 90%;
    }
    #buildup-carousel .results-item {
      text-align: center;
    }
    #robot-eval-carousel .results-item {
      text-align: center;
    }
    #rby1-carousel .results-item {
      text-align: center;
    }
  `;
  document.head.appendChild(style);
});

// Add function to enable video restart on click
document.addEventListener("DOMContentLoaded", function() {
  // Add clickable restart functionality to all videos (except buildup carousel)
  document.querySelectorAll('.video-wrapper').forEach(function(wrapper) {
    if (wrapper.closest('#buildup-carousel') || wrapper.closest('#robot-eval-carousel') || wrapper.closest('#rby1-carousel') || wrapper.closest('#earthquake-section') || wrapper.closest('#text-to-scene-section')) return;
    const video = wrapper.querySelector('video');
    if (video) {
      // Add controls to all videos
      video.setAttribute('controls', '');
      
      // Add a play/restart overlay
      const overlay = document.createElement('div');
      overlay.className = 'video-restart-overlay';
      overlay.innerHTML = '<i class="fas fa-redo"></i>';
      overlay.style.cssText = 'position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.2); cursor: pointer; display: none; justify-content: center; align-items: center; z-index: 5;';
      wrapper.appendChild(overlay);
      
      // Show overlay when video ends
      video.addEventListener('ended', function() {
        overlay.style.display = 'flex';
      });
      
      // Restart video when overlay is clicked
      overlay.addEventListener('click', function(e) {
        e.stopPropagation();
        video.currentTime = 0;
        video.play();
        overlay.style.display = 'none';
      });
      
      // Also allow clicking directly on video to restart
      video.addEventListener('click', function(e) {
        if (video.ended) {
          e.stopPropagation();
          video.currentTime = 0;
          video.play();
          if (overlay) overlay.style.display = 'none';
        }
      });
    }
  });
});

// Buildup carousel: autoplay videos when fully visible, pause when not
document.addEventListener('DOMContentLoaded', function() {
  const buildupCarousel = document.getElementById('buildup-carousel');
  if (!buildupCarousel) return;

  let buildupInView = false;

  function getActiveSlideVideo() {
    const activeSlide = buildupCarousel.querySelector('.slick-current .video-wrapper video.lazy-video');
    return activeSlide || null;
  }

  function playActiveVideo() {
    const video = getActiveSlideVideo();
    if (!video) return;
    // Load source if needed
    if (video.dataset.src && !video.querySelector('source')) {
      loadVideoForSlide(video.closest('.results-item'));
    }
    video.play().catch(function() {});
  }

  function pauseActiveVideo() {
    const video = getActiveSlideVideo();
    if (video) video.pause();
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        buildupInView = entry.isIntersecting;
        if (buildupInView) {
          playActiveVideo();
        } else {
          pauseActiveVideo();
        }
      });
    }, { threshold: 1.0 });
    observer.observe(buildupCarousel);
  }

  // On slide change, load and play new slide's video if in view
  $(buildupCarousel).on('afterChange', function() {
    const activeSlide = buildupCarousel.querySelector('.slick-current .results-item') ||
                        buildupCarousel.querySelector('.slick-current');
    if (activeSlide) {
      loadVideoForSlide(activeSlide);
    }
    if (buildupInView) {
      setTimeout(playActiveVideo, 50);
    }
  });

  // Pause and reset previous slide's video on beforeChange
  $(buildupCarousel).on('beforeChange', function() {
    const video = getActiveSlideVideo();
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  });

  // When a buildup video ends, auto-advance to the next slide
  function attachEndedHandler(video) {
    if (!video || video._buildupEndedAttached) return;
    video._buildupEndedAttached = true;
    video.addEventListener('ended', function() {
      if (!buildupInView) return;
      // Brief pause so viewer registers the video finished, then advance
      setTimeout(function() {
        $(buildupCarousel).slick('slickNext');
      }, 500);
    });
  }

  // Attach to all buildup videos (including Slick clones) once carousel is ready
  buildupCarousel.querySelectorAll('video.lazy-video').forEach(attachEndedHandler);

  // Also attach after each slide change in case of late-loaded videos
  $(buildupCarousel).on('afterChange', function() {
    const video = getActiveSlideVideo();
    attachEndedHandler(video);
  });
});

// RBY1 teleoperation carousel: autoplay videos when visible, pause when not
document.addEventListener('DOMContentLoaded', function() {
  const rby1Carousel = document.getElementById('rby1-carousel');
  if (!rby1Carousel) return;

  let rby1InView = false;

  function getRby1ActiveVideo() {
    return rby1Carousel.querySelector('.slick-current .video-wrapper video.lazy-video') || null;
  }

  function playRby1ActiveVideo() {
    if (!rby1InView) return;
    const video = getRby1ActiveVideo();
    if (!video) return;
    if (video.dataset.src && !video.querySelector('source')) {
      loadVideoForSlide(video.closest('.results-item'));
    }
    video.play().catch(function() {});
  }

  function pauseRby1ActiveVideo() {
    const video = getRby1ActiveVideo();
    if (video) video.pause();
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        rby1InView = entry.isIntersecting;
        if (rby1InView) {
          playRby1ActiveVideo();
        } else {
          pauseRby1ActiveVideo();
        }
      });
    }, { threshold: [0] });
    observer.observe(rby1Carousel);
  }

  $(rby1Carousel).on('afterChange', function() {
    const activeSlide = rby1Carousel.querySelector('.slick-current .results-item') ||
                        rby1Carousel.querySelector('.slick-current');
    if (activeSlide) {
      loadVideoForSlide(activeSlide);
    }
    if (rby1InView) {
      setTimeout(playRby1ActiveVideo, 50);
    }
  });

  $(rby1Carousel).on('beforeChange', function() {
    const video = getRby1ActiveVideo();
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  });

  function attachRby1EndedHandler(video) {
    if (!video || video._rby1EndedAttached) return;
    video._rby1EndedAttached = true;
    video.addEventListener('ended', function() {
      if (!rby1InView) return;
      setTimeout(function() {
        $(rby1Carousel).slick('slickNext');
      }, 500);
    });
  }

  rby1Carousel.querySelectorAll('video.lazy-video').forEach(attachRby1EndedHandler);

  $(rby1Carousel).on('afterChange', function() {
    const video = getRby1ActiveVideo();
    attachRby1EndedHandler(video);
  });
});

// Robot eval carousel: autoplay videos when any part is visible, pause when not
document.addEventListener('DOMContentLoaded', function() {
  const robotEvalCarousel = document.getElementById('robot-eval-carousel');
  if (!robotEvalCarousel) return;

  let robotEvalInView = false;
  let robotEvalFullyInView = false;

  function isFirstSlide() {
    return $(robotEvalCarousel).slick('slickCurrentSlide') === 0;
  }

  function shouldPlay() {
    return isFirstSlide() ? robotEvalFullyInView : robotEvalInView;
  }

  function getRobotEvalActiveVideo() {
    return robotEvalCarousel.querySelector('.slick-current .video-wrapper video.lazy-video') || null;
  }

  function playRobotEvalActiveVideo() {
    if (!shouldPlay()) return;
    const video = getRobotEvalActiveVideo();
    if (!video) return;
    if (video.dataset.src && !video.querySelector('source')) {
      loadVideoForSlide(video.closest('.results-item'));
    }
    video.play().catch(function() {});
  }

  function pauseRobotEvalActiveVideo() {
    const video = getRobotEvalActiveVideo();
    if (video) video.pause();
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        robotEvalInView = entry.isIntersecting;
        robotEvalFullyInView = entry.intersectionRatio >= 0.95;
        if (shouldPlay()) {
          playRobotEvalActiveVideo();
        } else if (!robotEvalInView) {
          pauseRobotEvalActiveVideo();
        }
      });
    }, { threshold: [0, 0.95] });
    observer.observe(robotEvalCarousel);
  }

  $(robotEvalCarousel).on('afterChange', function() {
    const activeSlide = robotEvalCarousel.querySelector('.slick-current .results-item') ||
                        robotEvalCarousel.querySelector('.slick-current');
    if (activeSlide) {
      loadVideoForSlide(activeSlide);
    }
    if (shouldPlay()) {
      setTimeout(playRobotEvalActiveVideo, 50);
    }
  });

  $(robotEvalCarousel).on('beforeChange', function() {
    const video = getRobotEvalActiveVideo();
    if (video) {
      video.pause();
      video.currentTime = 0;
    }
  });

  function attachRobotEvalEndedHandler(video) {
    if (!video || video._robotEvalEndedAttached) return;
    video._robotEvalEndedAttached = true;
    video.addEventListener('ended', function() {
      if (!robotEvalInView) return;
      setTimeout(function() {
        $(robotEvalCarousel).slick('slickNext');
      }, 500);
    });
  }

  robotEvalCarousel.querySelectorAll('video.lazy-video').forEach(attachRobotEvalEndedHandler);

  $(robotEvalCarousel).on('afterChange', function() {
    const video = getRobotEvalActiveVideo();
    attachRobotEvalEndedHandler(video);
  });
});

// Earthquake video: autoplay when visible, pause when not
document.addEventListener('DOMContentLoaded', function() {
  const earthquakeVideo = document.getElementById('earthquake-video');
  if (!earthquakeVideo) return;

  function loadAndPlay() {
    if (earthquakeVideo.dataset.src && !earthquakeVideo.querySelector('source')) {
      var source = document.createElement('source');
      source.src = earthquakeVideo.dataset.src;
      source.type = 'video/mp4';
      earthquakeVideo.appendChild(source);
      earthquakeVideo.load();
    }
    earthquakeVideo.play().catch(function() {});
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          loadAndPlay();
        } else {
          earthquakeVideo.pause();
        }
      });
    }, { threshold: 0.25 });
    observer.observe(earthquakeVideo);
  }
});

// Text-to-scene video: autoplay when fully visible, pause when not
document.addEventListener('DOMContentLoaded', function() {
  const textToSceneVideo = document.getElementById('text-to-scene-video');
  if (!textToSceneVideo) return;

  function loadAndPlay() {
    if (textToSceneVideo.dataset.src && !textToSceneVideo.querySelector('source')) {
      var source = document.createElement('source');
      source.src = textToSceneVideo.dataset.src;
      source.type = 'video/mp4';
      textToSceneVideo.appendChild(source);
      textToSceneVideo.load();
    }
    textToSceneVideo.play().catch(function() {});
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          loadAndPlay();
        } else {
          textToSceneVideo.pause();
        }
      });
    }, { threshold: 0.9 });
    observer.observe(textToSceneVideo);
  }
});
