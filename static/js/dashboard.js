document.addEventListener('DOMContentLoaded', () => {
  const mediaList = document.getElementById('media-list');
  fetch(`/dashboard/${window.UserID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  }).then(response => {
    if (response.status !== 200) {
      alert('Error loading media');
      return location.reload();
    }
    response.json().then(data => {
      data.forEach((media, i) => {
        const li = mediaList.children[i];
        const thumbnail = li.firstElementChild.firstElementChild;
        thumbnail.dataset.fancybox = 'media';
        thumbnail.dataset.caption = media.Title;
        const thumbnailImg = thumbnail.firstElementChild;
        if (media.MediaType === 'image') {
          thumbnail.href = `sanctum.b-cdn.net/images/${media.MediaID}.webp`;
          thumbnailImg.src = `sanctum.b-cdn.net/images/${media.MediaID}.webp`;
        } else if (media.MediaType === 'video') {
          thumbnail.href = `https://iframe.mediadelivery.net/embed/${STREAM_ID}/${media.MediaID}?autoplay=false`;
          thumbnail.dataset.type = 'iframe';
          thumbnailImg.classList.add('media-preview');
          const previewProgressBar = document.createElement('div');
          previewProgressBar.className = 'preview-progress-bar';
          li.firstElementChild.insertBefore(previewProgressBar, thumbnail);
          thumbnailImg.src = `https://${STREAM_HOSTNAME}.b-cdn.net/${media.MediaID}/thumbnail.jpg?${media.ThumbChanges}`;
          thumbnailImg.dataset.img = `https://${STREAM_HOSTNAME}.b-cdn.net/${media.MediaID}/thumbnail.jpg?${media.ThumbChanges}`;
          thumbnailImg.dataset.preview = `https://${STREAM_HOSTNAME}.b-cdn.net/${media.MediaID}/preview.webp`;
        } else {
          alert('Funky error! How did this happen?');
          return location.reload();
        }
        if (i >= 12) {
          thumbnailImg.loading = 'lazy';
        }
        thumbnailImg.alt = media.Title;
        thumbnailImg.onerror = () => {
          delete thumbnailImg.dataset.fancybox;
          thumbnailImg.onerror = null;
          thumbnailImg.src = '/images/Processing.png';
          thumbnailImg.dataset.preview = '/images/Processing.png';
          thumbnailImg.dataset.img = '/images/Processing.png';
        }
        const duration = document.createElement('div');
        duration.classList.add('recommended-media-duration');
        duration.innerHTML = `<var>${getDuration(media.Duration)}</var>`;
        thumbnail.appendChild(duration);
      });
      previewImages();
      if (data.length < 12) {
        for (let i = 0; i < 12 - data.length; i++) {
          mediaList.removeChild(mediaList.lastElementChild);
        }
      }
    });
  }).catch(() => {
    alert('Error loading media');
    location.reload();
  });
});

const getDuration = (durationNumber) => {
  return Math.floor(durationNumber / 60) + ":" + String(durationNumber % 60).padStart(2, '0');
}
