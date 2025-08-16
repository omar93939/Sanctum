let hasUnsavedChanges = true;
window.addEventListener("beforeunload", (event) => {
  if (hasUnsavedChanges) {
    event.preventDefault();
  }
});
const categories = [];
const tags = [];
let fileType = null;
let uploadFinished = false;
let videoID = "";
let changeThumbnail = false;
const path = window.location.pathname.split("/");
const titleLanguages = {
  0: "English",
  1: "German",
  2: "French",
  3: "Spanish",
  4: "Italian",
  5: "Portuguese",
  6: "Polish",
  7: "Russian",
  8: "Japanese",
  9: "Korean",
  10: "Dutch",
  11: "Greek",
  12: "Czech",
  13: "Chinese (Simplified)",
}
const spokenLanguages = {
  0: "Other",
  1: "English",
  2: "English (British)",
  3: "English (Australian)",
  4: "Arabic",
  5: "Bengali",
  6: "Cantonese",
  7: "Czech",
  8: "Danish",
  9: "Dutch",
  10: "Finnish",
  11: "French",
  12: "German",
  13: "Greek",
  14: "Hindi",
  15: "Hungarian",
  16: "Indonesian",
  17: "Italian",
  18: "Japanese",
  19: "Javanese",
  20: "Korean",
  21: "Mandarin",
  22: "Norwegian",
  23: "Persian",
  24: "Polish",
  25: "Portuguese",
  26: "Portuguese (Brazilian)",
  27: "Punjabi",
  28: "Romanian",
  29: "Russian",
  30: "Spanish",
  31: "Swedish",
  32: "Tagalog",
  33: "Thai",
  34: "Turkish",
  35: "Ukrainian",
  36: "Vietnamese",
}

document.addEventListener("DOMContentLoaded", () => {

  if (path[1] == "edit") {
    fileType = "video";
    videoID = path[2];
    const thumbnail = document.getElementById("thumbnail");
    const thumbnailImg = document.createElement("img");
    const storageData = document.getElementById("storage-data").dataset;
    thumbnailImg.id = "thumbnail-img";
    const videoData = JSON.parse(document.getElementById("videodata").dataset.video);
    if (videoData.processed || videoData.thumbchanges) {
      thumbnailImg.src = `https://${STREAM_HOSTNAME}.b-cdn.net/${videoID}/thumbnail_small.webp?${videoData.thumbchanges}`;
    } else {
      thumbnailImg.src = `/images/Processing.png`;
    }
    thumbnailImg.addEventListener("mouseover", () => {
      thumbnailImg.previousElementSibling.style.color = "#7850a8";
    });
    thumbnailImg.addEventListener("mouseout", () => {
      thumbnailImg.previousElementSibling.style.color = "";
    });
    thumbnailImg.addEventListener("click", () => {
      const input = thumbnail.firstElementChild;
      input.click();
    });
    thumbnail.appendChild(thumbnailImg);
    document.getElementById("title-input").value = videoData.title;
    document.getElementById("title-language-name").innerHTML = titleLanguages[videoData.titlelanguage];
    document.getElementById("title-language").innerHTML = videoData.titlelanguage;
    switch (videoData.orientation) {
      case 0:
        document.getElementById("orientation").innerHTML = "Solo";
        break;
      case 1:
        document.getElementById("orientation").innerHTML = "Straight";
        break;
      case 2:
        document.getElementById("orientation").innerHTML = "Gay";
        break;
      case 3:
        document.getElementById("orientation").innerHTML = "Lesbian";
        break;
      case 4:
        document.getElementById("orientation").innerHTML = "Transgender";
        break;
      case 5:
        document.getElementById("orientation").innerHTML = "Bisexual";
        break;
    }
    document.getElementById("spoken-language-name").innerHTML = spokenLanguages[videoData.spokenlanguage];
    document.getElementById("spoken-language").innerHTML = videoData.spokenlanguage;
    switch (videoData.visibility) {
      case 0:
        document.getElementById("visibility").innerHTML = "Public";
        break;
      case 1:
        document.getElementById("visibility").innerHTML = "Unlisted";
        break;
    }
    switch (videoData.production) {
      case 0:
        document.getElementById("production").innerHTML = "Professional";
        break;
      case 1:
        document.getElementById("production").innerHTML = "Homemade";
        break;
    }
    const tagInput = document.getElementById("tag-input");
    videoData.tags.forEach((tag) => {
      tagInput.value = tag;
      addTag();
    });
    const categoryButtons = document.getElementsByClassName("category-button");
    for (let i = 0; i < categoryButtons.length; i++) {
      if (videoData.categories.includes(videoCategories[categoryButtons[i].firstElementChild.nextElementSibling.innerHTML.trim()])) {
        addCategory(categoryButtons[i]);
      }
    }
    document.getElementById("delete-video-button").addEventListener("click", () => {
      if (confirm("Are you sure you want to delete this video?")) {
        const xhr = new XMLHttpRequest();
        xhr.open("DELETE", `/api/video/${videoID}`);
        xhr.onload = () => {
          if (xhr.status == 200) {
            hasUnsavedChanges = false;
            window.location.href = "/profile";
          } else {
            alert("An error occurred while deleting the video.");
          }
        };
        xhr.send();
      }
    });
    document.getElementById("thumbnail-input").addEventListener("change", () => {
      const file = document.getElementById("thumbnail-input").files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          thumbnailImg.src = reader.result;
        }
        reader.readAsDataURL(file);
        changeThumbnail = true;
      }
    });
  } else if (path[1] == "upload") {

    const dropArea = document.getElementById("draggable-area");
    const input = document.getElementById("upload-file-input");

    dropArea.addEventListener('dragenter', (event) => {
      event.preventDefault();
      event.stopPropagation();
      dropArea.classList.add("hover");
    });
    dropArea.addEventListener('dragleave', (event) => {
      event.preventDefault();
      event.stopPropagation();
      dropArea.classList.remove("hover");
    });
    dropArea.addEventListener('dragover', (event) => {
      event.preventDefault();
      event.stopPropagation();
      dropArea.classList.add("hover");
    });
    dropArea.addEventListener('drop', (event) => {
      event.preventDefault();
      event.stopPropagation();
      dropArea.classList.remove("hover");
      input.files = event.dataTransfer.files;
      uploading(input);
    });
  }

  document.getElementById("upload-video-save-button").addEventListener("click", saveInfo);

  const tagInput = document.getElementById("tag-input");

  document.addEventListener("keydown", (event) => {
    if (document.activeElement.id !== "tag-input") {
      return;
    }
    if (event.key === "," || event.key === "Enter") {
      event.preventDefault();
      if (tagInput.value.length < 2 || tagInput.value.length > 20) {
        return;
      }
      addTag();
    } else {
      setTimeout(() => {
        if (tagInput.value.length < 2 || tagInput.value.length > 20) {
          if (tagInput.nextElementSibling.classList.contains("tag-purple")) {
            tagInput.nextElementSibling.classList.remove("tag-purple");
          }
        } else {
          if (!tagInput.nextElementSibling.classList.contains("tag-purple")) {
            tagInput.nextElementSibling.classList.add("tag-purple");
          }
        }
      }, 0);
    }
  });

});


function addTag() {
  const tagInput = document.getElementById("tag-input");
  const tag = tagInput.value.trim();
  if (tag.length < 2 || tag.length > 20) {
    return;
  }
  const tagList = document.getElementById("tag-list");
  const tagsRemaining = tagList.previousElementSibling;
  const tagDiv = document.createElement("button"); // change div to button
  if (tagList.childElementCount > 15) {
    return;
  }
  const existingTags = tagList.querySelectorAll(".tag");
  for (let i = 0; i < existingTags.length; i++) {
    if (existingTags[i].firstElementChild.innerHTML.toLowerCase() === tag.toLowerCase()) {
      return;
    }
  }
  if (!tags.includes(tag)) {
    tags.push(tag);
  }
  tagsRemaining.innerHTML = `${15 - tagList.childElementCount} tags remaining, you need at least 2 tags`;
  tagDiv.classList.add("tag");
  tagDiv.innerHTML = `<div>${tag}</div>` + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/></svg>';
  tagDiv.addEventListener("click", function() {
    tagList.removeChild(tagDiv);
    tagsRemaining.innerHTML = `${16 - tagList.childElementCount} tags remaining, you need at least 2 tags`;
    const tagIndex = tags.indexOf(tag);
    if (tagIndex > -1) {
      tags.splice(tagIndex, 1);
    }
  });
  tagList.appendChild(tagDiv);
  tagInput.value = "";
  tagInput.nextElementSibling.classList.remove("tag-purple");
}


/**
 * @param {Element} input element
 */
function uploading(input) {
  const files = input.files;
  if (files.length != 1) {
    alert("Please only upload one file at a time.");
    return;
  }
  const file = files[0];
  let type = input.getAttribute("accept");
  if (type === "video/*") {
    fileType = "video";
    if (!file.type.startsWith("video/")) {
      alert("Please upload a video file.");
      return;
    }
  } else if (type === "image/*") {
    fileType = "image";
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }
  } else {
    alert("Error with file upload.");
    hasUnsavedChanges = false;
    location.reload();
    return;
  }
  document.getElementById("upload-button-wrapper").classList.add("no-display");
  document.getElementById("video-template").classList.remove("no-display");
  const thumbnail = document.getElementById("thumbnail");
  const progressBlock = document.getElementById("video-progress-wrapper");
  const progressBar = document.getElementById("progress-bar");
  let filesize = file.size;
  if (filesize > 1000000000) {
    filesize = (filesize / 1000000000).toFixed(2) + " GB";
  } else if (filesize > 1000000) {
    filesize = (filesize / 1000000).toFixed(2) + " MB";
  } else if (filesize > 1000) {
    filesize = (filesize / 1000).toFixed(2) + " KB";
  } else {
    filesize = filesize + " B";
  }
  progressBlock.firstElementChild.innerHTML = `
    <div id="filename">${file.name}</div>
    <span id="filesize">${filesize}</span>`;
  let shaData = {
    filename: file.name,
    filetype: fileType,
  };
  fetch('/upload/video', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(shaData)
  }).then(response => response.json()).then(data => {
    let upload = new tus.Upload(file, {
      endpoint: "https://video.bunnycdn.com/tusupload",
      retryDelays: [0, 3000, 5000, 10000, 20000, 60000, 60000],
      headers: {
        AuthorizationSignature: data.shaHash,
        AuthorizationExpire: data.expirationTime,
        VideoId: data.videoId,
        LibraryId: data.libraryId
      },
      metadata: {
        filetype: file.type,
        title: data.title
      },
      onError: () => {
        const xhr = new XMLHttpRequest();
        xhr.open("DELETE", `/api/video/${data.videoId}`);
        xhr.send();
        alert("Error uploading file.");
        hasUnsavedChanges = false;
        location.reload();
      },
      onProgress: (bytesUploaded, bytesTotal) => {
        const percent = (bytesUploaded / bytesTotal) * 100;
        progressBar.style.width = percent + "%";
      },
      onSuccess: () => {
        const text = progressBlock.firstElementChild.nextElementSibling;
        text.innerHTML = `
          Uploaded successfully! Please fill out the information
          <br>
          and press 'Submit' to complete the process.`;
        text.classList.add("green");
        progressBar.classList.add("green-background");
        const loading = thumbnail.firstElementChild;
        loading.classList.add("no-display");
        loading.nextElementSibling.classList.remove("no-display");
        videoID = data.videoId;
        uploadFinished = true;
      }
    });
    upload.findPreviousUploads().then((previousUploads) => {
      if (previousUploads.length) {
        upload.resumeFromPreviousUpload(previousUploads[0]);
      }
      upload.start();
    });
  });
}


function clickUpload() {
  const input = document.getElementById("upload-file-input");
  input.click();
}


/**
 * @param {Element} div element
 */
function changeValue(div) {
  const value = div.firstElementChild.innerHTML.trim();
  div.parentElement.previousElementSibling.firstElementChild.innerHTML = value;
}

/**
 * @param {Element} div element
 */
function changeLanguage(div) {
  const valueDiv = div.firstElementChild;
  const value = valueDiv.innerHTML.trim();
  const id = valueDiv.nextElementSibling.innerHTML.trim();
  const toSet = div.parentElement.previousElementSibling.firstElementChild;
  toSet.innerHTML = value;
  toSet.nextElementSibling.innerHTML = id;
}


/**
 * @param {Element} div element
 */
function addCategory(div) {
  if (div.classList.contains("active")) {
    div.firstElementChild.innerHTML = ``;
    div.classList.remove("active");
    const indexToRemove = categories.indexOf(div.firstElementChild.nextElementSibling.innerHTML);
    if (indexToRemove > -1) {
      categories.splice(indexToRemove, 1);
    }
  } else {
    if (categories.length < 12) {
      div.firstElementChild.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M438.6 105.4c12.5 12.5 12.5 32.8 0 45.3l-256 256c-12.5 12.5-32.8 12.5-45.3 0l-128-128c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0L160 338.7 393.4 105.4c12.5-12.5 32.8-12.5 45.3 0z"/></svg>`;
      div.classList.add("active");
      categories.push(div.firstElementChild.nextElementSibling.innerHTML);
    }
  }
}

/**
 * @param {Element} div element
 */
function toggleConfirm(div) {
  if (div.classList.contains("active")) {
    div.innerHTML = '<!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M0 96C0 60.7 28.7 32 64 32H384c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96z"/>';
    div.classList.remove("active");
    // div.parentElement.previousElementSibling.click();
  } else {
    div.innerHTML = '<!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32zM337 209L209 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L303 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/>';
    div.classList.add("active");
    // div.parentElement.previousElementSibling.click();
  }
}

function saveInfo() {
  const beforeSave = document.getElementById("before-save-button");
  const title = document.getElementById("title-input").value.replace(/\s\s+/g, ' ').trim();
  const titleLanguage = parseInt(document.getElementById("title-language").innerHTML.trim());
  const orientation = document.getElementById("orientation").innerHTML.trim();
  let orientationNumber = -1;
  const verification = document.getElementById("verification").innerHTML.trim();
  const spokenLanguage = parseInt(document.getElementById("spoken-language").innerHTML.trim());
  const visibility = document.getElementById("visibility").innerHTML.trim();
  let visibilityNumber = -1;
  const production = document.getElementById("production").innerHTML.trim();
  let productionNumber = -1;
  switch (orientation) {
    case "Solo":
      orientationNumber = 0;
      break;
    case "Straight":
      orientationNumber = 1;
      break;
    case "Gay":
      orientationNumber = 2;
      break;
    case "Lesbian":
      orientationNumber = 3;
      break;
    case "Transgender":
      orientationNumber = 4;
      break;
    case "Other":
      orientationNumber = 5;
      break;
    default:
      alert("Error with orientation.");
      return;
  }
  switch (visibility) {
    case "Public":
      visibilityNumber = 0;
      break;
    case "Unlisted":
      visibilityNumber = 1;
      break;
    default:
      alert("Error with visibility.");
      return;
  }
  switch (production) {
    case "Professional":
      productionNumber = 0;
      break;
    case "Homemade":
      productionNumber = 1;
      break;
    default:
      alert("Error with production.");
      return;
  }
  let allGood = true;
  if (!fileType == "video" || !fileType == "image") {
    alert("Error with file upload.");
    return;
  }
  if (path[1] === "upload") {
    if (!uploadFinished) {
      allGood = false;
      if (!Array.from(beforeSave.children).some(div => div.innerHTML === "Please wait for the upload to finish!")) {
        beforeSave.innerHTML += `<div>Please wait for the upload to finish!</div>`;
      }
    } else {
      index = Array.from(beforeSave.children).findIndex(div => div.innerHTML === "Please wait for the upload to finish!");
      if (index > -1) {
        beforeSave.children[index].remove();
      }
    }
  }
  if (title === "") {
    allGood = false;
    if (!Array.from(beforeSave.children).some(div => div.innerHTML === "Please Enter a title!")) {
      beforeSave.innerHTML += `<div>Please Enter a title!</div>`;
    }
  } else if (title.length < 5) {
    allGood = false;
    const index = Array.from(beforeSave.children).findIndex(div => div.innerHTML === "Please Enter a title!");
    if (index > -1) {
      beforeSave.children[index].remove();
    }
    if (!Array.from(beforeSave.children).some(div => div.innerHTML === "Title must contain at least 5 characters!")) {
      beforeSave.innerHTML += `<div>Title must contain at least 5 characters!</div>`;
    }
  } else if (title.length > 100) {
    alert("Error with title.");
    return;
  } else {
    let index = Array.from(beforeSave.children).findIndex(div => div.innerHTML === "Please Enter a title!");
    if (index > -1) {
      beforeSave.children[index].remove();
    }
    index = Array.from(beforeSave.children).findIndex(div => div.innerHTML === "Title must contain at least 5 characters!");
    if (index > -1) {
      beforeSave.children[index].remove();
    }
  }
  if (titleLanguage < 0 || titleLanguage > 13) {
    alert("Error with title language.");
    return;
  }
  if (orientationNumber < 0 || orientationNumber > 5) {
    alert("Error with orientation.");
    return;
  }
  if (verification !== "Yes") {
    allGood = false;
    if (fileType === "image") {
      if (!Array.from(beforeSave.children).some(div => div.innerHTML === "Please verify that you are in the image!")) {
        beforeSave.innerHTML += `<div>Please verify that you are in the image!</div>`;
      }
    } else {
      if (!Array.from(beforeSave.children).some(div => div.innerHTML === "Please verify that you are in the video!")) {
        beforeSave.innerHTML += `<div>Please verify that you are in the video!</div>`;
      }
    }
  } else {
    if (fileType === "image") {
      index = Array.from(beforeSave.children).findIndex(div => div.innerHTML === "Please verify that you are in the image!");
      if (index > -1) {
        beforeSave.children[index].remove();
      }
    } else {
      index = Array.from(beforeSave.children).findIndex(div => div.innerHTML === "Please verify that you are in the video!");
      if (index > -1) {
        beforeSave.children[index].remove();
      }
    }
  }
  if (spokenLanguage < 0 || spokenLanguage > 36) {
    alert("Error with spoken language.");
    return;
  }
  if (visibilityNumber < 0 || visibilityNumber > 1) {
    alert("Error with visibility.");
    return;
  }
  if (productionNumber < 0 || productionNumber > 1) {
    alert("Error with production.");
    return;
  }
  if (categories.length < 1) {
    allGood = false;
    if (!Array.from(beforeSave.children).some(div => div.innerHTML === "Please select some categories!")) {
      beforeSave.innerHTML += `<div>Please select some categories!</div>`;
    }
  } else if (categories.length > 12) {
    alert("Error with categories.");
    return;
  } else {
    index = Array.from(beforeSave.children).findIndex(div => div.innerHTML === "Please select some categories!");
    if (index > -1) {
      beforeSave.children[index].remove();
    }
  }
  if (tags.length < 2) {
    allGood = false;
    if (!Array.from(beforeSave.children).some(div => div.innerHTML === "Please select at least 2 tags!")) {
      beforeSave.innerHTML += `<div>Please select at least 2 tags!</div>`;
    }
  } else if (tags.length > 16) {
    alert("Error with tags.");
    return;
  } else {
    index = Array.from(beforeSave.children).findIndex(div => div.innerHTML === "Please select at least 2 tags!");
    if (index > -1) {
      beforeSave.children[index].remove();
    }
  }
  const confirmCheckboxes = document.getElementsByClassName("confirm-checkbox");
  let active = true;
  Array.from(confirmCheckboxes).forEach(checkbox => {
    if (!checkbox.classList.contains("active")) {
      active = false;
    }
  });
  if (!active) {
    allGood = false;
    if (!Array.from(beforeSave.children).some(div => div.innerHTML === "Please confirm you agree with all of the above.")) {
      beforeSave.innerHTML += `<div>Please confirm you agree with all of the above.</div>`;
    }
  } else {
    index = Array.from(beforeSave.children).findIndex(div => div.innerHTML === "Please confirm you agree with all of the above.");
    if (index > -1) {
      beforeSave.children[index].remove();
    }
  }
  if (allGood) {
    const data = {
      id: videoID,
      type: fileType,
      title: title,
      titleLanguage: titleLanguage,
      orientation: orientationNumber,
      spokenLanguage: spokenLanguage,
      visibility: visibilityNumber,
      production: productionNumber,
      categories: categories,
      tags: tags
    }
    fetch('/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then((response) => {
      if (response.status !== 200) {
        alert("Error saving video, please try again.");
        return;
      }
      hasUnsavedChanges = false;
      if (changeThumbnail) {
        const thumbnail = new FormData();
        thumbnail.append('thumbnail', document.getElementById("thumbnail-input").files[0]);
        fetch(`/api/thumbnail/${videoID}`, {
          method: 'PUT',
          body: thumbnail
        }).then((result) => {
          if (result.status !== 200) {
            alert("Error saving thumbnail, please try again.");
            location.reload();
          } else {
            location.href = "/profile"; 
          }
        }).catch(err => {
          alert("Error saving thumbnail, please try again.");
          location.reload();
        });
      } else {
        location.href = "/profile";
      }
    }).catch(err => {
      alert("Error saving video, please try again.");
    });
  }
}
