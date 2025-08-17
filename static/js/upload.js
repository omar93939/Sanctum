let hasUnsavedChanges = false;
window.addEventListener("beforeunload", (event) => {
  if (hasUnsavedChanges) {
    event.preventDefault();
  }
});
const tags = [];
let fileType = null;
let uploadFinished = false;
let videoID = "";
let changeThumbnail = false;
let imgFile = null;
let type = null;
const path = window.location.pathname.split("/");

document.addEventListener("DOMContentLoaded", () => {

  if (path[1] == 'edit') {
    type = 'edit';
    if (path[2] === 'image') {
      fileType = 'image';
    } else if (path[2] === 'video') {
      fileType = 'video';
      const thumbnail = document.getElementById("thumbnail");
      const thumbnailImg = document.createElement("img");
      thumbnailImg.id = "thumbnail-img";
      thumbnailImg.src = `https://${STREAM_HOSTNAME}.b-cdn.net/${videoID}/thumbnail.jpg?${thumbnail.dataset.v}`;
      thumbnailImg.addEventListener("mouseover", () => {
        thumbnailImg.previousElementSibling.style.color = "#7850a8";
      });
      thumbnailImg.addEventListener("mouseout", () => {
        thumbnailImg.previousElementSibling.style.color = "";
      });
      thumbnailImg.addEventListener("click", () => {
        thumbnail.firstElementChild.click();
      });
      thumbnail.appendChild(thumbnailImg);
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
    } else {
      alert('Incorrect url');
      return window.location.href = '/';
    }
    videoID = path[2];
    const videoData = JSON.parse(document.getElementById("videodata").dataset.video);
    document.getElementById("title-input").value = videoData.title;
    const tagInput = document.getElementById("tag-input");
    videoData.tags.forEach((tag) => {
      tagInput.value = tag;
      addTag();
    });
    document.getElementById("delete-video-button").addEventListener("click", () => {
      if (confirm("Are you sure you want to delete this media?")) {
        fetch(`/api/${fileType}/${videoID}`, {
          method: 'DELETE'
        }).then(response => {
          if (response.status === 200) {
            hasUnsavedChanges = false;
            return window.location.href = "/dashboard/sanctum";
          } else {
            return alert("An error occurred while deleting the video.");
          }
        });
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
  const tagDiv = document.createElement("button");
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
  hasUnsavedChanges = true;
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
    imgFile = file;
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
  if (type === "video/*") {
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
          fetch(`/api/video/${data.videoId}`, {
            method: 'DELETE'
          });
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
  } else if (type === "image/*") {
    const thumbnailImg = document.createElement("img");
    thumbnailImg.id = "thumbnail-img";
    thumbnailImg.style.top = '0';
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        thumbnailImg.src = reader.result;
      }
      reader.readAsDataURL(file);
      changeThumbnail = true;
    } else {
      alert('Error with image upload. Please try again.');
      hasUnsavedChanges = false;
      return location.reload();
    }
    thumbnail.firstElementChild.classList.add("no-display");
    thumbnail.appendChild(thumbnailImg);
    const text = progressBlock.firstElementChild.nextElementSibling;
    text.innerHTML = `
      Uploaded successfully! Please fill out the information
      <br>
      and press 'Submit' to complete the process.`;
  }
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
function toggleConfirm(div) {
  if (div.classList.contains("active")) {
    div.innerHTML = '<!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M0 96C0 60.7 28.7 32 64 32H384c35.3 0 64 28.7 64 64V416c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V96z"/>';
    div.classList.remove("active");
  } else {
    div.innerHTML = '<!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M64 32C28.7 32 0 60.7 0 96L0 416c0 35.3 28.7 64 64 64l320 0c35.3 0 64-28.7 64-64l0-320c0-35.3-28.7-64-64-64L64 32zM337 209L209 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L303 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/>';
    div.classList.add("active");
  }
}

function saveInfo() {
  const beforeSave = document.getElementById("before-save-button");
  const title = document.getElementById("title-input").value.replace(/\s\s+/g, ' ').trim();
  let allGood = true;
  if (!fileType == "video" || !fileType == "image") return alert("Error with file upload.");
  if (path[1] === "upload") {
    if (fileType === "video/*") {
      if (!uploadFinished) {
        allGood = false;
        if (!Array.from(beforeSave.children).some(div => div.innerHTML === "Please wait for the upload to finish!")) {
          beforeSave.innerHTML += `<div>Please wait for the upload to finish!</div>`;
        }
      } else {
        index = Array.from(beforeSave.children).findIndex(div => div.innerHTML === "Please wait for the upload to finish!");
        if (index > -1) beforeSave.children[index].remove();
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
  if (tags.length > 16) {
    if (!Array.from(beforeSave.children).some(div => div.innerHTML === "You selected too many tags!")) {
      beforeSave.innerHTML += `<div>You selected too many tags!</div>`;
    }
  } else {
    index = Array.from(beforeSave.children).findIndex(div => div.innerHTML === "You selected too many tags!");
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
    if (fileType === "image") {
      const data = new FormData();
      data.append('title', title);
      data.append('tags', tags);
      data.append('image', imgFile);
      data.append('id', videoID);
      fetch('/upload/image', {
        method: 'POST',
        body: data
      }).then(response => {
        if (response.status !== 200) return alert("Error saving Image, please try again.");
        hasUnsavedChanges = false;
        return location.href = response.url;
      }).catch(err => {
        return alert("Error saving Image, please try again.");
      });
    } else if (fileType === "video") {
      const data = {
        id: videoID,
        title: title,
        tags: tags
      }
      fetch('/upload/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      }).then((response) => {
        if (response.status !== 200) return alert("Error saving video, please try again.");
        hasUnsavedChanges = false;
        if (changeThumbnail) {
          const thumbnail = new FormData();
          thumbnail.append('thumbnail', document.getElementById("thumbnail-input").files[0]);
          fetch(`/upload/video`, {
            method: 'PUT',
            body: thumbnail
          }).then((result) => {
            if (result.status === 404) {
              alert("Please wait until the video is done processing.");
              location.href = "/dashboard/sanctum";
            } else if (result.status !== 200) {
              alert("Error saving thumbnail, please try again.");
              location.reload();
            } else {
              location.href = "/dashboard/sanctum";
            }
          }).catch(err => {
            alert("Error saving thumbnail, please try again.");
            return location.reload();
          });
        } else {
          location.href = "/dashboard/sanctum";
        }
      }).catch(err => {
        return alert("Error saving video, please try again.");
      });
    }
  }
}
