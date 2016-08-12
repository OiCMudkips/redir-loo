var openPopup = function() {
  document.getElementById("add-link-overlay").style.display = "flex";
};

var closePopup = function() {
  document.getElementById("add-link-overlay").style.display = "none";
};

ResponseCodes = {
  SUCCESS: 0,
  BAD_URL: 1,
  DATABASE_ERROR: 2
};

var responseCodeMessage = function(responseCode) {
  switch(responseCode) {
    case ResponseCodes.SUCCESS:
      return 'Success.';
    case ResponseCodes.BAD_URL:
      return 'A bad URL was provided.';
    case ResponseCodes.DATABASE_ERROR:
      return 'A database errror occurred.';
    default:
      return 'Unknown error code.';
  }
};

var processPostedLink = function(responseText) {
  var response = JSON.parse(responseText);
  var table = document.getElementById("links");
  var row = table.insertRow(-1);
  var urlCell = row.insertCell(-1);
  var shortenedCell = row.insertCell(-1);

  if (typeof response.code === "undefined" || response.code !== ResponseCodes.SUCCESS) {
    urlCell.innerHTML = 'Error';
    shortenedCell.innerHTML = responseCodeMessage(response.code);
  }
  else {
    var urlLink = document.createElement('a');
    urlLink.href = response.url;
    urlLink.innerHTML = response.url;
    urlCell.appendChild(urlLink);

    var shortenedLink = document.createElement('a');
    shortenedLink.href = 'http://localhost/l/' + response.shortened;
    shortenedLink.innerHTML = 'http://localhost/l/' + response.shortened;
    shortenedCell.appendChild(shortenedLink);
  }

  closePopup();
};

var postLink = function(url) {
  var request = new XMLHttpRequest();
  var url = document.getElementById("url").value;

  request.open("POST", "/create-link", true);
  request.onreadystatechange = function() {
    if (request.readyState === XMLHttpRequest.DONE && request.status === 200) {
      processPostedLink(request.responseText);
    }
  }

  request.setRequestHeader("Content-type", "application/json");
  request.send(JSON.stringify({ url: url }));

  document.getElementById("url").value = "";
};