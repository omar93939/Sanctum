document.addEventListener('DOMContentLoaded', function() {

  const storageData = document.getElementById('storage-data').dataset;

  let categoryViewCounts = Cookies.get('categoryViewCounts');
  if (categoryViewCounts) {
    categoryViewCounts = JSON.parse(categoryViewCounts);
  } else {
    categoryViewCounts = {
      0: 2,
      1: 3,
      2: 2,
      3: 3,
      4: 1,
      5: 2,
      6: 1,
      7: 2,
      8: 1,
      9: 2,
      10: 1,
      11: 2,
      12: 1,
      13: 3,
      14: 1,
      15: 1,
      16: 1,
      17: 1,
      18: 1,
      19: 2,
      20: 1,
      21: 2,
      22: 2,
      23: 2,
      24: 2,
      25: 2,
      26: 1,
      27: 2,
      28: 1,
      29: 1,
      30: 2,
      31: 2,
      32: 1,
      33: 1,
      34: 1,
      35: 1,
      36: 1,
      37: 2,
      38: 1,
      39: 1,
      40: 1,
      41: 2,
      42: 2,
      43: 2,
      44: 1,
      45: 2,
      46: 1,
      47: 2,
      48: 1,
      49: 2,
      50: 1,
      51: 2,
      52: 1,
      53: 2,
      54: 1,
      55: 1,
      56: 1,
      57: 1,
      58: 1,
      59: 1,
      60: 1,
      61: 3,
      62: 2,
      63: 1,
      64: 1,
      65: 1,
      66: 1,
      67: 2,
      68: 2,
      69: 1,
      70: 1,
      71: 2,
      72: 1,
      73: 1,
      74: 2,
      75: 1,
      76: 1,
      77: 1,
      78: 3,
      79: 2,
      80: 2,
      81: 1,
      82: 1
    }
  }
  const topCategories = Object.keys(categoryViewCounts).sort((a, b) => categoryViewCounts[b] - categoryViewCounts[a]).slice(0, 20).map(Number);

  const categoryList = document.getElementById('category-list');
  if (!isMobile) {
    topCategories.forEach(category => {
      const categoryElement = document.createElement('li');
      categoryElement.innerHTML = `<a href="/videos?c=${category}">${videoCategoryKeys[category]}</a>`
      categoryList.appendChild(categoryElement);
    });
  }
  
  const adInserts = document.getElementsByClassName('ad-insert');
  topCategories.forEach(category => {
    for (let i = 0; i < adInserts.length; i++) {
      const adInsert = adInserts[i];
      if (adInsert.dataset.keywords) {
        adInsert.dataset.keywords += `, ${videoCategoryKeys[category]}`;
      } else {
        adInsert.dataset.keywords = videoCategoryKeys[category];
      }
    }
  });

  const videoList = document.getElementById('video-list');
  const page = parseInt(params.get("page")) || 1;
  fetch(`/api/video/recommended?page=${page}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ categoryViewCounts: categoryViewCounts, count: 64, promoted: true, subs: true, topCategories: topCategories, boost: true })
  }).then(response => {
    if (response.status === 200) {
      response.json().then(data => {
        data.forEach((video, i) => {
          if (i < 12) {
            const li = videoList.children[i];
            const thumbnail = li.firstElementChild.firstElementChild;
            thumbnail.href = `/watch?v=${video.VideoUID}`;
            const thumbnailImg = thumbnail.firstElementChild;
            if (video.Embed) {
              thumbnailImg.src = video.OriginalTitle;
            } else {
              thumbnailImg.classList.add('video-preview');
              const previewProgressBar = document.createElement('div');
              previewProgressBar.className = 'preview-progress-bar';
              li.firstElementChild.insertBefore(previewProgressBar, thumbnail);
              thumbnailImg.src = `https://${STREAM_HOSTNAME}.b-cdn.net/${video.VideoUID}/thumbnail_small.webp?${video.ThumbChanges}`;
              thumbnailImg.dataset.img = `https://${STREAM_HOSTNAME}.b-cdn.net/${video.VideoUID}/thumbnail_small.webp?${video.ThumbChanges}`;
              thumbnailImg.dataset.preview = `https://${STREAM_HOSTNAME}.b-cdn.net/${video.VideoUID}/preview.webp`;
            }
            thumbnailImg.alt = video.Title;
            thumbnailImg.onerror = () => {
              thumbnailImg.onerror = null;
              thumbnailImg.src = '/images/Processing.png';
              thumbnailImg.dataset.preview = '/images/Processing.png';
              thumbnailImg.dataset.img = '/images/Processing.png';
            }
            const infoWrapper = li.lastElementChild;
            const title = infoWrapper.firstElementChild.firstElementChild;
            title.href = `/watch?v=${video.VideoUID}`;
            title.title = video.Title;
            title.innerHTML = video.Title;
            const username = infoWrapper.children[1];
            username.onclick = () => openAvatarProfile(username);
            const avatar = username.firstElementChild;
            avatar.src = `https://sanctum.b-cdn.net/pp/${video.PP}.webp`;
            avatar.alt = `${video.Displayname || video.Username}'s avatar`;
            const usernameLink = username.lastElementChild;
            usernameLink.href = `/profile/${video.Username}/videos`;
            usernameLink.title = video.Displayname || video.Username;
            usernameLink.innerHTML = video.Displayname || video.Username;
            const detailsWrapper = infoWrapper.lastElementChild;
            detailsWrapper.innerHTML = `
              <span class="recommended-video-views"><var>${getViews(video.Views)}</var></span>
              <div class="recommended-video-rating-wrapper">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M313.4 32.9c26 5.2 42.9 30.5 37.7 56.5l-2.3 11.4c-5.3 26.7-15.1 52.1-28.8 75.2l144 0c26.5 0 48 21.5 48 48c0 18.5-10.5 34.6-25.9 42.6C497 275.4 504 288.9 504 304c0 23.4-16.8 42.9-38.9 47.1c4.4 7.3 6.9 15.8 6.9 24.9c0 21.3-13.9 39.4-33.1 45.6c.7 3.3 1.1 6.8 1.1 10.4c0 26.5-21.5 48-48 48l-97.5 0c-19 0-37.5-5.6-53.3-16.1l-38.5-25.7C176 420.4 160 390.4 160 358.3l0-38.3 0-48 0-24.9c0-29.2 13.3-56.7 36-75l7.4-5.9c26.5-21.2 44.6-51 51.2-84.2l2.3-11.4c5.2-26 30.5-42.9 56.5-37.7zM32 192l64 0c17.7 0 32 14.3 32 32l0 224c0 17.7-14.3 32-32 32l-64 0c-17.7 0-32-14.3-32-32L0 224c0-17.7 14.3-32 32-32z"/></svg>
                <var class="recommended-video-rating">${getRating(video.Likes, video.Dislikes)}</var>
              </div>`
            const duration = document.createElement('div');
            duration.classList.add('recommended-video-duration');
            duration.innerHTML = `<var>${getDuration(video.Duration)}</var>`;
            thumbnail.appendChild(duration);
          } else {
            const li = document.createElement('li');
            li.innerHTML = `<div class="recommended-video-thumbnail-wrapper">
              ${!video.Embed ? '<div class="preview-progress-bar"></div>' : ''}
              <a href="/watch?v=${video.VideoUID}">
                ${video.Embed ? `<img loading="lazy" class="recommended-video-thumbnail" src="${video.OriginalTitle}" alt="${video.Title}">` : `<img loading="lazy" class="recommended-video-thumbnail video-preview" src="https://${STREAM_HOSTNAME}.b-cdn.net/${video.VideoUID}/thumbnail_small.webp?${video.ThumbChanges}" alt="${video.Title}" data-img="https://${STREAM_HOSTNAME}.b-cdn.net/${video.VideoUID}/thumbnail_small.webp?${video.ThumbChanges}" data-preview="https://${STREAM_HOSTNAME}.b-cdn.net/${video.VideoUID}/preview.webp" onerror="this.onerror=null;this.src='/images/Processing.png';this.dataset.preview='/images/Processing.png';this.dataset.img='/images/Processing.png';">`}
                <div class="recommended-video-duration">
                  <var>${getDuration(video.Duration)}</var>
                </div>
              </a>
            </div>
            <div class="recommended-video-info-wrapper clearfix">
              <span class="recommended-video-title">
                <a href="/watch?v=${video.VideoUID}" title="${video.Title}">${video.Title}</a>
              </span>
              <span class="recommended-video-username" onclick="openAvatarProfile(this)">
                <img loading="lazy" class="recommended-video-avatar" src="https://sanctum.b-cdn.net/pp/${video.PP}.webp" alt="${video.Displayname || video.Username}'s avatar"></img><a href="/profile/${video.Username}/videos" title="${video.Displayname || video.Username}">${video.Displayname || video.Username}</a>
              </span>
              <div class="recommended-video-details-wrapper">
                <span class="recommended-video-views"><var>${getViews(video.Views)}</var></span>
                <div class="recommended-video-rating-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M313.4 32.9c26 5.2 42.9 30.5 37.7 56.5l-2.3 11.4c-5.3 26.7-15.1 52.1-28.8 75.2l144 0c26.5 0 48 21.5 48 48c0 18.5-10.5 34.6-25.9 42.6C497 275.4 504 288.9 504 304c0 23.4-16.8 42.9-38.9 47.1c4.4 7.3 6.9 15.8 6.9 24.9c0 21.3-13.9 39.4-33.1 45.6c.7 3.3 1.1 6.8 1.1 10.4c0 26.5-21.5 48-48 48l-97.5 0c-19 0-37.5-5.6-53.3-16.1l-38.5-25.7C176 420.4 160 390.4 160 358.3l0-38.3 0-48 0-24.9c0-29.2 13.3-56.7 36-75l7.4-5.9c26.5-21.2 44.6-51 51.2-84.2l2.3-11.4c5.2-26 30.5-42.9 56.5-37.7zM32 192l64 0c17.7 0 32 14.3 32 32l0 224c0 17.7-14.3 32-32 32l-64 0c-17.7 0-32-14.3-32-32L0 224c0-17.7 14.3-32 32-32z"/></svg>
                  <var class="recommended-video-rating">${getRating(video.Likes, video.Dislikes)}</var>
                </div>
              </div>
            </div>`;
            videoList.appendChild(li);
          }
        });
        previewImages();
        if (data.length < 12) {
          for (let i = 0; i < 12 - data.length; i++) {
            videoList.removeChild(videoList.lastElementChild);
          }
        }
      });
    } else {
      alert('Error loading videos');
      location.reload();
    }
  }).catch(() => {
    alert('Error loading videos');
    location.reload();
  });

  const pageWrapper = document.getElementById("page-wrapper");
  const count = 62;
  if (count > 62) {
    const previousPage = document.createElement("li");
    previousPage.id = "previous-page";
    if (page === 1) {
      previousPage.classList.add("disabled");
    }
    previousPage.innerHTML = `
      <a href="?page=${page - 1}"><b>Prev</b></a>
    `;
    pageWrapper.appendChild(previousPage);
    const firstPage = document.createElement("li");
    firstPage.classList.add("page-number");
    if (page === 1) {
      firstPage.innerHTML = `
        <span>1</span>
      `;
    } else {
      firstPage.innerHTML = `
        <a href="?page=1">1</a>
      `;
    }
    pageWrapper.appendChild(firstPage);
    for (let i = Math.max(2, page - 3); i <= Math.min(Math.ceil(count / 62) - 1, page + 3); i++) {
      const item = document.createElement("li");
      item.classList.add("page-number");
      if (i === page) {
        item.innerHTML = `
          <span>${i}</span>
        `;
      } else {
        item.innerHTML = `
          <a href="?page=${i}">${i}</a>
        `;
      }
      pageWrapper.appendChild(item);
    }
    const lastPage = document.createElement("li");
    lastPage.classList.add("page-number");
    if (page === Math.ceil(count / 62)) {
      lastPage.innerHTML = `
        <span>${Math.ceil(count / 62)}</span>
      `;
    } else {
      lastPage.innerHTML = `
        <a href="?page=${Math.ceil(count / 62)}">${Math.ceil(count / 62)}</a>
      `;
    }
    pageWrapper.appendChild(lastPage);
    const nextPage = document.createElement("li");
    nextPage.id = "next-page";
    if (page === Math.ceil(count / 62)) {
      nextPage.classList.add("disabled");
    }
    nextPage.innerHTML = `
      <a href="?page=${page + 1}"><b>Next</b></a>
    `;
    pageWrapper.appendChild(nextPage);
  }
  
});

const getViews = (viewNumber) => {
  if (viewNumber >= 100000000000) {
    return `${(viewNumber / 1000000000).toFixed(0)}B v`;
  } else if (viewNumber >= 1000000000) {
    return `${(viewNumber / 1000000000).toFixed(1)}B views`;
  } else if (viewNumber >= 100000000) {
    return `${(viewNumber / 1000000).toFixed(0)}M views`;
  } else if (viewNumber >= 1000000) {
    return `${(viewNumber / 1000000).toFixed(1)}M views`;
  } else if (viewNumber >= 100000) {
    return `${(viewNumber / 1000).toFixed(0)}K views`;
  } else if (viewNumber >= 1000) {
    return `${(viewNumber / 1000).toFixed(1)}K views`;
  } else if (viewNumber === 1) {
    return `1 view`;
  } else {
    return `${viewNumber} views`;
  }
}

const getRating = (likeNumber, dislikeNumber) => {
  const totalLikesDislikes = likeNumber + dislikeNumber;
  if (totalLikesDislikes === 0) {
    return "0%";
  } else {
    return `${(likeNumber / totalLikesDislikes * 100).toFixed(0)}%`;
  }
}

const getDuration = (durationNumber) => {
  return Math.floor(durationNumber / 60) + ":" + String(durationNumber % 60).padStart(2, '0');
}

const openAvatarProfile = (e) => {
  e.firstElementChild.nextElementSibling.click();
}
