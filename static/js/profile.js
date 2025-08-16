let gal = '';

function subscribe(form) {
  form.action = `${form.action}?p=${encodeURIComponent(`${url.pathname}${url.search}`)}`;
  return true;
}

document.addEventListener("DOMContentLoaded", () => {

  const profileMenu = document.getElementById("profile-menu");
  if (window.location.href.endsWith("gallery/images") || window.location.href.endsWith("gallery/videos")) {
    profileMenu.children[2].classList.add("active");
    gal = document.getElementById("gallery-wrapper").innerHTML;
  } else if (window.location.pathname.endsWith("videos")) {
    profileMenu.children[0].classList.add("active");
  } else if (window.location.href.endsWith("about")) {
    profileMenu.children[1].classList.add("active");
  } else if (window.location.href.endsWith("gallery")) {
    profileMenu.children[2].classList.add("active");
  } else {
    profileMenu.children[0].classList.add("active");
  }
  const subCount = document.getElementById("subcount");
  if (subCount) {
    const count = parseInt(subCount.innerHTML);
    if (count >= 1000000000) {
      subCount.innerHTML = `${(count / 1000000000).toFixed(1)}B`;
    } else if (count >= 1000000) {
      subCount.innerHTML = `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      subCount.innerHTML = `${(count / 1000).toFixed(1)}K`;
    }
  }
  const description = document.getElementById("description");
  if (description) {
    if (description.innerHTML[0] === '\n') {
      description.innerHTML = description.innerHTML.slice(1);
    }
    if (description.innerHTML[description.innerHTML.length - 1] === '\n') {
      description.innerHTML = description.innerHTML.slice(0, -1);
    }
    description.innerHTML = description.innerHTML.split('\n').join('<br>');
  }

  const videoCount = document.getElementById("total-video-count");
  if (videoCount) {
    const count = parseInt(videoCount.innerHTML);
    const page = parseInt(params.get("page"));
    if (count < 1) {
      videoCount.nextElementSibling.innerHTML = "This Creator has not uploaded any videos!";
    } else {
      if (page) {
        videoCount.nextElementSibling.innerHTML = `Showing ${(page - 1) * 40 + 1}-${Math.min(page * 40, count)}`;
      } else {
        videoCount.nextElementSibling.innerHTML = `Showing 1-${Math.min(40, count)}`;
      }
      videoCount.nextElementSibling.innerHTML += " of " + count;
    }

    const pageWrapper = document.getElementById("page-wrapper");
    if (count > 40) {
      const page = parseInt(params.get("page")) || 1;
      const previousPage = document.createElement("li");
      previousPage.id = "previous-page";
      if (page === 1) {
        previousPage.classList.add("disabled");
        previousPage.innerHTML = `<a><b>Prev</b></a>`;
      } else if (page === 2) {
        previousPage.innerHTML = `<a href="${url.origin}${url.pathname}"><b>Prev</b></a>`;
        const prevLink = document.createElement('link');
        prevLink.rel = 'prev';
        prevLink.href = `${url.origin}${url.pathname}`;
        document.head.appendChild(prevLink);
      } else {
        previousPage.innerHTML = `<a href="?page=${page - 1}"><b>Prev</b></a>`;
        const prevLink = document.createElement('link');
        prevLink.rel = 'prev';
        prevLink.href = `${url.origin}${url.pathname}?page=${page - 1}`;
        document.head.appendChild(prevLink);
      }
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
      for (let i = Math.max(2, page - 3); i <= Math.min(Math.ceil(count / 40) - 1, page + 3); i++) {
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
      if (page === Math.ceil(count / 40)) {
        lastPage.innerHTML = `
          <span>${Math.ceil(count / 40)}</span>
        `;
      } else {
        lastPage.innerHTML = `
          <a href="?page=${Math.ceil(count / 40)}">${Math.ceil(count / 40)}</a>
        `;
      }
      pageWrapper.appendChild(lastPage);
      const nextPage = document.createElement("li");
      nextPage.id = "next-page";
      if (page === Math.ceil(count / 40)) {
        nextPage.classList.add("disabled");
        nextPage.innerHTML = `<a><b>Next</b></a>`;
      } else {
        nextPage.innerHTML = `<a href="?page=${page + 1}"><b>Next</b></a>`;
        const nextLink = document.createElement('link');
        nextLink.rel = 'next';
        nextLink.href = `${url.origin}${url.pathname}?page=${page + 1}`;
        document.head.appendChild(nextLink);
      }
      pageWrapper.appendChild(nextPage);
    }

    const filterText = document.getElementById("filter-text");
    if (params.get("f")) {
      if (params.get("f") === "mp") {
        filterText.innerHTML = "Most Popular";
      } else if (params.get("f") === "hr") {
        filterText.innerHTML = "Highest Rated";
      }
    }
  }

  const durationList = document.getElementsByClassName("video-duration-overlay");
  for (let i = 0; i < durationList.length; i++) {
    const durationDiv = durationList[i].firstElementChild;
    const duration = parseInt(durationDiv.innerHTML);
    durationDiv.innerHTML = Math.floor(duration / 60) + ":" + String(duration % 60).padStart(2, '0');
  }

  const viewList = document.getElementsByClassName("video-views");
  for (let i = 0; i < viewList.length; i++) {
    const viewDiv = viewList[i].firstElementChild;
    const view = parseInt(viewDiv.innerHTML);
    if (view >= 100000000000) {
      viewDiv.innerHTML = `${(view / 1000000000).toFixed(0)}B views`;
    } else if (view >= 1000000000) {
      viewDiv.innerHTML = `${(view / 1000000000).toFixed(1)}B views`;
    } else if (view >= 100000000) {
      viewDiv.innerHTML = `${(view / 1000000).toFixed(0)}M views`;
    } else if (view >= 1000000) {
      viewDiv.innerHTML = `${(view / 1000000).toFixed(1)}M views`;
    } else if (view >= 100000) {
      viewDiv.innerHTML = `${(view / 1000).toFixed(0)}K views`;
    } else if (view >= 1000) {
      viewDiv.innerHTML = `${(view / 1000).toFixed(1)}K views`;
    } else if (view === 1) {
      viewDiv.innerHTML = `1 view`;
    } else {
      viewDiv.innerHTML = `${view} views`;
    }
  }

  const ratingList = document.getElementsByClassName("video-rating");
  for (let i = 0; i < ratingList.length; i++) {
    const dislikes = parseInt(ratingList[i].innerHTML);
    const likes = parseInt(ratingList[i].nextElementSibling.innerHTML);
    const total = likes + dislikes;
    if (total === 0) {
      ratingList[i].innerHTML = "0%";
    } else {
      ratingList[i].innerHTML = `${(likes / total * 100).toFixed(0)}%`;
    }
  }

});

function changeOrder(button) {
  const galleryWrapper = document.getElementById("gallery-wrapper");
  if (button.innerText == "Most Recent") {
    let lockedOrder = ''
    const numUnlocked = [];
    for (let i = 0; i < galleryWrapper.children.length - 1; i++) {
      if (galleryWrapper.children[i].firstElementChild.children[1].getAttribute('href').endsWith("U.webp")) {
        lockedOrder += galleryWrapper.children[i].outerHTML;
      } else {
        numUnlocked.push(i);
      }
    }
    for (let i = 0; i < numUnlocked.length; i++) {
      lockedOrder += galleryWrapper.children[numUnlocked[i]].outerHTML;
    }
    galleryWrapper.innerHTML = lockedOrder;
    button.innerText = "Unlocked";
  } else {
    galleryWrapper.innerHTML = gal;
    button.innerText = "Most Recent";
  }
}
