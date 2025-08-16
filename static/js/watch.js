document.addEventListener("DOMContentLoaded", () => {
  const recommendedVideoCount = 12;

  const likeButton = document.getElementById("like-button");
  const dislikeButton = document.getElementById("dislike-button");
  const favoriteButton = document.getElementById("favorite-button");
  let reaction = likeButton.dataset.active;
  let favorited = favoriteButton.dataset.active;
  if (reaction === "like") {
    likeButton.classList.add("active");
  } else if (reaction === "dislike") {
    dislikeButton.classList.add("active");
  }
  if (favorited === "1") {
    favoriteButton.classList.add("active");
  }

  if (!CSS.supports("aspect-ratio", "16 / 9")) {
    document.getElementById('video').className = 'old';
  }

  let commented = false;
  let replied = {};
  let commentPage = 1;

  const videoData = document.getElementById("video-data").dataset;

  const compressNumber = (number) => {
    if (number >= 100000000000) {
      return `${(number / 1000000000).toFixed(0)}B`;
    } else if (number >= 1000000000) {
      return `${(number / 1000000000).toFixed(1)}B`;
    } else if (number >= 100000000) {
      return `${(number / 1000000).toFixed(0)}M`;
    } else if (number >= 1000000) {
      return `${(number / 1000000).toFixed(1)}M`;
    } else if (number >= 100000) {
      return `${(number / 1000).toFixed(0)}K`;
    } else if (number >= 1000) {
      return `${(number / 1000).toFixed(1)}K`;
    } else if (number === 1) {
      return '1';
    } else {
      return `${number}`;
    }
  }
  const parseViews = (viewCount) => {
    if (viewCount === '1') return `${viewCount} View`;
    return `${viewCount} Views`;
  }
  const calcRating = (likes, dislikes) => {
    const total = likes + dislikes;
    if (total === 0) {
      return "0%";
    } else {
      return `${(likes / total * 100).toFixed(0)}%`;
    }
  }
  const likeCountEl = document.getElementById('likes');
  let likeCount;
  const dislikeCountEl = document.getElementById('dislikes');
  let dislikeCount;
  const ratingEl = document.getElementById('rating');
  const favoriteCountEl = document.getElementById('favorites');
  let favoriteCount;
  const commentCountEl = document.getElementById('commentcount');
  let commentCount;
  const recalcLikes = () => {
    likeCountEl.textContent = compressNumber(likeCount);
    dislikeCountEl.textContent = compressNumber(dislikeCount);
  }
  const recalcRating = () => {
    ratingEl.textContent = calcRating(likeCount, dislikeCount);
  }
  const recalcFavorites = () => {
    favoriteCountEl.textContent = compressNumber(favoriteCount);
  }
  const recalcComments = () => {
    commentCountEl.textContent = `All Comments (${commentCount})`;
  }
  (async () => {
    likeCount = parseInt(likeCountEl.dataset.count);
    dislikeCount = parseInt(dislikeCountEl.dataset.count);
    favoriteCount = parseInt(favoriteCountEl.dataset.count);
    commentCount = parseInt(commentCountEl.dataset.count);
  })();

  let recommendedPage = 1;
  
  const uid = params.get("v");

  let hash;

  fetch(`/api/watch/${videoData.id}`, {
    method: "GET"
  }).then(response => response.json()).then(result => {
    hash = result.hash;
    fetch(`/api/watch/${videoData.id}`, {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ hash: hash })
    });
  });
  
  const logged = document.getElementById("top-profile") !== null;
  likeButton.addEventListener("click", () => {
    if (logged) {
      if (reaction === "like") {
        fetch(`/like/${videoData.id}`, {
          method: "DELETE"
        }).then((response) => {
          if (response.status === 204) {
            reaction = "";
            likeCount--;
            likeButton.classList.remove("active");
          }
          recalcLikes();
          recalcRating();
        }).catch(() => {
          window.alert("Error with video like. Try reloading/relogging.");
        });
      } else if (reaction === "dislike") {
        fetch(`/like/${videoData.id}`, {
          method: "PUT"
          }).then((response) => {
            if (response.status === 204) {
              reaction = "like";
              likeCount++;
              dislikeCount--;
              likeButton.classList.add("active");
              dislikeButton.classList.remove("active");
            }
            recalcLikes();
            recalcRating();
          }).catch(() => {
            window.alert("Error with video like. Try reloading/relogging.");
          });
      } else {
        fetch(`/like/${videoData.id}`, {
          method: "POST"
        }).then((response) => {
          if (response.status === 201) {
            reaction = "like";
            likeCount++;
            likeButton.classList.add("active");
          }
          recalcLikes();
          recalcRating();
        }).catch(() => {
          window.alert("Error with video like. Try reloading/relogging.");
        });
      }
    } else {
      if (reaction === "like") {
        reaction = "";
        likeCount--;
        likeButton.classList.remove("active");
      } else if (reaction === "dislike") {
        reaction = "like";
        likeCount++;
        dislikeCount--;
        likeButton.classList.add("active");
        dislikeButton.classList.remove("active");
      } else {
        reaction = "like";
        likeCount++;
        likeButton.classList.add("active");
      }
      recalcLikes();
      recalcRating();
    }
  });
  dislikeButton.addEventListener("click", () => {
    if (logged) {
      if (reaction === "dislike") {
        fetch(`/dislike/${videoData.id}`, {
          method: "DELETE"
        }).then((response) => {
          if (response.status === 204) {
            reaction = "";
            dislikeCount--;
            dislikeButton.classList.remove("active");
          }
          recalcLikes();
          recalcRating();
        }).catch(() => {
          window.alert("Error with video dislike. Try reloading/relogging.");
        });
      } else if (reaction === "like") {
        fetch(`/dislike/${videoData.id}`, {
          method: "PUT"
          }).then((response) => {
            if (response.status === 204) {
              reaction = "dislike";
              likeCount--;
              dislikeCount++;
              likeButton.classList.remove("active");
              dislikeButton.classList.add("active");
            }
            recalcLikes();
            recalcRating();
          }).catch(() => {
            window.alert("Error with video dislike. Try reloading/relogging.");
          });
      } else {
        fetch(`/dislike/${videoData.id}`, {
          method: "POST"
        }).then((response) => {
          if (response.status === 201) {
            reaction = "dislike";
            dislikeCount++;
            dislikeButton.classList.add("active");
          }
          recalcLikes();
          recalcRating();
        }).catch(() => {
          window.alert("Error with video dislike. Try reloading/relogging.");
        });
      }
    } else {
      if (reaction === "dislike") {
        reaction = "";
        dislikeCount--;
        dislikeButton.classList.remove("active");
      } else if (reaction === "like") {
        reaction = "dislike";
        likeCount--;
        dislikeCount++;
        dislikeButton.classList.add("active");
        likeButton.classList.remove("active");
      } else {
        reaction = "dislike";
        dislikeCount++;
        dislikeButton.classList.add("active");
      }
      recalcLikes();
      recalcRating();
    }
  });
  favoriteButton.addEventListener("click", () => {
    if (logged) {
      if (favorited === "0") {
        fetch(`/favorite/${videoData.id}`, {
          method: "POST"
        }).then((response) => {
          if (response.status === 201) {
            favoriteCount++;
            favorited = "1";
            favoriteButton.classList.add("active");
          }
          recalcFavorites();
        }).catch((err) => {
          window.alert("Error with video favorite. Try reloading/relogging.");
        });
      } else if (favorited === "1") {
        fetch(`/favorite/${videoData.id}`, {
          method: "DELETE"
        }).then((response) => {
          if (response.status === 204) {
            favoriteCount--;
            favorited = "0";
            favoriteButton.classList.remove("active");
          }
          recalcFavorites();
        }).catch(() => {
          window.alert("Error with video favorite. Try reloading/relogging.");
        });
      } else {
        fetch(`/favorite/${videoData.id}`, {
          method: "POST"
        }).then((response) => {
          if (response.status === 201) {
            favoriteCount++;
            favorited = "1";
            favoriteButton.classList.add("active");
          }
          recalcFavorites();
        }).catch(() => {
          window.alert("Error with video favorite. Try reloading/relogging.");
        });
      }
    } else {
      if (favorited === "0") {
        favorited = "1";
        favoriteCount++;
        favoriteButton.classList.add("active");
      } else if (favorited === "1") {
        favorited = "0";
        favoriteCount++;
        favoriteButton.classList.remove("active");
      } else {
        favorited = "1";
        favoriteCount++;
        favoriteButton.classList.add("active");
      }
      recalcFavorites();
    }
  });

  const reportButton = document.getElementById("report-button");
  reportButton.addEventListener("click", () => {
    const container = document.createElement('div');
    container.id = "sign-box-div";
    container.innerHTML = `
    <div id="sign-box-container" class="fade-in background-darken">
      <div id="signup-box">
        <div class="main-sign-box">
          <button class="close-modal" onclick="closeModal(this)"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg></button>
          <span style="float: left; margin-left: 15px; font-size: 18px; bottom: 6px; position: relative;">Report this video</span>
          <span style="float: left; margin-left: 15px; text-align: left; font-size: 16px; line-height: 20px; font-weight: normal; color: #ababb3; margin-bottom: 10px;">Thank you for helping us keep the site safe. Reporting content is anonymous, so other users won't know who reported it. Tell us why you would like to report this content:</span>
        </div>
        <div class="body-sign-box clearfix">
          <form autocomplete="off" method="post" action="/report/${uid}">
            <div id="copyright" class="report-reason">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z"/></svg>
              <span>Copyright Concern</span>
            </div>
            <div id="legal" class="report-reason">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z"/></svg>
              <span>Legal Concern</span>
            </div>
            <div id="minor" class="report-reason">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z"/></svg>
              <span>May feature a Minor</span>
            </div>
            <div id="consent" class="report-reason">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z"/></svg>
              <span>Non-Consensual Acts</span>
            </div>
            <div id="spam" class="report-reason">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z"/></svg>
              <span>Spam or Misleading Content</span>
            </div>
            <div id="inappropriate" class="report-reason">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z"/></svg>
              <span>Otherwise Inappropriate</span>
            </div>
            <div id="report-extra">
              Tell us why you believe this content violates our terms of service or is otherwise inappropriate by providing additional detail(s).
            </div>
            <div>
              <textarea id="report-text" name="report-text" maxlength=500></textarea>
            </div>
            <div>
              <input id="submit-report" type="submit" value="Submit" disabled>
            </div>
          </form>
        </div>
      </div>
    </div>`;
    document.body.appendChild(container);
    const reportReasons = document.getElementsByClassName("report-reason");
    for (let i = 0; i < reportReasons.length; ++i) {
      reportReasons[i].addEventListener("click", () => {
        if (reportReasons[i].classList.contains("active")) {
          reportReasons[i].firstElementChild.innerHTML = '<!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z"/>'
          reportReasons[i].classList.remove("active");
        } else {
          for (let j = 0; j < reportReasons.length; ++j) {
            reportReasons[j].firstElementChild.innerHTML = '<!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M464 256A208 208 0 1 0 48 256a208 208 0 1 0 416 0zM0 256a256 256 0 1 1 512 0A256 256 0 1 1 0 256z"/>';
            reportReasons[j].classList.remove("active");
          }
          reportReasons[i].firstElementChild.innerHTML = '<!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512z"/>';
          reportReasons[i].classList.add("active");
        }
      });
    }
    const submitReport = document.getElementById('submit-report');
    submitReport.addEventListener('click', (event) => {
      event.preventDefault();
      for (let i = 0; i < reportReasons.length; ++i) {
        if (reportReasons[i].classList.contains("active")) {
          const reportText = document.getElementById('report-text');
          const reportReason = reportReasons[i].id;
          fetch(`/report/${uid}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              text: reportText.value,
              reason: reportReason
            })
          }).then((response) => {
            if (response.status === 201) {
              window.alert("Report submitted. Thank you for helping us keep the site safe.");
              const signBox = document.getElementById('sign-box-div');
              signBox.remove();
            } else {
              window.alert("Error submitting report.");
              location.reload();
            }
          }).catch(() => {
            window.alert("Error submitting report.");
            location.reload();
          });
          return;
        }
      }
    });
  });

  window.addEventListener('keyup', () => {
    const signBox = document.getElementById('signup-box');
    if (signBox && !signBox.nextElementSibling) {
      const reportText = document.getElementById('report-text');
      const submitReport = document.getElementById('submit-report');
      const reportReasons = document.getElementsByClassName("report-reason");
      let active = false;
      for (let i = 0; i < reportReasons.length; ++i) {
        if (reportReasons[i].classList.contains("active")) {
          active = true;
          break;
        }
      }
      if (active && reportText.value.length > 0) {
        submitReport.disabled = false;
      } else {
        submitReport.disabled = true;
      }
    }
  });

  window.addEventListener('click', () => {
    const signBox = document.getElementById('signup-box');
    if (signBox && !signBox.nextElementSibling) {
      const reportText = document.getElementById('report-text');
      const submitReport = document.getElementById('submit-report');
      const reportReasons = document.getElementsByClassName("report-reason");
      let active = false;
      for (let i = 0; i < reportReasons.length; ++i) {
        if (reportReasons[i].classList.contains("active")) {
          active = true;
          break;
        }
      }
      if (active && reportText.value.length > 0) {
        submitReport.disabled = false;
      } else {
        submitReport.disabled = true;
      }
    }
  });

  const creatorPic = document.getElementById('creator-pic').firstElementChild;
  creatorPic.addEventListener('error', () => {
    creatorPic.src = "/images/DefaultPP250p.jpg";
  });
  creatorPic.addEventListener('click', () => {
    window.location.href = `/profile/${videoData.username}/videos`;
  });

  const creatorSubscribers = document.getElementById('creator-subscribers');
  const creatorSubscribersCount = parseInt(creatorSubscribers.innerHTML);
  if (creatorSubscribersCount >= 1000000000) {
    creatorSubscribers.innerHTML = `${(creatorSubscribersCount / 1000000000).toFixed(0)}B Subscribers`;
  } else if (creatorSubscribersCount >= 10000000) {
    creatorSubscribers.innerHTML = `${(creatorSubscribersCount / 1000000).toFixed(1)}M Subscribers`;
  } else if (creatorSubscribersCount >= 1000000) {
    creatorSubscribers.innerHTML = `${(creatorSubscribersCount / 1000000).toFixed(0)}M Subscribers`;
  } else if (creatorSubscribersCount >= 10000) {
    creatorSubscribers.innerHTML = `${(creatorSubscribersCount / 1000).toFixed(1)}K Subscribers`;
  } else if (creatorSubscribersCount >= 1000) {
    creatorSubscribers.innerHTML = `${(creatorSubscribersCount / 1000).toFixed(0)}K Subscribers`;
  } else if (creatorSubscribersCount === 1) {
    creatorSubscribers.innerHTML = '1 Subscriber';
  } else {
    creatorSubscribers.innerHTML = `${creatorSubscribersCount} Subscribers`;
  }

  let detailsOpened = false;
  const detailsButton = document.getElementById('more-details');
  const detailsWrapper = document.getElementById('details-wrapper');
  let categoryViewCounts = Cookies.get('categoryViewCounts');
  const decayFactor = 0.1;
  if (categoryViewCounts) {
    categoryViewCounts = JSON.parse(categoryViewCounts);
    for (let key in categoryViewCounts) {
      categoryViewCounts[key] = Math.round((categoryViewCounts[key] * (1 - decayFactor)) * 100) / 100;
    }
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
    for (let key in categoryViewCounts) {
      categoryViewCounts[key] = Math.round((categoryViewCounts[key] * (1 - decayFactor)) * 100) / 100;
    }
  }
  let topCategories = Object.keys(categoryViewCounts).sort((a, b) => categoryViewCounts[b] - categoryViewCounts[a]).slice(0, 5).map(Number);
  let relatedTopCategories = topCategories;
  const categoriesWrapper = document.getElementById("categories");
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
  function genSeed(seed) {
    return function() {
      let t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296; // Generates a float between 0 and 1
    }
  }
  // TODO: Refactor this logic. Join multiple queries (multi-part query).
  const categories = videoData.categories.split(',').map(category => parseInt(category));
  const categoryPromises = categories.map(async category => {
    const categoryName = videoCategoryKeys[category];
    const categoryA = document.createElement('a');
    categoryA.href = `/videos?c=${category}`;
    categoryA.textContent = categoryName;
    categoriesWrapper.appendChild(categoryA);
    categoryViewCounts[category] += 1;
  });
  Promise.allSettled(categoryPromises).then(_ => {
    topCategories = Object.keys(categoryViewCounts).sort((a, b) => categoryViewCounts[b] - categoryViewCounts[a]).slice(0, 5).map(Number);
    const seedValue = videoData.id || 1;
    const seededRandom = genSeed(seedValue);
    let relatedTopCategories = [];
    const fixedTopCount = 2;
    const totalNeeded = 5;
    const allUserViewedCatIds = Object.keys(categoryViewCounts).map(Number);
    const sortedCategoryIds = allUserViewedCatIds.filter(userViewedCatId => categories.includes(userViewedCatId)).sort((a, b) => categoryViewCounts[b] - categoryViewCounts[a]);
    relatedTopCategories.push(...sortedCategoryIds.slice(0, fixedTopCount));
    const remainingCommonPool = sortedCategoryIds.slice(fixedTopCount);
    if (relatedTopCategories.length < totalNeeded && remainingCommonPool.length) {
      const shuffledRemainingPool = remainingCommonPool.sort(() => seededRandom() - 0.5);
      relatedTopCategories.push(...shuffledRemainingPool.slice(0, totalNeeded - relatedTopCategories.length));
    }
    if (relatedTopCategories.length === totalNeeded) {
      const isForbiddenCombination = topCategories.length === totalNeeded && relatedTopCategories.every((val, index) => val === topCategories[index]);
      if (isForbiddenCombination) {
        relatedTopCategories.splice(3, 1);
      }
    }
    populateRecommendedVideos(relatedTopCategories);
    if (!isSmall) {
      populateSideVideos().then(previewImages());
    }
    Cookies.set('categoryViewCounts', JSON.stringify(categoryViewCounts));
  });

  const recommendedVideos = [];

  const populateRecommendedVideos = (relatedTopCategories) => {
    return new Promise((resolve, reject) => {
      const recommendedVideoWrapper = document.getElementById("recommended-videos");
      if (recommendedVideos.length < recommendedPage * recommendedVideoCount) {
        fetch(`/api/video/recommended?page=${recommendedPage}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ categoryViewCounts: categoryViewCounts, count: recommendedVideoCount, from: 'watch', topCategories: relatedTopCategories, videouid: videoData.id })
        }).then(response => {
          if (response.status === 200) {
            response.json().then((data) => {
              recommendedVideoWrapper.innerHTML = '';
              data.forEach(video => {
                recommendedVideos.push(video);
                const li = document.createElement('li');
                li.innerHTML = `
                  <div class="recommended-video-thumbnail-wrapper">
                    ${!video.Embed ? '<div class="preview-progress-bar"></div>' : ''}
                    <a href="/watch?v=${video.VideoUID}">
                      ${video.Embed ? `<img loading="lazy" class="recommended-video-thumbnail" src="${video.OriginalTitle}" alt="${video.Title}" onerror="this.onerror=null;this.src='/images/Processing.png';this.dataset.preview='/images/Processing.png';this.dataset.img='/images/Processing.png';">` : `<img loading="lazy" class="recommended-video-thumbnail video-preview" src="https://${STREAM_HOSTNAME}.b-cdn.net/${video.VideoUID}/thumbnail_small.webp?${video.ThumbChanges}" alt="${video.Title}" data-img="https://${STREAM_HOSTNAME}.b-cdn.net/${video.VideoUID}/thumbnail_small.webp?${video.ThumbChanges}" data-preview="https://${STREAM_HOSTNAME}.b-cdn.net/${video.VideoUID}/preview.webp" onerror="this.onerror=null;this.src='/images/Processing.png';this.dataset.preview='/images/Processing.png';this.dataset.img='/images/Processing.png';">`}
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
                      <img loading="lazy" class="recommended-video-avatar" src="${video.PP ? `https://sanctum.b-cdn.net/pp/${video.PP}.webp` : "/images/DefaultPP250p.jpg"}" alt="${video.Displayname || video.Username}'s Avatar"></img>
                      <a href="/profile/${video.Username}/videos" title="${video.Displayname || video.Username}">${video.Displayname || video.Username}</a>
                    </span>
                    <div class="recommended-video-details-wrapper">
                      <span class="recommended-video-views"><var>${getViews(video.Views)}</var></span>
                      <div class="recommended-video-rating-wrapper">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M313.4 32.9c26 5.2 42.9 30.5 37.7 56.5l-2.3 11.4c-5.3 26.7-15.1 52.1-28.8 75.2l144 0c26.5 0 48 21.5 48 48c0 18.5-10.5 34.6-25.9 42.6C497 275.4 504 288.9 504 304c0 23.4-16.8 42.9-38.9 47.1c4.4 7.3 6.9 15.8 6.9 24.9c0 21.3-13.9 39.4-33.1 45.6c.7 3.3 1.1 6.8 1.1 10.4c0 26.5-21.5 48-48 48l-97.5 0c-19 0-37.5-5.6-53.3-16.1l-38.5-25.7C176 420.4 160 390.4 160 358.3l0-38.3 0-48 0-24.9c0-29.2 13.3-56.7 36-75l7.4-5.9c26.5-21.2 44.6-51 51.2-84.2l2.3-11.4c5.2-26 30.5-42.9 56.5-37.7zM32 192l64 0c17.7 0 32 14.3 32 32l0 224c0 17.7-14.3 32-32 32l-64 0c-17.7 0-32-14.3-32-32L0 224c0-17.7 14.3-32 32-32z"/></svg>
                        <var class="recommended-video-rating">${getRating(video.Likes, video.Dislikes)}</var>
                      </div>
                    </div>
                  </div>
                `;
                recommendedVideoWrapper.appendChild(li);
              });
              previewImages();
              if (data.length < recommendedVideoCount) {
                resolve("end");
              } else {
                resolve();
              }
            });
          } else {
            reject();
          }
        }).catch(() => {
          reject();
        });
      } else {
        recommendedVideoWrapper.innerHTML = '';
        for (let i = (recommendedPage - 1) * recommendedVideoCount; i < recommendedPage * recommendedVideoCount; i++) {
          const video = recommendedVideos[i];
          const li = document.createElement('li');
          li.innerHTML = `
            <div class="recommended-video-thumbnail-wrapper">
              ${!video.Embed ? '<div class="preview-progress-bar"></div>' : ''}
              <a href="/watch?v=${video.VideoUID}">
                ${video.Embed ? `<img loading="lazy" class="recommended-video-thumbnail" src="${video.OriginalTitle}" alt="${video.Title}" onerror="this.onerror=null;this.src='/images/Processing.png';this.dataset.preview='/images/Processing.png';this.dataset.img='/images/Processing.png';">` : `<img loading="lazy" class="recommended-video-thumbnail video-preview" src="https://${STREAM_HOSTNAME}.b-cdn.net/${video.VideoUID}/thumbnail_small.webp?${video.ThumbChanges}" alt="${video.Title}" data-img="https://${STREAM_HOSTNAME}.b-cdn.net/${video.VideoUID}/thumbnail_small.webp?${video.ThumbChanges}" data-preview="https://${STREAM_HOSTNAME}.b-cdn.net/${video.VideoUID}/preview.webp" onerror="this.onerror=null;this.src='/images/Processing.png';this.dataset.preview='/images/Processing.png';this.dataset.img='/images/Processing.png';">`}
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
                <img loading="lazy" class="recommended-video-avatar" src="https://sanctum.b-cdn.net/pp/${video.PP}.webp" alt="${video.Displayname || video.Username}'s Avatar"></img>
                <a href="/profile/${video.Username}/videos" title="${video.Displayname || video.Username}">${video.Displayname || video.Username}</a>
              </span>
              <div class="recommended-video-details-wrapper">
                <span class="recommended-video-views"><var>${getViews(video.Views)}</var></span>
                <div class="recommended-video-rating-wrapper">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M313.4 32.9c26 5.2 42.9 30.5 37.7 56.5l-2.3 11.4c-5.3 26.7-15.1 52.1-28.8 75.2l144 0c26.5 0 48 21.5 48 48c0 18.5-10.5 34.6-25.9 42.6C497 275.4 504 288.9 504 304c0 23.4-16.8 42.9-38.9 47.1c4.4 7.3 6.9 15.8 6.9 24.9c0 21.3-13.9 39.4-33.1 45.6c.7 3.3 1.1 6.8 1.1 10.4c0 26.5-21.5 48-48 48l-97.5 0c-19 0-37.5-5.6-53.3-16.1l-38.5-25.7C176 420.4 160 390.4 160 358.3l0-38.3 0-48 0-24.9c0-29.2 13.3-56.7 36-75l7.4-5.9c26.5-21.2 44.6-51 51.2-84.2l2.3-11.4c5.2-26 30.5-42.9 56.5-37.7zM32 192l64 0c17.7 0 32 14.3 32 32l0 224c0 17.7-14.3 32-32 32l-64 0c-17.7 0-32-14.3-32-32L0 224c0-17.7 14.3-32 32-32z"/></svg>
                  <var class="recommended-video-rating">${getRating(video.Likes, video.Dislikes)}</var>
                </div>
              </div>
            </div>
          `;
          recommendedVideoWrapper.appendChild(li);
          previewImages();
        }
        resolve();
      }
    });
  }

  const populateSideVideos = () => {
    return new Promise((resolve, reject) => {
      const sideVideos = document.getElementById("side-videos");
      fetch(`/api/video/recommended?page=1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ categoryViewCounts: categoryViewCounts, count: 5, from: 'watch', topCategories: topCategories })
      }).then(response => {
        if (response.status === 200) {
          response.json().then((data) => {
            data.forEach(video => {
              const li = document.createElement('li');
              li.innerHTML = `
                <div class="recommended-video-thumbnail-wrapper">
                  ${!video.Embed ? '<div class="preview-progress-bar"></div>' : ''}
                  <a href="/watch?v=${video.VideoUID}">
                    ${video.Embed ? `<img loading="lazy" class="recommended-video-thumbnail" src="${video.OriginalTitle}" alt="${video.Title}" onerror="this.onerror=null;this.src='/images/Processing.png';this.dataset.preview='/images/Processing.png';this.dataset.img='/images/Processing.png';">` : `<img loading="lazy" class="recommended-video-thumbnail video-preview" src="https://${STREAM_HOSTNAME}.b-cdn.net/${video.VideoUID}/thumbnail_small.webp?${video.ThumbChanges}" alt="${video.Title}" data-img="https://${STREAM_HOSTNAME}.b-cdn.net/${video.VideoUID}/thumbnail_small.webp?${video.ThumbChanges}" data-preview="https://${STREAM_HOSTNAME}.b-cdn.net/${video.VideoUID}/preview.webp" onerror="this.onerror=null;this.src='/images/Processing.png';this.dataset.preview='/images/Processing.png';this.dataset.img='/images/Processing.png';">`}
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
                    <img loading="lazy" class="recommended-video-avatar" src="${video.PP ? `https://sanctum.b-cdn.net/pp/${video.PP}.webp` : "/images/DefaultPP250p.jpg"}" alt="${video.Displayname || video.Username}'s Avatar"></img>
                    <a href="/profile/${video.Username}/videos" title="${video.Displayname || video.Username}">${video.Displayname || video.Username}</a>
                  </span>
                  <div class="recommended-video-details-wrapper">
                    <span class="recommended-video-views"><var>${getViews(video.Views)}</var></span>
                    <div class="recommended-video-rating-wrapper">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M313.4 32.9c26 5.2 42.9 30.5 37.7 56.5l-2.3 11.4c-5.3 26.7-15.1 52.1-28.8 75.2l144 0c26.5 0 48 21.5 48 48c0 18.5-10.5 34.6-25.9 42.6C497 275.4 504 288.9 504 304c0 23.4-16.8 42.9-38.9 47.1c4.4 7.3 6.9 15.8 6.9 24.9c0 21.3-13.9 39.4-33.1 45.6c.7 3.3 1.1 6.8 1.1 10.4c0 26.5-21.5 48-48 48l-97.5 0c-19 0-37.5-5.6-53.3-16.1l-38.5-25.7C176 420.4 160 390.4 160 358.3l0-38.3 0-48 0-24.9c0-29.2 13.3-56.7 36-75l7.4-5.9c26.5-21.2 44.6-51 51.2-84.2l2.3-11.4c5.2-26 30.5-42.9 56.5-37.7zM32 192l64 0c17.7 0 32 14.3 32 32l0 224c0 17.7-14.3 32-32 32l-64 0c-17.7 0-32-14.3-32-32L0 224c0-17.7 14.3-32 32-32z"/></svg>
                      <var class="recommended-video-rating">${getRating(video.Likes, video.Dislikes)}</var>
                    </div>
                  </div>
                </div>
              `;
              sideVideos.appendChild(li);
            });
            resolve();
          });
        } else {
          reject();
        }
      }).catch(() => {
        reject();
      });
    });
  }

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

  detailsButton.addEventListener('click', () => {
    if (!detailsOpened) {
      fetch(`/api/video/${videoData.id}/details`).then(response => {
        if (response.status === 200) {
          response.json().then((details) => {
            const tagList = detailsWrapper.firstElementChild;
            details.forEach(tag => {
              const tagA = document.createElement('a');
              tagA.href = `/videos?q=${tag.tag}`;
              tagA.innerHTML = tag.tag;
              tagList.appendChild(tagA);
            });
            const production = tagList.nextElementSibling;
            const productionA = document.createElement('a');
            const productionType = videoData.prod === "0" ? 'Professional' : 'Homemade';
            productionA.href = `/videos?p=${videoData.prod}`;
            productionA.innerHTML = productionType;
            production.appendChild(productionA);
            detailsOpened = true;
            detailsWrapper.classList.add('show');
            detailsWrapper.style.height = 'auto';
            const targetHeight = detailsWrapper.scrollHeight;
            detailsWrapper.style.height = '0px';
            void detailsWrapper.offsetHeight;
            requestAnimationFrame(() => {
              detailsWrapper.style.opacity = '1';
              detailsWrapper.style.height = targetHeight + 'px';
              detailsWrapper.style.transform = 'scale(1)';
              detailsButton.innerHTML = 'VIEW LESS';
            });
            detailsButton.innerHTML = 'VIEW LESS';
          });
        }
      }).catch(() => {
        alert("Error loading video details.");
        location.reload();
      });
    } else {
      if (detailsWrapper.classList.contains('show')) {
        detailsWrapper.classList.remove('show');
        detailsWrapper.style.opacity = '0';
        detailsWrapper.style.height = '0px';
        detailsWrapper.style.transform = 'scale(1, 0)';
        detailsButton.innerHTML = 'VIEW MORE';
      } else {
        detailsWrapper.classList.add('show');
        detailsWrapper.style.height = 'auto';
        const targetHeight = detailsWrapper.scrollHeight;
        detailsWrapper.style.height = '0px';
        void detailsWrapper.offsetHeight;
        requestAnimationFrame(() => {
          detailsWrapper.style.opacity = '1';
          detailsWrapper.style.height = targetHeight + 'px';
          detailsWrapper.style.transform = 'scale(1)';
          detailsButton.innerHTML = 'VIEW LESS';
        });
      }
    }
  });

  const recommendedButtonWrapper = document.getElementById('recommended-buttons');
  const recommendedButtonLeft = recommendedButtonWrapper.firstElementChild;
  const recommendedButtonRight = recommendedButtonWrapper.lastElementChild;
  const recommendedButtonPage = recommendedButtonLeft.nextElementSibling;
  recommendedButtonLeft.addEventListener('click', () => {
    recommendedButtonLeft.disabled = true;
    recommendedPage--;
    recommendedButtonPage.innerHTML = recommendedPage;
    populateRecommendedVideos(relatedTopCategories).then(() => {
      if (recommendedPage > 1) {
        recommendedButtonLeft.disabled = false;
      }
      recommendedButtonRight.disabled = false;
    }).catch(() => {
      alert("Error loading recommended videos.");
      location.reload();
    });
  });
  recommendedButtonRight.addEventListener('click', () => {
    recommendedButtonLeft.disabled = false;
    recommendedButtonRight.disabled = true;
    recommendedPage++;
    recommendedButtonPage.innerHTML = recommendedPage;
    populateRecommendedVideos(relatedTopCategories).then((res) => {
      if (res === "end") {
        recommendedButtonRight.disabled = true;
      } else {
        if (recommendedPage > 8) {
          recommendedButtonRight.disabled = true;
        } else {
          recommendedButtonRight.disabled = false;
        }
      }
    }).catch(() => {
      alert("Error loading recommended videos.");
      location.reload(); 
    });
  });

  const commentWrapper = document.getElementById('comment-wrapper');
  const commentHeader = commentWrapper.firstElementChild;
  const commentSection = commentHeader.nextElementSibling;
  const username = document.getElementById('user-data').dataset.username;
  let pp;
  if (logged) {
    pp = document.getElementById("top-profile-pic").src;
  }
  fetch(`/api/video/${videoData.id}/comments`).then(response => {
    if (response.status === 200) {
      response.json().then((data) => {
        if (logged) {
          const commentBlock = document.createElement('div');
          commentBlock.id = "comment-block";
          commentBlock.innerHTML = `
            <div>
              <a>
                <img loading="lazy" width="60px" height="60px" src=${document.getElementById("top-profile-pic").src}>
              </a>
            </div>
            <form id="main-comment-form" action="/api/video/${videoData.id}/comments" method="post" autocomplete="off">
              <div id="main-comment-textarea">
                <div class="tail"></div>
                <textarea name="comment" placeholder="Share your opinion" maxlength="500"></textarea>
              </div>
              <button class="comment-button" disabled>Comment</button>
            </form>
          `;
          const mainCommentForm = commentBlock.lastElementChild;
          const textArea = mainCommentForm.firstElementChild.lastElementChild;
          const commentButton = mainCommentForm.lastElementChild;
          textArea.addEventListener('input', () => {
            textArea.style.height = textArea.scrollHeight + "px";
            if (textArea.value.length > 0) {
              commentButton.disabled = false;
            } else {
              commentButton.disabled = true;
            }
          });
          mainCommentForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (!commented) {
              fetch(mainCommentForm.action, {
                method: "POST",
                headers: {
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ comment: textArea.value.trim().replace(/\s+/g, ' '), hash: hash })
              }).then(response => {
                if (response.status === 201) {
                  commented = true;
                  newComment(textArea.value);
                  textArea.value = "";
                  commentButton.disabled = true;
                } else {
                  alert("Error posting comment.");
                  location.reload();
                }
              }).catch(() => {
                alert("Error posting comment.");
                location.reload();
              });
            } else {
              newComment(textArea.value);
              textArea.value = "";
              commentButton.disabled = true;
            }
          });
          commentHeader.appendChild(commentBlock);
        }
        data.forEach(comment => {
          const commentDiv = document.createElement('div');
          commentDiv.classList.add('comment');
          // TODO: Check if I need to wrap inside another div (removed because I think it's unneeded)
          const commentMeta = document.createElement('div');
          commentDiv.appendChild(commentMeta);
          const commentAvatar = document.createElement('div');
          commentAvatar.className = 'comment-avatar';
          commentMeta.appendChild(commentAvatar);
          const commentProfile = document.createElement('a');
          commentProfile.rel = 'nofollow';
          commentProfile.href = `/profile/${comment.username}`;
          commentAvatar.appendChild(commentProfile);
          const commentPicture = document.createElement('img');
          commentPicture.loading = 'lazy';
          commentPicture.src = comment.pp ? `https://sanctum.b-cdn.net/pp/${comment.pp}.webp` : "/images/DefaultPP250p.jpg";
          commentPicture.width = '40px';
          commentPicture.height = '40px';
          commentPicture.title = comment.displayname || comment.username;
          commentProfile.appendChild(commentPicture);
          const commentUsername = document.createElement('div');
          commentUsername.className = 'comment-username';
          commentMeta.appendChild(commentUsername);
          const commentUsernameLink = document.createElement('a');
          commentUsernameLink.rel = 'nofollow';
          commentUsernameLink.href = `/profile/${comment.username}`;
          commentUsernameLink.title = comment.displayname || comment.username;
          commentUsernameLink.textContent = comment.displayname || comment.username;
          commentUsername.appendChild(commentUsernameLink);
          const commentDate = document.createElement('div');
          commentDate.className = 'comment-date';
          commentDate.textContent = formatDateTimeAgo(comment.datetime);
          commentMeta.appendChild(commentDate);
          const commentMessage = document.createElement('div');
          commentMessage.className = 'comment-message';
          commentDiv.appendChild(commentMessage);
          const commentSpan = document.createElement('span');
          commentSpan.textContent = comment.comment;
          commentMessage.appendChild(commentSpan);
          if (logged) {
            const commentButtons = document.createElement('div');
            commentButtons.className = 'comment-buttons';
            commentButtons.innerHTML = `<button class="comment-reply" type="button" onclick="openReply(this)"><span>• Reply</span></button>`;
            const replyCommentBlock = document.createElement('div');
            replyCommentBlock.className = 'no-display';
            replyCommentBlock.innerHTML = `
              <div class="reply-comment-block">
                <div>
                  <a>
                    <img loading="lazy" width="60px" height="60px" src=${document.getElementById("top-profile-pic").src}>
                  </a>
                </div>
                <form class="reply-comment-form" action="/api/comments/${comment.commentid}" method="post" data-id="${comment.commentid}" autocomplete="off">
                  <div class="reply-comment-textarea">
                    <div class="tail"></div>
                    <textarea name="reply" placeholder="Share your opinion" maxlength="500" oninput="replyInput(this)"></textarea>
                  </div>
                  <button class="comment-button" disabled>Comment</button>
                </form>
              </div>`;
            commentMessage.appendChild(commentButtons);
            commentMessage.appendChild(replyCommentBlock);
          }
          const replyBlock = document.createElement('div');
          replyBlock.className = 'reply-block';
          commentMessage.appendChild(replyBlock);
          const replyButton = document.createElement('button');
          replyButton.type = 'button';
          replyButton.className = 'open-replies-button';
          replyButton.onclick = function() {
            openReplies(this, comment.commentid);
          }
          replyBlock.appendChild(replyButton);
          if (comment.replies) {
            const replySpan = document.createElement('span');
            replySpan.textContent = 'View All Replies';
            replyButton.appendChild(replySpan);
          }
          commentSection.appendChild(commentDiv);
        });

        if (logged) {
          const replyCommentForms = document.getElementsByClassName('reply-comment-form');
          for (let i = 0; i < replyCommentForms.length; i++) {
            replyCommentForms[i].addEventListener('submit', (e) => {
              e.preventDefault();
              const reply = replyCommentForms[i].firstElementChild.lastElementChild.value.trim().replace(/\s+/g, ' ');
              if (!replied[replyCommentForms[i].dataset.id]) {
                fetch(replyCommentForms[i].action, {
                  method: "POST",
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({ videouid: videoData.id, reply: reply, hash: hash })
                }).then(response => {
                  if (response.status === 201) {
                    replyCommentForms[i].firstElementChild.lastElementChild.value = "";
                    replyCommentForms[i].lastElementChild.disabled = true;
                    replied[replyCommentForms[i].dataset.id] = true;
                    replyCommentForms[i].parentElement.parentElement.previousElementSibling.firstElementChild.click();
                    newReply(replyCommentForms[i], reply);
                  } else {
                    alert("Error posting reply.");
                    location.reload();
                  }
                }).catch(() => {
                  alert("Error posting reply.");
                  location.reload();
                });
              } else {
                replyCommentForms[i].firstElementChild.lastElementChild.value = "";
                replyCommentForms[i].lastElementChild.disabled = true;
                replyCommentForms[i].parentElement.parentElement.previousElementSibling.firstElementChild.click();
                newReply(replyCommentForms[i], reply);
              }
            });
          }
        }
        // TODO For load more comments button when there are more than 10 comments
        // const loadMore = document.createElement('div');
        // loadMore.innerHTML = `
        //   <button id="load-more-comments"><i></i><span>LOAD MORE</span></button>
        // `;
        // loadmore.addEventListener('click', () => {
        // 
        // });
        // commentSection.appendChild(loadMore);
      });
    } else {
      alert("Error loading comments.");
      location.reload();
    }
  }).catch(() => {
    alert("Error loading comments.");
    location.reload();
  });

  const newComment = (comment) => {
    const commentDiv = document.createElement('div');
    commentDiv.classList.add('comment');
    commentDiv.innerHTML = `
      <div>
        <div>
          <div class="comment-avatar">
            <a rel="nofollow" href="/profile/${username}">
              <img loading="lazy" src="${pp}" width="40px" height="40px" title="${username}">
            </a>
          </div>
          <div class="comment-username">
            <a rel="nofollow" href="/profile/${username}">${username}</a>
          </div>
          <div class="comment-date">Just now</div>
        </div>
        <div class="comment-message">
          <span>${comment}</span>
        </div>
      </div>
    `;
    commentCount++;
    recalcComments();
    commentSection.insertBefore(commentDiv, commentSection.firstElementChild);
  }

  const openReplies = (repliesButton, commentid) => {
    repliesButton.classList.add('no-display');
    const replyBlock = repliesButton.parentElement;
    fetch(`/api/comments/${commentid}`).then(response => {
      if (response.status === 200) {
        response.json().then(data => {
          const replies = document.createElement('div');
          replyBlock.insertBefore(replies, replyBlock.firstElementChild);
          if (data.length > 0) {
            data.forEach(reply => {
              const replyDiv = document.createElement('div');
              replyDiv.className = 'comment';
              // TODO: Check if I need to wrap inside another div (removed because I think it's unneeded)
              const commentMeta = document.createElement('div');
              replyDiv.appendChild(commentMeta);
              const commentAvatar = document.createElement('div');
              commentAvatar.className = 'comment-avatar';
              commentMeta.appendChild(commentAvatar);
              const commentProfile = document.createElement('a');
              commentProfile.rel = 'nofollow';
              commentProfile.href = `/profile/${reply.username}`;
              commentAvatar.appendChild(commentProfile);
              const commentPicture = document.createElement('img');
              commentPicture.loading = 'lazy';
              commentPicture.src = reply.pp ? `https://sanctum.b-cdn.net/pp/${reply.pp}.webp` : "/images/DefaultPP250p.jpg";
              commentPicture.width = '40px';
              commentPicture.height = '40px';
              commentPicture.title = reply.displayname || reply.username;
              commentProfile.appendChild(commentPicture);
              const commentUsername = document.createElement('div');
              commentUsername.className = 'comment-username';
              commentMeta.appendChild(commentUsername);
              const commentUsernameLink = document.createElement('a');
              commentUsernameLink.rel = 'nofollow';
              commentUsernameLink.href = `/profile/${reply.username}`;
              commentUsernameLink.title = reply.displayname || reply.username;
              commentUsernameLink.textContent = reply.displayname || reply.username;
              commentUsername.appendChild(commentUsernameLink);
              const commentDate = document.createElement('div');
              commentDate.className = 'comment-date';
              commentDate.textContent = formatDateTimeAgo(reply.datetime);
              commentMeta.appendChild(commentDate);
              const commentMessage = document.createElement('div');
              commentMessage.className = 'comment-message';
              replyDiv.appendChild(commentMessage);
              const commentSpan = document.createElement('span');
              commentSpan.textContent = reply.reply;
              commentMessage.appendChild(commentSpan);
              replies.appendChild(replyDiv);
              replyDiv.innerHTML = `
                <div>
                  <div>
                    <div class="comment-avatar">
                      <a rel="nofollow" href="/profile/${reply.username}">
                        <img loading="lazy" src="${reply.pp ? `https://sanctum.b-cdn.net/pp/${reply.pp}.webp` : "/images/DefaultPP250p.jpg"}" width="40px" height="40px" title="${reply.username}">
                      </a>
                    </div>
                    <div class="comment-username">
                      <a rel="nofollow" href="/profile/${reply.username}" title="${reply.displayname || reply.username}">${reply.displayname || reply.username}</a>
                    </div>
                    <div class="comment-date">${formatDateTimeAgo(reply.datetime)}</div>
                  </div>
                  <div class="comment-message">
                    <span>${reply.reply}</span>
                  </div>
                </div>`;
              replies.appendChild(replyDiv);
            });
            const closeRepliesButton = document.createElement('button');
            closeRepliesButton.classList.add('open-replies-button');
            closeRepliesButton.innerHTML = "<span>Close All Replies</span>";
            repliesButton.onclick = () => {
              closeRepliesButton.classList.remove('no-display');
              repliesButton.classList.add('no-display');
              closeRepliesButton.parentElement.firstElementChild.classList.remove('no-display');
            };
            closeRepliesButton.addEventListener('click', () => {
              closeRepliesButton.classList.add('no-display');
              repliesButton.classList.remove('no-display');
              closeRepliesButton.parentElement.firstElementChild.classList.add('no-display');
            });
            replyBlock.appendChild(closeRepliesButton);
          } else {
            const spacer = document.createElement('div');
            spacer.classList.add('reply-spacer');
            replyBlock.insertBefore(spacer, replyBlock.firstElementChild);
          }
        });
      } else {
        alert("Error loading replies.");
        location.reload();
      }
    }).catch(() => {
      alert("Error loading replies.");
      location.reload();
    });
  }

  const newReply = (form, reply) => {
    const replyBlock = form.parentElement.parentElement.nextElementSibling;
    const replyDiv = document.createElement('div');
    replyDiv.classList.add('comment');
    replyDiv.innerHTML = `
      <div>
        <div>
          <div class="comment-avatar">
            <a rel="nofollow" href="/profile/${username}">
              <img loading="lazy" src="${pp}" width="40px" height="40px" title="${username}">
            </a>
          </div>
          <div class="comment-username">
            <a rel="nofollow" href="/profile/${username}">${username}</a>
          </div>
          <div class="comment-date">Just now</div>
        </div>
        <div class="comment-message">
          <span>${reply}</span>
        </div>
      </div>`;
    commentCount++;
    recalcComments();
    replyBlock.insertBefore(replyDiv, replyBlock.firstElementChild);
  }

});

const openAvatarProfile = (e) => {
  e.firstElementChild.nextElementSibling.click();
}

const formatDateTimeAgo = (inputDate) => {
  const date = new Date(inputDate);
  const currentDate = new Date();
  const timeDifference = currentDate - date;
  const seconds = Math.floor(timeDifference / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 1) {
    return `${years} years ago`;
  }
  if (years === 1) {
    return `1 year ago`;
  }
  if (months > 1) {
    return `${months} months ago`;
  }
  if (months === 1) {
    return `1 month ago`;
  }
  if (weeks > 1) {
    return `${weeks} weeks ago`;
  }
  if (weeks === 1) {
    return `1 week ago`;
  }
  if (days > 1) {
    return `${days} days ago`;
  }
  if (days === 1) {
    return `1 day ago`;
  }
  if (hours > 1) {
    return `${hours} hours ago`;
  }
  if (hours === 1) {
    return `1 hour ago`;
  }
  if (minutes > 1) {
    return `${minutes} minutes ago`;
  }
  if (minutes === 1) {
    return `1 minute ago`;
  }
  if (seconds > 1) {
    return `${seconds} seconds ago`;
  }
  if (seconds === 1) {
    return `1 second ago`;
  }
  return `Just now`;
}

const openReply = (replyButton) => {
  const parent = replyButton.parentElement;
  if (parent.nextElementSibling.classList.contains('no-display')) {
    parent.nextElementSibling.classList.remove('no-display');
    replyButton.innerHTML = "<span>• Close</span>";
  } else {
    parent.nextElementSibling.classList.add('no-display');
    replyButton.innerHTML = "<span>• Reply</span>";
  }
}

const replyInput = (textArea) => {
  textArea.style.height = textArea.scrollHeight + "px";
  if (textArea.value.length > 0) {
    textArea.parentElement.parentElement.lastElementChild.disabled = false;
  } else {
    textArea.parentElement.parentElement.lastElementChild.disabled = true;
  }
}

const toggleWatchShare = (element, type) => {
  if (type === 'direct') {
    element.nextElementSibling.disabled = false;
    element.disabled = true;
    element.parentElement.nextElementSibling.firstElementChild.classList.remove('no-display');
    element.parentElement.nextElementSibling.lastElementChild.classList.add('no-display');
  } else if (type === 'embed') {
    element.previousElementSibling.disabled = false;
    element.disabled = true;
    element.parentElement.nextElementSibling.lastElementChild.classList.remove('no-display');
    element.parentElement.nextElementSibling.firstElementChild.classList.add('no-display');
  }
}

const copyWatchShare = (element) => {
  const directLink = element.previousElementSibling.firstElementChild;
  if (directLink.classList.contains('no-display')) {
  navigator.clipboard.writeText(directLink.nextElementSibling.firstElementChild.value);
  } else {
    navigator.clipboard.writeText(directLink.firstElementChild.value);
  }
}
