function identifyPartner(button) {
  const dataset = button.nextElementSibling.nextElementSibling.dataset;
  const id = dataset.id;
  const displayname = dataset.displayname.trim().replace(/\s+/g, ' ');
  fetch('/adminapi/identifypartner', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: id,
      displayname: displayname
    })
  }).then(response => {
    if (response.status === 200) {
      button.parentElement.parentElement.parentElement.remove();
    } else {
      alert(response.statusText);
    }
  }).catch(error => {
    alert(error);
  });
}
function rejectPartner(button) {
  const id = button.nextElementSibling.dataset.id;
  fetch('/adminapi/rejectpartner', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: id
    })
  }).then(response => {
    if (response.status === 200) {
      button.parentElement.parentElement.parentElement.remove();
    } else {
      alert(response.statusText);
    }
  }).catch(error => {
    alert(error);
  });
}

function identifyUser(button) {
  const dataset = button.nextElementSibling.nextElementSibling.dataset;
  const id = dataset.id;
  const idphoto = dataset.idphoto;
  const exphoto = dataset.exphoto;
  const displayname = dataset.displayname.trim().replace(/\s+/g, ' ');
  fetch('/adminapi/identifyuser', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: id,
      idphoto: idphoto,
      exphoto: exphoto,
      displayname: displayname
    })
  }).then(response => {
    if (response.status === 200) {
      button.parentElement.parentElement.parentElement.remove();
    } else {
      alert(response.statusText);
    }
  }).catch(error => {
    alert(error);
  });
}
function rejectUser(button) {
  const id = button.nextElementSibling.dataset.id;
  const idphoto = button.nextElementSibling.dataset.idphoto;
  const exphoto = button.nextElementSibling.dataset.exphoto;
  fetch('/adminapi/rejectuser', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: id,
      idphoto: idphoto,
      exphoto: exphoto
    })
  }).then(response => {
    if (response.status === 200) {
      button.parentElement.parentElement.parentElement.remove();
    } else {
      alert(response.statusText);
    }
  }).catch(error => {
    alert(error);
  });
}

function verifyVid(button) {
  const dataset = button.nextElementSibling.nextElementSibling.dataset;
  fetch('/adminapi/verifyvid', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: dataset.id,
      uid: dataset.uid,
      userid: dataset.userid
    })
  }).then(response => {
    if (response.status === 200) {
      button.parentElement.parentElement.parentElement.remove();
    } else {
      alert(response.statusText);
    }
  }).catch(error => {
    alert(error);
  });
}
function denyVid(button) {
  const dataset = button.nextElementSibling.dataset;
  fetch('/adminapi/denyvid', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: dataset.id
    })
  }).then(response => {
    if (response.status === 200) {
      button.parentElement.parentElement.parentElement.remove();
    } else {
      response.text().then(text => {
        alert(text);
      })
    }
  }).catch(error => {
    alert(error);
  });
}

function verifyImg(button) {
  const type = button.nextElementSibling.nextElementSibling.dataset.type;
  const hash = button.nextElementSibling.nextElementSibling.dataset.hash;
  const id = button.nextElementSibling.nextElementSibling.dataset.id;
  if (type == "pp") {
    fetch('/adminapi/verifypp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hash: hash,
        id: id
      })
    }).then(response => {
      if (response.status === 200) {
        button.parentElement.parentElement.parentElement.remove();
      } else {
        alert(response.statusText);
      }
    }).catch(error => {
      alert(error);
    });
  } else if (type == "pb") {
    fetch('/adminapi/verifypb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hash: hash,
        id: id
      })
    }).then(response => {
      if (response.status === 200) {
        button.parentElement.parentElement.parentElement.remove();
      } else {
        alert(response.statusText);
      }
    }).catch(error => {
      alert(error);
    });
  }
}
function denyImg(button) {
  const type = button.nextElementSibling.dataset.type;
  const hash = button.nextElementSibling.dataset.hash;
  const id = button.nextElementSibling.dataset.id;
  if (type == "pp") {
    fetch('/adminapi/denypp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hash: hash,
        id: id
      })
    }).then(response => {
      if (response.status === 200) {
        button.parentElement.parentElement.parentElement.remove();
      } else {
        alert(response.statusText);
      }
    }).catch(error => {
      alert(error);
    });
  } else if (type == "pb") {
    fetch('/adminapi/denypb', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hash: hash,
        id: id
      })
    }).then(response => {
      if (response.status === 200) {
        button.parentElement.parentElement.parentElement.remove();
      } else {
        alert(response.statusText);
      }
    }).catch(error => {
      alert(error);
    });
  }
}

function podid(element) {
  const ip = element.firstElementChild.value.trim();
  if (confirm(`Press OK if you're sure you want to switch the Model's IP to:\n${ip}`)) {
    fetch(`/adminapi/podid`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ip: ip
      })
    }).then(res => {
      if (res.status === 204) {
        alert('Success!');
        location.href = '/admin';
      } else {
        alert('Error: ' + res.statusText);
      }
    }).catch(err => {
      alert('Error: ' + err);
    })
  } else {
    element.firstElementChild.value = '';
  }
}

function downloadTrained() {
  if (confirm(`Press OK if you want to download up to the oldest 25 trained messages`)) {
    fetch(`/adminapi/trainedmsgs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(res => {
      if (res.status === 200) {
        res.blob().then(blob => {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'SFT.json';
          link.click();
          URL.revokeObjectURL(link.href);
          alert('Success!');
        }).catch(error => {
          alert('Error: ' + error);
        });
      } else if (res.status === 204) {
        alert('No more Msgs to download!');
        location.href = '/admin';
      } else {
        alert('Error: ' + res.statusText);
      }
    }).catch(err => {
      alert('Error: ' + err);
    })
  }
}
function downloadDebugged() {
  if (confirm(`Press OK if you want to download up to the oldest 25 debugged messages`)) {
    fetch(`/adminapi/debuggedmsgs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }).then(res => {
      if (res.status === 200) {
        res.blob().then(blob => {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = 'DPO.json';
          link.click();
          URL.revokeObjectURL(link.href);
          alert('Success!');
        }).catch(error => {
          alert('Error: ' + error);
        });
      } else if (res.status === 204) {
        alert('No more Msgs to download!');
        location.href = '/admin';
      } else {
        alert('Error: ' + res.statusText);
      }
    }).catch(err => {
      alert('Error: ' + err);
    })
  }
}
