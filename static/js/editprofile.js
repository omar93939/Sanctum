/**
* @param {String} action string representing which image type to upload; 'avatar' or 'banner'
*/
function upload(action) {
  const container = document.createElement('div');
  container.id='sign-box-div';
  container.innerHTML = `
    <div id="sign-box-container" class="fade-in background-darken">
      <div id="signin-box" style="max-width: 600px;">
      <div class="main-sign-box" style="padding: 20px 0; background: linear-gradient(#757576, #1e1e1e); border-top-left-radius: 11px;  border-top-right-radius: 11px;">
        <span>Edit Banner</span>
      </div>
      <div class="body-sign-box clearfix" style="padding-top: 0">
        <form id="upload-banner-form" autocomplete="off" method="post" enctype="multipart/form-data" action="edit/banner">
          <div class="select-image-button" onclick="clickUpload(this)">
            <svg select-image-i" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M246.6 9.4c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 109.3 192 320c0 17.7 14.3 32 32 32s32-14.3 32-32l0-210.7 73.4 73.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-128-128zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-64z"/></svg>
            Upload Image
            <input class="upload-image-input" type="file" name="image" accept="image/*" oninput="showInput(this)">
          </div>
          <input type="submit" id="signin-button" value="Submit" disabled style="font-size: 20px;">
          <div class="info" style="text-align: center;">
            Recommended image size is 1000 x 200px.
          </div>
        </form>
      </div>
    </div>
      <div id="signin-box" style="max-width: 600px;">
        <div class="main-sign-box" style="padding: 20px 0; background: linear-gradient(#757576, #1e1e1e); border-top-left-radius: 11px;  border-top-right-radius: 11px;">
          <span>Edit Avatar</span>
        </div>
        <div class="body-sign-box clearfix" style="padding-top: 0">
          <form id="upload-avatar-form" autocomplete="off" method="post" enctype="multipart/form-data" action="edit/avatar">
            <div class="select-image-button" onclick="clickUpload(this)">
              <svg select-image-i" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M246.6 9.4c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 109.3 192 320c0 17.7 14.3 32 32 32s32-14.3 32-32l0-210.7 73.4 73.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-128-128zM64 352c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-64z"/></svg>
              Upload Image
              <input class="upload-image-input" type="file" name="image" accept="image/*" oninput="showInput(this)">
            </div>
            <input type="submit" id="signin-button" value="Submit" disabled style="font-size: 20px;">
            <div class="info" style="text-align: center;">
              Recommended image size is 400 x 400px.
            </div>
          </form>
        </div>
      </div>
    </div>`;
  if (action === 'avatar') {
    container.children[0].children[0].classList.add('no-display');
  } else if (action === 'banner') {
    container.children[0].children[1].classList.add('no-display');
  } else {
    throw new Error('Invalid action for signBox');
  }
  document.body.appendChild(container);
}


/**
 * @param {Element} div element
 */
function clickUpload(div) {
  div.lastElementChild.click();
}


/**
 * @param {Element} div element
 */
function showInput(div) {
  const button = div.parentElement;
  button.nextElementSibling.disabled = false;
}


/**
 * @param {Element} div element
 */
function toggle(div) {
  const button = div.firstElementChild.nextElementSibling.firstElementChild;
  if (div.nextElementSibling.classList.contains('show')) {
    div.nextElementSibling.classList.remove('show');
    div.classList.remove('purple');
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M256 80c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 144L48 224c-17.7 0-32 14.3-32 32s14.3 32 32 32l144 0 0 144c0 17.7 14.3 32 32 32s32-14.3 32-32l0-144 144 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-144 0 0-144z"/></svg>'
  } else {
    div.nextElementSibling.classList.add('show');
    div.classList.add('purple');
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M432 256c0 17.7-14.3 32-32 32L48 288c-17.7 0-32-14.3-32-32s14.3-32 32-32l352 0c17.7 0 32 14.3 32 32z"/></svg>'
  }
}
