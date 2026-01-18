(function() {
  // The width and height of the captured photo. We will set the
  // width to the value defined here, but the height will be
  // calculated based on the aspect ratio of the input stream.

  var width = 320;    // We will scale the photo width to this
  var height = 0;     // This will be computed based on the input stream

  // |streaming| indicates whether or not we're currently streaming
  // video from the camera. Obviously, we start at false.

  var streaming = false;

  // The various HTML elements we need to configure or control. These
  // will be set by the startup() function.

  var video = null;
  var canvas = null;
  var startbutton = null;

  function startup() {
    video = document.getElementById('video');
    canvas = document.getElementById('canvas');
    startbutton = document.getElementById('startbutton');
    recognizebutton = document.getElementById('recognizebutton');
    results = document.getElementById('results');

    navigator.mediaDevices.getUserMedia({video: true, audio: false})
    .then(function(stream) {
      video.srcObject = stream;
      video.play();
    })
    .catch(function(err) {
      console.log("An error occurred: " + err);
    });

    video.addEventListener('canplay', function(ev){
      if (!streaming) {
        height = video.videoHeight / (video.videoWidth/width);
      
        // Firefox currently has a bug where the height can't be read from
        // the video, so we will make assumptions if this happens.
      
        if (isNaN(height)) {
          height = width / (4/3);
        }
      
        video.setAttribute('width', width);
        video.setAttribute('height', height);
        canvas.setAttribute('width', width);
        canvas.setAttribute('height', height);
        streaming = true;
      }
    }, false);

    if (startbutton) {
      startbutton.addEventListener('click', function(ev){
        takepicture();
        ev.preventDefault();
      }, false);
    }

    recognizebutton.addEventListener('click', function(ev){
      recognize();
      ev.preventDefault();
    }, false);
    
  }

  // Capture a photo by fetching the current contents of the video
  // and drawing it into a canvas, then converting that to a PNG
  // format data URL. By drawing it on an offscreen canvas and then
  // drawing that to the screen, we can change its size and/or apply
  // other changes before drawing it.
  function sendpicture(data) {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/receive_image", true);
    xhr.setRequestHeader('Content-Type', 'text/plain');
    xhr.send(data);
  }

  function takepicture() {
    var context = canvas.getContext('2d');
    if (width && height) {
      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);
    
      var data = canvas.toDataURL('image/png');
      sendpicture(data);
    }
  }

  function recognizepicture(data) {
      var xhr = new XMLHttpRequest();
      xhr.open("POST", "/recognize", true);

      xhr.onreadystatechange = function() {
          if (xhr.readyState === 4 && xhr.status === 200) {
              var response = JSON.parse(xhr.response);
              var faces = response.faces;
              console.log(faces);

              var names = [];
              var shouldRedirect = false;

              //Go throuhg faces and collect names
              faces.forEach(face => {
                  var confidence = Math.round(face.prob * 100);
                  names.push(face.name + " (" + confidence + "%)");
                  
                  //If there is a match, redirect
                  if (face.prob > 0.7 && face.name !== "unknown") {
                      shouldRedirect = true;
                  }
              });

              if (names.length > 0) {
                  results.innerHTML = names.join(", ");
              } else {
                  results.innerHTML = "Nobody has been detected.";
              }

              if (shouldRedirect) {
                  console.log("Access granted");
                  localStorage.setItem('logged', 'true');
                  setTimeout(function() {
                      window.location.href = "/static/welcome.html";
                  }, 1000); 
              }
          }
      }
        
      xhr.setRequestHeader('Content-Type', 'text/plain');
      xhr.send(data);
  }

  function recognize() {
    var context = canvas.getContext('2d');
    if (width && height) {
      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, 0, 0, width, height);
    
      var data = canvas.toDataURL('image/png');
      recognizepicture(data);
    }
  }


  // Set up our event listener to run the startup process
  // once loading is complete.
  window.addEventListener('load', startup, false);

  // Login with password authentization
  window.authAction = function(endpoint, userField, passField) {
    var user = document.getElementById(userField).value;
    var pass = document.getElementById(passField).value;

    var xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            var response = JSON.parse(xhr.responseText);
            if (xhr.status === 200) {
                alert("Success!");
                localStorage.setItem('logged', 'true');
                if (endpoint === "/login") {
                    window.location.href = "/static/welcome.html";
                }
                if (endpoint === "/register") {
                    document.getElementById(userField).value = "";
                    document.getElementById(passField).value = "";
                }
            } else {
                alert("Error: " + response.message);
            }
        }
    };
    xhr.send(JSON.stringify({username: user, password: pass}));
  }

  window.logout = function() {
    localStorage.removeItem('logged'); 
    window.location.href = "/logout"; 
  };
  if (window.location.pathname.includes("welcome.html")) {
    if (localStorage.getItem('logged') !== 'true') {
        alert("Access denied - unauthorized!");//when trying to access the page directly without the login
        window.location.href = "/";
    }
  }
})();

  