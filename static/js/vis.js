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
  console.log("DOM loaded, looking for diffusion section");
  // Add warning overlay for diffusion videos section
  const diffusionSection = document.querySelector('#diffusion-videos-section');
  if (diffusionSection) {
    console.log("Found diffusion section", diffusionSection);
    // Get the carousel container
    const carouselContainer = diffusionSection.querySelector('.carousel.results-carousel');
    
    if (carouselContainer) {
      console.log("Found carousel container", carouselContainer);
      // Initially hide the carousel
      carouselContainer.style.display = 'none';
      
      // Create warning button
      const warningBtn = document.createElement('div');
      warningBtn.className = 'warning-button has-text-centered';
      warningBtn.innerHTML = `
        <div class="notification is-warning">
          <p><strong>Warning:</strong> The following videos contain rapid flashing content which may not be suitable for photosensitive viewers.</p>
          <button class="button is-danger mt-3">Show Videos Anyway</button>
        </div>
      `;
      
      // Insert the warning button before the carousel
      carouselContainer.parentNode.insertBefore(warningBtn, carouselContainer);
      console.log("Added warning button");
      
      // Add click event to the warning button
      const showButton = warningBtn.querySelector('button');
      showButton.addEventListener('click', function() {
        // Show the carousel
        carouselContainer.style.display = 'block';
        // Remove the warning button
        warningBtn.remove();
        
        // SIMPLE APPROACH: Directly load all videos
        const allVideos = carouselContainer.querySelectorAll('video.lazy-video');
        allVideos.forEach(function(video) {
          if (video.dataset.src && !video.hasAttribute('src') && !video.querySelector('source')) {
            const source = document.createElement('source');
            source.src = video.dataset.src;
            source.type = 'video/mp4';
            video.appendChild(source);
            video.load();
          }
        });
        
        // Force Slick to recalculate positions after showing the carousel
        setTimeout(function() {
          $(carouselContainer).slick('setPosition');
          
          // FORCE: Go to first slide and back to reset position
          $(carouselContainer).slick('slickGoTo', 1, true);
          setTimeout(function() {
            $(carouselContainer).slick('slickGoTo', 0, true);
          }, 50);
        }, 100);
      });
    } else {
      console.log("Carousel container not found inside diffusion section");
    }
  } else {
    console.log("Diffusion section not found");
  }
  
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
  `;
  document.head.appendChild(style);
});

// Add function to enable video restart on click
document.addEventListener("DOMContentLoaded", function() {
  // Add clickable restart functionality to all videos
  document.querySelectorAll('.video-wrapper').forEach(function(wrapper) {
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
