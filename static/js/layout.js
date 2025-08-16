const url = new URL(window.location.href);
const params = new URLSearchParams(url.search);

document.addEventListener("DOMContentLoaded", () => {
  
  const loginErr = params.get('loginErr');
  const registrationErr = params.get('registrationErr');
  if (loginErr) {
    let msg = '';
    if (loginErr === '500') {
      msg = 'Internal server error. Please try again.';
    } else if (loginErr === '400') {
      msg = 'Bad request. Our server picked up a faulty request. Try again.';
    } else if (loginErr === '409') {
      msg = 'Conflict. Our servers noticed that you are logging in with an email which already belongs to another email verified user.'
    }
    signBox('signin', {
      type: 'login',
      msg: msg
    });
  } else if (registrationErr) {
    let msg = '';
    if (registrationErr === '500') {
      msg = 'Internal server error. Please try again.';
    }
    signBox('signup', {
      type: 'registration',
      msg: msg
    });
  }

  previewImages();

  if (document.getElementById("logout-button")) {
    document.getElementById("logout-button").addEventListener("click", (event) => {
      event.preventDefault();
      fetch(`/logout`, {
        method: "GET"
      }).then(_ => {
        window.location.reload();
      }).catch(_ => {
        window.alert("Error logging out");
      });
    });
  }

});

const previewImages = () => {
  const previewImages = document.getElementsByClassName("video-preview");
  for (let i = 0; i < previewImages.length; i++) {
    previewImages[i].addEventListener('mouseover', () => {
      previewImages[i].src = previewImages[i].dataset.preview;
    });
    previewImages[i].addEventListener('mouseout', () => {
      previewImages[i].src = previewImages[i].dataset.img;
    });
  }
}

document.onclick = (event) => {
  if (!event.target.closest('.dropdown-button')) {
      const dropdowns = document.getElementsByClassName('dropdown');
      for (let i = 0; i < dropdowns.length; i++) {
          const dropChildren = dropdowns[i].children;
          if (dropChildren[1].classList.contains('show')) {
              dropChildren[1].classList.remove('show');
              dropChildren[0].blur();
          }
      }
  }
}

/**
* @param {Element} div element
*/  
function toggleDropdown(div) {
  const drop = div.children;
  if (drop[1].classList.contains('show')) {
    drop[1].classList.remove('show');
    drop[0].blur();
  } else {
    closeDropdowns();
    drop[1].classList.add('show');
  }
}

function closeDropdowns() {
  const dropdowns = document.getElementsByClassName('dropdown');
  for (let i = 0; i < dropdowns.length; i++) {
    const dropChildren = dropdowns[i].children;
    if (dropChildren[1].classList.contains('show')) {
      dropChildren[1].classList.remove('show');
      dropChildren[0].blur();
    }
  }
}
